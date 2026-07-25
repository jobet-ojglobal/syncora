import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  Prisma,
  InventoryTransactionType,
  InventoryReferenceType,
} from "@/generated/prisma/client";

/**
 * 🟡 STATE ENGINE MODIFICATIONS & LEDGER ADJUSTMENTS
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      status: targetStatus,
      remarks,
      teamMemberId = "cc920c31-bcb2-4264-9946-4b7693c9c7e0",
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Missing transfer order reference id token." },
        { status: 400 }
      );
    }

    // Acquire current state under exclusive lookup parameters
    const currentOrder = await prisma.transferOrder.findUnique({
      where: { id },
      include: { lines: true },
    });

    if (!currentOrder) {
      return NextResponse.json(
        { error: "Target transfer order manifest was not found." },
        { status: 404 }
      );
    }

    const oldStatus = currentOrder.status;

    // Guard Constraint: Block changes to terminal conditions
    if (oldStatus === "RECEIVED" || oldStatus === "CANCELLED") {
      return NextResponse.json(
        {
          error:
            "Locked Manifest: Completed or voided shipments cannot be modified.",
        },
        { status: 422 }
      );
    }

    // Short circuit if only modifying text fields without shifting state positions
    if (oldStatus === targetStatus) {
      const updatedRemarks = await prisma.transferOrder.update({
        where: { id },
        data: { remarks },
      });
      return NextResponse.json(updatedRemarks, { status: 200 });
    }

    // EMPTY MANIFEST GUARD: Prevent processing orders with 0 lines unless cancelling
    if (currentOrder.lines.length === 0 && targetStatus !== "CANCELLED") {
      return NextResponse.json(
        {
          error:
            "Invalid Action: Cannot process or submit a stock transfer manifest with 0 line items.",
        },
        { status: 422 }
      );
    }

    // Execute state adjustments transaction
    const processingResult = await prisma.$transaction(async (tx) => {
      // ✅ SCENARIO: SUBMIT FOR APPROVAL (DRAFT -> PENDING)
      if (targetStatus === "PENDING" && oldStatus === "DRAFT") {
        return await tx.transferOrder.update({
          where: { id },
          data: { status: "PENDING", remarks },
        });
      }

      // SCENARIO 1: DISPATCH CARGO (DRAFT/PENDING -> IN_TRANSIT)
      if (
        targetStatus === "IN_TRANSIT" &&
        (oldStatus === "DRAFT" || oldStatus === "PENDING")
      ) {
        for (const line of currentOrder.lines) {
          const qty = new Prisma.Decimal(line.quantity);

          // A: Decrement stock from master location profile entry
          const sourceInv = await tx.inventory.findUnique({
            where: {
              productId_locationId: {
                productId: line.productId,
                locationId: currentOrder.sourceLocationId,
              },
            },
          });

          const currentQty = sourceInv
            ? new Prisma.Decimal(sourceInv.quantityAvailable || 0)
            : new Prisma.Decimal(0);

          if (!sourceInv || currentQty.lessThan(qty)) {
            throw new Error(
              `Insufficient Stock: Missing items for SKU reference ${line.productId} at origin site.`
            );
          }

          const beforeQty = new Prisma.Decimal(sourceInv.quantityOnHand || 0);
          const afterQty = beforeQty.minus(qty);

          await tx.inventory.update({
            where: { id: sourceInv.id },
            data: {
              quantityOnHand: { decrement: qty },
              quantityAvailable: { decrement: qty },
            },
          });

          // B: Decrement stock from specific source inventory bin node if mapped
          if (line.sourceSublocationId) {
            const sourceBin = await tx.inventoryBin.findFirst({
              where: {
                inventoryId: sourceInv.id,
                sublocationId: line.sourceSublocationId,
              },
            });

            if (
              !sourceBin ||
              new Prisma.Decimal(sourceBin.quantity).lessThan(qty)
            ) {
              throw new Error(
                `Insufficient Sublocation Volume inside selected source bin node.`
              );
            }

            await tx.inventoryBin.update({
              where: { id: sourceBin.id },
              data: { quantity: { decrement: qty } },
            });
          }

          // C: Ledger Entry (TRANSFER_OUT)
          await tx.inventoryLedger.create({
            data: {
              productId: line.productId,
              locationId: currentOrder.sourceLocationId,
              sublocationId: line.sourceSublocationId || null,
              transactionType: InventoryTransactionType.TRANSFER_OUT,
              referenceType: InventoryReferenceType.TRANSFER_ORDER,
              referenceId: currentOrder.id,
              performedById: teamMemberId || null,
              remarks:
                remarks ||
                `Stock transfer outbound to ${currentOrder.targetLocationId}`,
              quantityChange: qty.negated(),
              quantityBefore: beforeQty,
              quantityAfter: afterQty,
            },
          });
        }

        return await tx.transferOrder.update({
          where: { id },
          data: { status: "IN_TRANSIT", remarks, transferredAt: new Date() },
        });
      }

      // SCENARIO 2: ARRIVAL RECEIPTS SUCCESS (IN_TRANSIT -> RECEIVED)
      if (targetStatus === "RECEIVED" && oldStatus === "IN_TRANSIT") {
        for (const line of currentOrder.lines) {
          const qty = new Prisma.Decimal(line.quantity);

          // A: Upsert Master Inventory root node target location layout block
          let targetInv = await tx.inventory.findUnique({
            where: {
              productId_locationId: {
                productId: line.productId,
                locationId: currentOrder.targetLocationId,
              },
            },
          });

          let beforeQty = new Prisma.Decimal(0);
          let afterQty = qty;

          if (!targetInv) {
            targetInv = await tx.inventory.create({
              data: {
                productId: line.productId,
                locationId: currentOrder.targetLocationId,
                quantityOnHand: qty,
                quantityAvailable: qty,
                quantityReserved: 0,
              },
            });
          } else {
            beforeQty = new Prisma.Decimal(targetInv.quantityOnHand || 0);
            afterQty = beforeQty.plus(qty);

            await tx.inventory.update({
              where: { id: targetInv.id },
              data: {
                quantityOnHand: { increment: qty },
                quantityAvailable: { increment: qty },
              },
            });
          }

          // B: Upsert targeted Sublocation inner bin tracking rows
          if (line.targetSublocationId) {
            const targetBin = await tx.inventoryBin.findFirst({
              where: {
                inventoryId: targetInv.id,
                sublocationId: line.targetSublocationId,
              },
            });

            if (!targetBin) {
              await tx.inventoryBin.create({
                data: {
                  inventoryId: targetInv.id,
                  sublocationId: line.targetSublocationId,
                  quantity: qty,
                },
              });
            } else {
              await tx.inventoryBin.update({
                where: { id: targetBin.id },
                data: { quantity: { increment: qty } },
              });
            }
          }

          // C: Ledger Entry (TRANSFER_IN)
          await tx.inventoryLedger.create({
            data: {
              productId: line.productId,
              locationId: currentOrder.targetLocationId,
              sublocationId: line.targetSublocationId || null,
              transactionType: InventoryTransactionType.TRANSFER_IN,
              referenceType: InventoryReferenceType.TRANSFER_ORDER,
              referenceId: currentOrder.id,
              performedById: teamMemberId || null,
              remarks:
                remarks ||
                `Stock transfer inbound from ${currentOrder.sourceLocationId}`,
              quantityChange: qty,
              quantityBefore: beforeQty,
              quantityAfter: afterQty,
            },
          });
        }

        return await tx.transferOrder.update({
          where: { id },
          data: { status: "RECEIVED", remarks, receivedAt: new Date() },
        });
      }

      // SCENARIO 3: SHIPPED CANCELLATION REVERSION (IN_TRANSIT -> CANCELLED)
      if (targetStatus === "CANCELLED" && oldStatus === "IN_TRANSIT") {
        for (const line of currentOrder.lines) {
          const qty = new Prisma.Decimal(line.quantity);

          // Find current stock at origin site before returning stock
          const sourceInv = await tx.inventory.findUnique({
            where: {
              productId_locationId: {
                productId: line.productId,
                locationId: currentOrder.sourceLocationId,
              },
            },
          });

          const beforeQty = sourceInv
            ? new Prisma.Decimal(sourceInv.quantityOnHand || 0)
            : new Prisma.Decimal(0);
          const afterQty = beforeQty.plus(qty);

          // Return stock into master location inventory profile
          await tx.inventory.update({
            where: {
              productId_locationId: {
                productId: line.productId,
                locationId: currentOrder.sourceLocationId,
              },
            },
            data: {
              quantityOnHand: { increment: qty },
              quantityAvailable: { increment: qty },
            },
          });

          // Return stock into explicit source sublocation bin mapping node
          if (line.sourceSublocationId && sourceInv) {
            const sourceBin = await tx.inventoryBin.findFirst({
              where: {
                inventoryId: sourceInv.id,
                sublocationId: line.sourceSublocationId,
              },
            });

            if (sourceBin) {
              await tx.inventoryBin.update({
                where: { id: sourceBin.id },
                data: { quantity: { increment: qty } },
              });
            }
          }

          // Ledger Entry (Reversal / Adjustment for Cancelled Transfer)
          await tx.inventoryLedger.create({
            data: {
              productId: line.productId,
              locationId: currentOrder.sourceLocationId,
              sublocationId: line.sourceSublocationId || null,
              transactionType: InventoryTransactionType.TRANSFER_IN,
              referenceType: InventoryReferenceType.TRANSFER_ORDER,
              referenceId: currentOrder.id,
              performedById: teamMemberId || null,
              remarks:
                remarks ||
                `Reversion: Transfer order cancelled during transit`,
              quantityChange: qty,
              quantityBefore: beforeQty,
              quantityAfter: afterQty,
            },
          });
        }

        return await tx.transferOrder.update({
          where: { id },
          data: { status: "CANCELLED", remarks },
        });
      }

      // SCENARIO 4: STANDARD FALLBACK FOR EARLY STAGE VOIDS (DRAFT/PENDING -> CANCELLED)
      if (
        targetStatus === "CANCELLED" &&
        (oldStatus === "DRAFT" || oldStatus === "PENDING")
      ) {
        return await tx.transferOrder.update({
          where: { id },
          data: { status: "CANCELLED", remarks },
        });
      }

      throw new Error(
        `Invalid state movement exception pathway from ${oldStatus} to ${targetStatus}`
      );
    });

    return NextResponse.json(processingResult, { status: 200 });
  } catch (error: any) {
    console.error("State Processing Transaction Exception:", error);
    return NextResponse.json(
      {
        error:
          error.message || "State processing pipeline breakdown encountered.",
      },
      { status: 500 }
    );
  }
}



// import { NextRequest, NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";
// import { Prisma } from "@/generated/prisma/client";

// /**
//  * 🟡 STATE ENGINE MODIFICATIONS & LEDGER ADJUSTMENTS
//  */
// export async function PATCH(request: NextRequest) {
//   try {
//     const body = await request.json();
//     const { id, status: targetStatus, remarks } = body;

//     if (!id) return NextResponse.json({ error: "Missing transfer order reference id token." }, { status: 400 });

//     // Acquire current state under exclusive lookup parameters
//     const currentOrder = await prisma.transferOrder.findUnique({
//       where: { id },
//       include: { lines: true }
//     });

//     if (!currentOrder) return NextResponse.json({ error: "Target transfer order manifest was not found." }, { status: 404 });
    
//     const oldStatus = currentOrder.status;

//     // Guard Constraint: Block changes to terminal conditions
//     if (oldStatus === "RECEIVED" || oldStatus === "CANCELLED") {
//       return NextResponse.json({ error: "Locked Manifest: Completed or voided shipments cannot be modified." }, { status: 422 });
//     }

//     // Short circuit if only modifying text fields without shifting state positions
//     if (oldStatus === targetStatus) {
//       const updatedRemarks = await prisma.transferOrder.update({
//         where: { id },
//         data: { remarks }
//       });
//       return NextResponse.json(updatedRemarks, { status: 200 });
//     }

//     // EMPTY MANIFEST GUARD: Prevent processing orders with 0 lines unless cancelling
//     if (currentOrder.lines.length === 0 && targetStatus !== "CANCELLED") {
//       return NextResponse.json(
//         { error: "Invalid Action: Cannot process or submit a stock transfer manifest with 0 line items." }, 
//         { status: 422 }
//       );
//     }

//     // Execute state adjustments transaction
//     const processingResult = await prisma.$transaction(async (tx) => {

//       // ✅ NEW SCENARIO: SUBMIT FOR APPROVAL (DRAFT -> PENDING)
//       // Pure workflow state transition. No physical stock allocations change yet.
//       if (targetStatus === "PENDING" && oldStatus === "DRAFT") {
//         return await tx.transferOrder.update({
//           where: { id },
//           data: { status: "PENDING", remarks }
//         });
//       }

//       // SCENARIO 1: DISPATCH CARGO (DRAFT/PENDING -> IN_TRANSIT)
//       if (targetStatus === "IN_TRANSIT" && (oldStatus === "DRAFT" || oldStatus === "PENDING")) {
//         for (const line of currentOrder.lines) {
//           const qty = new Prisma.Decimal(line.quantity);

//           // A: Decrement stock from master location profile entry
//           const sourceInv = await tx.inventory.findUnique({
//             where: { productId_locationId: { productId: line.productId, locationId: currentOrder.sourceLocationId } }
//           });

//           if (!sourceInv || new Prisma.Decimal(sourceInv.quantityAvailable || 0).lessThan(qty)) {
//             throw new Error(`Insufficient Stock: Missing items for SKU reference ${line.productId} at origin site.`);
//           }

//           await tx.inventory.update({
//             where: { id: sourceInv.id },
//             data: {
//               quantityOnHand: { decrement: qty },
//               quantityAvailable: { decrement: qty }
//             }
//           });

//           // B: Decrement stock from specific source inventory bin node if mapped
//           if (line.sourceSublocationId) {
//             const sourceBin = await tx.inventoryBin.findFirst({
//               where: { 
//                 productId: line.productId, 
//                 sublocationId: line.sourceSublocationId, // Safe: matches schema schema ID mapping
//                 inventoryId: sourceInv.id
//               }
//             });

//             if (!sourceBin || new Prisma.Decimal(sourceBin.quantity).lessThan(qty)) {
//               throw new Error(`Insufficient Sublocation Volume inside selected source bin node.`);
//             }

//             await tx.inventoryBin.update({
//               where: { id: sourceBin.id },
//               data: { quantity: { decrement: qty } }
//             });
//           }
//         }

//         return await tx.transferOrder.update({
//           where: { id },
//           data: { status: "IN_TRANSIT", remarks, transferredAt: new Date() }
//         });
//       }

//       // SCENARIO 2: ARRIVAL RECEIPTS SUCCESS (IN_TRANSIT -> RECEIVED)
//       if (targetStatus === "RECEIVED" && oldStatus === "IN_TRANSIT") {
//         for (const line of currentOrder.lines) {
//           const qty = new Prisma.Decimal(line.quantity);

//           // A: Upsert Master Inventory root node target location layout block
//           let targetInv = await tx.inventory.findUnique({
//             where: { productId_locationId: { productId: line.productId, locationId: currentOrder.targetLocationId } }
//           });

//           if (!targetInv) {
//             targetInv = await tx.inventory.create({
//               data: {
//                 productId: line.productId,
//                 locationId: currentOrder.targetLocationId,
//                 quantityOnHand: qty,
//                 quantityAvailable: qty,
//                 quantityReserved: 0
//               }
//             });
//           } else {
//             await tx.inventory.update({
//               where: { id: targetInv.id },
//               data: {
//                 quantityOnHand: { increment: qty },
//                 quantityAvailable: { increment: qty }
//               }
//             });
//           }

//           // B: Upsert targeted Sublocation inner bin tracking rows
//           if (line.targetSublocationId) {
//             const targetBin = await tx.inventoryBin.findFirst({
//               where: {
//                 inventoryId: targetInv.id,
//                 productId: line.productId,
//                 sublocationId: line.targetSublocationId
//               }
//             });

//             if (!targetBin) {
//               await tx.inventoryBin.create({
//                 data: {
//                   inventoryId: targetInv.id,
//                   productId: line.productId,
//                   sublocationId: line.targetSublocationId,
//                   quantity: qty
//                 }
//               });
//             } else {
//               await tx.inventoryBin.update({
//                 where: { id: targetBin.id },
//                 data: { quantity: { increment: qty } }
//               });
//             }
//           }
//         }

//         return await tx.transferOrder.update({
//           where: { id },
//           data: { status: "RECEIVED", remarks, receivedAt: new Date() }
//         });
//       }

//       // SCENARIO 3: SHIPPED CANCELLATION REVERSION (IN_TRANSIT -> CANCELLED)
//       if (targetStatus === "CANCELLED" && oldStatus === "IN_TRANSIT") {
//         for (const line of currentOrder.lines) {
//           const qty = new Prisma.Decimal(line.quantity);

//           // Return stock into master location inventory profile
//           await tx.inventory.update({
//             where: { productId_locationId: { productId: line.productId, locationId: currentOrder.sourceLocationId } },
//             data: {
//               quantityOnHand: { increment: qty },
//               quantityAvailable: { increment: qty }
//             }
//           });

//           // Return stock into explicit source sublocation bin mapping node
//           if (line.sourceSublocationId) {
//             const matchingInvRoot = await tx.inventory.findUnique({
//               where: { productId_locationId: { productId: line.productId, locationId: currentOrder.sourceLocationId } }
//             });

//             const sourceBin = await tx.inventoryBin.findFirst({
//               where: {
//                 inventoryId: matchingInvRoot?.id,
//                 productId: line.productId,
//                 sublocationId: line.sourceSublocationId
//               }
//             });

//             if (sourceBin) {
//               await tx.inventoryBin.update({
//                 where: { id: sourceBin.id },
//                 data: { quantity: { increment: qty } }
//               });
//             }
//           }
//         }

//         return await tx.transferOrder.update({
//           where: { id },
//           data: { status: "CANCELLED", remarks }
//         });
//       }

//       // SCENARIO 4: STANDARD FALLBACK FOR EARLY STAGE VOIDS (DRAFT/PENDING -> CANCELLED)
//       if (targetStatus === "CANCELLED" && (oldStatus === "DRAFT" || oldStatus === "PENDING")) {
//         return await tx.transferOrder.update({
//           where: { id },
//           data: { status: "CANCELLED", remarks }
//         });
//       }

//       throw new Error(`Invalid state movement exception pathway from ${oldStatus} to ${targetStatus}`);
//     });

//     return NextResponse.json(processingResult, { status: 200 });
//   } catch (error: any) {
//     console.error("State Processing Transaction Exception:", error);
//     return NextResponse.json({ error: error.message || "State processing pipeline breakdown encountered." }, { status: 500 });
//   }
// }