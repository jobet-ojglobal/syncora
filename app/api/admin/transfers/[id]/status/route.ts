import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import {
  TransferOrderStatus,
  InventoryTransactionType,
  InventoryReferenceType,
} from "@/generated/prisma/client";

// Input validation schema for status transitions
const statusChangeSchema = z.object({
  status: z.enum(["PENDING", "IN_TRANSIT", "RECEIVED", "CANCELLED"]),
  // Optional payload when receiving partial/full line quantities
  receivedLines: z
    .array(
      z.object({
        lineId: z.string(),
        quantityReceived: z.number().min(0),
        targetSublocationId: z.string().optional().nullable(),
      })
    )
    .optional(),
  remarks: z.string().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Transfer tracking identification parameter is required." },
        { status: 400 }
      );
    }

    const validationResult = statusChangeSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid status transition payload", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { status: targetStatus, receivedLines, remarks } = validationResult.data;

    // TODO: Retrieve actual user ID from session context
    const currentUserId = "cc920c31-bcb2-4264-9946-4b7693c9c7e0";

    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch current transfer order state with line items
      const existing = await tx.transferOrder.findUnique({
        where: { id },
        include: { lines: true },
      });

      if (!existing) {
        throw new Error("Transfer Order not found.");
      }

      const currentStatus = existing.status;

      // Prevent redundant status update
      if (currentStatus === targetStatus) {
        throw new Error(`Transfer Order is already in ${targetStatus} status.`);
      }

      // Prevent edits on finished orders
      if (currentStatus === "RECEIVED" || currentStatus === "CANCELLED") {
        throw new Error(`Cannot transition a Transfer Order that is already ${currentStatus}.`);
      }

      // =========================================================================
      // STATE TRANSITION 1: DRAFT / PENDING -> IN_TRANSIT (Transfer Out Departure)
      // =========================================================================
      if (targetStatus === "IN_TRANSIT") {
        if (currentStatus !== "DRAFT" && currentStatus !== "PENDING") {
          throw new Error(`Cannot transition to IN_TRANSIT from ${currentStatus}.`);
        }

        for (const line of existing.lines) {
          const qtyToTransfer = Number(line.quantity);

          // Find or fail source inventory record
          const sourceInv = await tx.inventory.findUnique({
            where: {
              productId_locationId: {
                productId: line.productId,
                locationId: existing.sourceLocationId,
              },
            },
          });

          const beforeOnHand = sourceInv?.quantityOnHand?.toNumber() ?? 0;
          const beforeAvail = sourceInv?.quantityAvailable?.toNumber() ?? 0;

          if (!sourceInv || beforeOnHand < qtyToTransfer) {
            throw new Error(
              `Insufficient stock for product ${line.productId} at source location. Available: ${beforeOnHand}, Required: ${qtyToTransfer}`
            );
          }

          const afterOnHand = beforeOnHand - qtyToTransfer;
          const afterAvail = beforeAvail - qtyToTransfer;

          // Deduct quantity from Source Inventory
          await tx.inventory.update({
            where: { id: sourceInv.id },
            data: {
              quantityOnHand: afterOnHand,
              quantityAvailable: afterAvail,
              lastMovementAt: new Date(),
            },
          });

          // Deduct stock from specific Source Sublocation / Bin if assigned
          if (line.sourceSublocationId) {
            await tx.inventoryBin.updateMany({
              where: {
                inventoryId: sourceInv.id,
                sublocationId: line.sourceSublocationId,
              },
              data: {
                quantity: { decrement: qtyToTransfer },
              },
            });
          }

          // Create TRANSFER_OUT ledger transaction record
          await tx.inventoryLedger.create({
            data: {
              productId: line.productId,
              locationId: existing.sourceLocationId,
              sublocationId: line.sourceSublocationId,
              transactionType: InventoryTransactionType.TRANSFER_OUT,
              referenceType: InventoryReferenceType.TRANSFER_ORDER,
              referenceId: id,
              performedById: currentUserId,
              quantityChange: -qtyToTransfer,
              quantityBefore: beforeOnHand,
              quantityAfter: afterOnHand,
              remarks: remarks || `Dispatched to Location ${existing.targetLocationId}`,
            },
          });
        }

        // Update Transfer Order Header
        return await tx.transferOrder.update({
          where: { id },
          data: {
            status: "IN_TRANSIT",
            transferredAt: new Date(),
            approvedById: currentUserId,
            ...(remarks ? { remarks } : {}),
          },
        });
      }

      // =========================================================================
      // STATE TRANSITION 2: IN_TRANSIT -> RECEIVED (Transfer In Arrival)
      // =========================================================================
      if (targetStatus === "RECEIVED") {
        if (currentStatus !== "IN_TRANSIT") {
          throw new Error(`Transfer Order must be IN_TRANSIT before it can be RECEIVED.`);
        }

        for (const line of existing.lines) {
          // Check if explicit arrival quantity was supplied per line, else default to line quantity
          const lineUpdatePayload = receivedLines?.find((rl) => rl.lineId === line.id);
          const qtyReceived = lineUpdatePayload?.quantityReceived ?? Number(line.quantity);
          const targetSublocId = lineUpdatePayload?.targetSublocationId || line.targetSublocationId;

          // Update received quantity on the line record
          await tx.transferOrderLine.update({
            where: { id: line.id },
            data: {
              quantityReceived: qtyReceived,
              ...(targetSublocId ? { targetSublocationId: targetSublocId } : {}),
            },
          });

          if (qtyReceived > 0) {
            // Upsert Target Inventory Record
            const targetInv = await tx.inventory.upsert({
              where: {
                productId_locationId: {
                  productId: line.productId,
                  locationId: existing.targetLocationId,
                },
              },
              create: {
                productId: line.productId,
                locationId: existing.targetLocationId,
                quantityOnHand: qtyReceived,
                quantityAvailable: qtyReceived,
                lastMovementAt: new Date(),
              },
              update: {
                quantityOnHand: { increment: qtyReceived },
                quantityAvailable: { increment: qtyReceived },
                lastMovementAt: new Date(),
              },
            });

            const currentQty = Number(targetInv.quantityOnHand);
            const beforeOnHand = currentQty - qtyReceived;

            // Increment Target Sublocation Bin if specified
            if (targetSublocId) {
              await tx.inventoryBin.upsert({
                where: {
                  inventoryId_sublocationId: {
                    inventoryId: targetInv.id,
                    sublocationId: targetSublocId,
                  },
                },
                create: {
                  inventoryId: targetInv.id,
                  sublocationId: targetSublocId,
                  quantity: qtyReceived,
                },
                update: {
                  quantity: { increment: qtyReceived },
                },
              });
            }

            // Create TRANSFER_IN ledger transaction record
            await tx.inventoryLedger.create({
              data: {
                productId: line.productId,
                locationId: existing.targetLocationId,
                sublocationId: targetSublocId,
                transactionType: InventoryTransactionType.TRANSFER_IN,
                referenceType: InventoryReferenceType.TRANSFER_ORDER,
                referenceId: id,
                performedById: currentUserId,
                quantityChange: qtyReceived,
                quantityBefore: beforeOnHand,
                quantityAfter: currentQty,
                remarks: remarks || `Received from Location ${existing.sourceLocationId}`,
              },
            });
          }
        }

        // Update Transfer Order Header
        return await tx.transferOrder.update({
          where: { id },
          data: {
            status: "RECEIVED",
            receivedAt: new Date(),
            receivedById: currentUserId,
            ...(remarks ? { remarks } : {}),
          },
        });
      }

      // =========================================================================
      // STATE TRANSITION 3: ANY -> CANCELLED (Rollback stock if already IN_TRANSIT)
      // =========================================================================
      if (targetStatus === "CANCELLED") {
        // If transitioning from IN_TRANSIT, return deducted stock back to Source
        if (currentStatus === "IN_TRANSIT") {
          for (const line of existing.lines) {
            const qtyToReturn = Number(line.quantity);

            const sourceInv = await tx.inventory.findUnique({
              where: {
                productId_locationId: {
                  productId: line.productId,
                  locationId: existing.sourceLocationId,
                },
              },
            });

            if (sourceInv) {
              const beforeOnHand = Number(sourceInv.quantityOnHand);
              const afterOnHand = beforeOnHand + qtyToReturn;

              // Restore inventory quantities
              await tx.inventory.update({
                where: { id: sourceInv.id },
                data: {
                  quantityOnHand: afterOnHand,
                  quantityAvailable: Number(sourceInv.quantityAvailable ?? 0) + qtyToReturn,
                  lastMovementAt: new Date(),
                },
              });

              // Restore Bin quantities
              if (line.sourceSublocationId) {
                await tx.inventoryBin.updateMany({
                  where: {
                    inventoryId: sourceInv.id,
                    sublocationId: line.sourceSublocationId,
                  },
                  data: {
                    quantity: { increment: qtyToReturn },
                  },
                });
              }

              // Record reversal Ledger Entry
              await tx.inventoryLedger.create({
                data: {
                  productId: line.productId,
                  locationId: existing.sourceLocationId,
                  sublocationId: line.sourceSublocationId,
                  transactionType: InventoryTransactionType.ADJUSTMENT,
                  referenceType: InventoryReferenceType.TRANSFER_ORDER,
                  referenceId: id,
                  performedById: currentUserId,
                  quantityChange: qtyToReturn,
                  quantityBefore: beforeOnHand,
                  quantityAfter: afterOnHand,
                  remarks: `Transfer Order ${existing.transferNumber} Cancelled - Stock Restored`,
                },
              });
            }
          }
        }

        return await tx.transferOrder.update({
          where: { id },
          data: {
            status: "CANCELLED",
            ...(remarks ? { remarks } : {}),
          },
        });
      }

      // Fallback for draft/pending status changes without stock movements
      return await tx.transferOrder.update({
        where: { id },
        data: {
          status: targetStatus as TransferOrderStatus,
          ...(remarks ? { remarks } : {}),
        },
      });
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("[TRANSFER_ORDER_STATUS_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to process status change." },
      { status: 500 }
    );
  }
}

// import { NextRequest, NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";
// import {
//   Prisma,
//   InventoryTransactionType,
//   InventoryReferenceType,
// } from "@/generated/prisma/client";

// /**
//  * 🟡 STATE ENGINE MODIFICATIONS & LEDGER ADJUSTMENTS
//  */
// export async function PATCH(request: NextRequest) {
//   try {
//     const body = await request.json();
//     const {
//       id,
//       status: targetStatus,
//       remarks,
//       teamMemberId = "cc920c31-bcb2-4264-9946-4b7693c9c7e0",
//     } = body;

//     if (!id) {
//       return NextResponse.json(
//         { error: "Missing transfer order reference id token." },
//         { status: 400 }
//       );
//     }

//     // Acquire current state under exclusive lookup parameters
//     const currentOrder = await prisma.transferOrder.findUnique({
//       where: { id },
//       include: { lines: true },
//     });

//     if (!currentOrder) {
//       return NextResponse.json(
//         { error: "Target transfer order manifest was not found." },
//         { status: 404 }
//       );
//     }

//     const oldStatus = currentOrder.status;

//     // Guard Constraint: Block changes to terminal conditions
//     if (oldStatus === "RECEIVED" || oldStatus === "CANCELLED") {
//       return NextResponse.json(
//         {
//           error:
//             "Locked Manifest: Completed or voided shipments cannot be modified.",
//         },
//         { status: 422 }
//       );
//     }

//     // Short circuit if only modifying text fields without shifting state positions
//     if (oldStatus === targetStatus) {
//       const updatedRemarks = await prisma.transferOrder.update({
//         where: { id },
//         data: { remarks },
//       });
//       return NextResponse.json(updatedRemarks, { status: 200 });
//     }

//     // EMPTY MANIFEST GUARD: Prevent processing orders with 0 lines unless cancelling
//     if (currentOrder.lines.length === 0 && targetStatus !== "CANCELLED") {
//       return NextResponse.json(
//         {
//           error:
//             "Invalid Action: Cannot process or submit a stock transfer manifest with 0 line items.",
//         },
//         { status: 422 }
//       );
//     }

//     // Execute state adjustments transaction
//     const processingResult = await prisma.$transaction(async (tx) => {
//       // ✅ SCENARIO: SUBMIT FOR APPROVAL (DRAFT -> PENDING)
//       if (targetStatus === "PENDING" && oldStatus === "DRAFT") {
//         return await tx.transferOrder.update({
//           where: { id },
//           data: { status: "PENDING", remarks },
//         });
//       }

//       // SCENARIO 1: DISPATCH CARGO (DRAFT/PENDING -> IN_TRANSIT)
//       if (
//         targetStatus === "IN_TRANSIT" &&
//         (oldStatus === "DRAFT" || oldStatus === "PENDING")
//       ) {
//         for (const line of currentOrder.lines) {
//           const qty = new Prisma.Decimal(line.quantity);

//           // A: Decrement stock from master location profile entry
//           const sourceInv = await tx.inventory.findUnique({
//             where: {
//               productId_locationId: {
//                 productId: line.productId,
//                 locationId: currentOrder.sourceLocationId,
//               },
//             },
//           });

//           const currentQty = sourceInv
//             ? new Prisma.Decimal(sourceInv.quantityAvailable || 0)
//             : new Prisma.Decimal(0);

//           if (!sourceInv || currentQty.lessThan(qty)) {
//             throw new Error(
//               `Insufficient Stock: Missing items for SKU reference ${line.productId} at origin site.`
//             );
//           }

//           const beforeQty = new Prisma.Decimal(sourceInv.quantityOnHand || 0);
//           const afterQty = beforeQty.minus(qty);

//           await tx.inventory.update({
//             where: { id: sourceInv.id },
//             data: {
//               quantityOnHand: { decrement: qty },
//               quantityAvailable: { decrement: qty },
//             },
//           });

//           // B: Decrement stock from specific source inventory bin node if mapped
//           if (line.sourceSublocationId) {
//             const sourceBin = await tx.inventoryBin.findFirst({
//               where: {
//                 inventoryId: sourceInv.id,
//                 sublocationId: line.sourceSublocationId,
//               },
//             });

//             if (
//               !sourceBin ||
//               new Prisma.Decimal(sourceBin.quantity).lessThan(qty)
//             ) {
//               throw new Error(
//                 `Insufficient Sublocation Volume inside selected source bin node.`
//               );
//             }

//             await tx.inventoryBin.update({
//               where: { id: sourceBin.id },
//               data: { quantity: { decrement: qty } },
//             });
//           }

//           // C: Ledger Entry (TRANSFER_OUT)
//           await tx.inventoryLedger.create({
//             data: {
//               productId: line.productId,
//               locationId: currentOrder.sourceLocationId,
//               sublocationId: line.sourceSublocationId || null,
//               transactionType: InventoryTransactionType.TRANSFER_OUT,
//               referenceType: InventoryReferenceType.TRANSFER_ORDER,
//               referenceId: currentOrder.id,
//               performedById: teamMemberId || null,
//               remarks:
//                 remarks ||
//                 `Stock transfer outbound to ${currentOrder.targetLocationId}`,
//               quantityChange: qty.negated(),
//               quantityBefore: beforeQty,
//               quantityAfter: afterQty,
//             },
//           });
//         }

//         return await tx.transferOrder.update({
//           where: { id },
//           data: { status: "IN_TRANSIT", remarks, transferredAt: new Date() },
//         });
//       }

//       // SCENARIO 2: ARRIVAL RECEIPTS SUCCESS (IN_TRANSIT -> RECEIVED)
//       if (targetStatus === "RECEIVED" && oldStatus === "IN_TRANSIT") {
//         for (const line of currentOrder.lines) {
//           const qty = new Prisma.Decimal(line.quantity);

//           // A: Upsert Master Inventory root node target location layout block
//           let targetInv = await tx.inventory.findUnique({
//             where: {
//               productId_locationId: {
//                 productId: line.productId,
//                 locationId: currentOrder.targetLocationId,
//               },
//             },
//           });

//           let beforeQty = new Prisma.Decimal(0);
//           let afterQty = qty;

//           if (!targetInv) {
//             targetInv = await tx.inventory.create({
//               data: {
//                 productId: line.productId,
//                 locationId: currentOrder.targetLocationId,
//                 quantityOnHand: qty,
//                 quantityAvailable: qty,
//                 quantityReserved: 0,
//               },
//             });
//           } else {
//             beforeQty = new Prisma.Decimal(targetInv.quantityOnHand || 0);
//             afterQty = beforeQty.plus(qty);

//             await tx.inventory.update({
//               where: { id: targetInv.id },
//               data: {
//                 quantityOnHand: { increment: qty },
//                 quantityAvailable: { increment: qty },
//               },
//             });
//           }

//           // B: Upsert targeted Sublocation inner bin tracking rows
//           if (line.targetSublocationId) {
//             const targetBin = await tx.inventoryBin.findFirst({
//               where: {
//                 inventoryId: targetInv.id,
//                 sublocationId: line.targetSublocationId,
//               },
//             });

//             if (!targetBin) {
//               await tx.inventoryBin.create({
//                 data: {
//                   inventoryId: targetInv.id,
//                   sublocationId: line.targetSublocationId,
//                   quantity: qty,
//                 },
//               });
//             } else {
//               await tx.inventoryBin.update({
//                 where: { id: targetBin.id },
//                 data: { quantity: { increment: qty } },
//               });
//             }
//           }

//           // C: Ledger Entry (TRANSFER_IN)
//           await tx.inventoryLedger.create({
//             data: {
//               productId: line.productId,
//               locationId: currentOrder.targetLocationId,
//               sublocationId: line.targetSublocationId || null,
//               transactionType: InventoryTransactionType.TRANSFER_IN,
//               referenceType: InventoryReferenceType.TRANSFER_ORDER,
//               referenceId: currentOrder.id,
//               performedById: teamMemberId || null,
//               remarks:
//                 remarks ||
//                 `Stock transfer inbound from ${currentOrder.sourceLocationId}`,
//               quantityChange: qty,
//               quantityBefore: beforeQty,
//               quantityAfter: afterQty,
//             },
//           });
//         }

//         return await tx.transferOrder.update({
//           where: { id },
//           data: { status: "RECEIVED", remarks, receivedAt: new Date() },
//         });
//       }

//       // SCENARIO 3: SHIPPED CANCELLATION REVERSION (IN_TRANSIT -> CANCELLED)
//       if (targetStatus === "CANCELLED" && oldStatus === "IN_TRANSIT") {
//         for (const line of currentOrder.lines) {
//           const qty = new Prisma.Decimal(line.quantity);

//           // Find current stock at origin site before returning stock
//           const sourceInv = await tx.inventory.findUnique({
//             where: {
//               productId_locationId: {
//                 productId: line.productId,
//                 locationId: currentOrder.sourceLocationId,
//               },
//             },
//           });

//           const beforeQty = sourceInv
//             ? new Prisma.Decimal(sourceInv.quantityOnHand || 0)
//             : new Prisma.Decimal(0);
//           const afterQty = beforeQty.plus(qty);

//           // Return stock into master location inventory profile
//           await tx.inventory.update({
//             where: {
//               productId_locationId: {
//                 productId: line.productId,
//                 locationId: currentOrder.sourceLocationId,
//               },
//             },
//             data: {
//               quantityOnHand: { increment: qty },
//               quantityAvailable: { increment: qty },
//             },
//           });

//           // Return stock into explicit source sublocation bin mapping node
//           if (line.sourceSublocationId && sourceInv) {
//             const sourceBin = await tx.inventoryBin.findFirst({
//               where: {
//                 inventoryId: sourceInv.id,
//                 sublocationId: line.sourceSublocationId,
//               },
//             });

//             if (sourceBin) {
//               await tx.inventoryBin.update({
//                 where: { id: sourceBin.id },
//                 data: { quantity: { increment: qty } },
//               });
//             }
//           }

//           // Ledger Entry (Reversal / Adjustment for Cancelled Transfer)
//           await tx.inventoryLedger.create({
//             data: {
//               productId: line.productId,
//               locationId: currentOrder.sourceLocationId,
//               sublocationId: line.sourceSublocationId || null,
//               transactionType: InventoryTransactionType.TRANSFER_IN,
//               referenceType: InventoryReferenceType.TRANSFER_ORDER,
//               referenceId: currentOrder.id,
//               performedById: teamMemberId || null,
//               remarks:
//                 remarks ||
//                 `Reversion: Transfer order cancelled during transit`,
//               quantityChange: qty,
//               quantityBefore: beforeQty,
//               quantityAfter: afterQty,
//             },
//           });
//         }

//         return await tx.transferOrder.update({
//           where: { id },
//           data: { status: "CANCELLED", remarks },
//         });
//       }

//       // SCENARIO 4: STANDARD FALLBACK FOR EARLY STAGE VOIDS (DRAFT/PENDING -> CANCELLED)
//       if (
//         targetStatus === "CANCELLED" &&
//         (oldStatus === "DRAFT" || oldStatus === "PENDING")
//       ) {
//         return await tx.transferOrder.update({
//           where: { id },
//           data: { status: "CANCELLED", remarks },
//         });
//       }

//       throw new Error(
//         `Invalid state movement exception pathway from ${oldStatus} to ${targetStatus}`
//       );
//     });

//     return NextResponse.json(processingResult, { status: 200 });
//   } catch (error: any) {
//     console.error("State Processing Transaction Exception:", error);
//     return NextResponse.json(
//       {
//         error:
//           error.message || "State processing pipeline breakdown encountered.",
//       },
//       { status: 500 }
//     );
//   }
// }



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