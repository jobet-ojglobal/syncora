import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stockAdjustmentSchema } from "@/schemas/stock-adjustment.schema";
import {
  InventoryTransactionType,
  InventoryReferenceType,
  AdjustmentStatus,
  InventorySerialAdjustmentAction,
} from "@/generated/prisma/client";

async function generateAdjustmentNumber(tx: any): Promise<string> {
  const count = await tx.inventoryAdjustment.count();
  const nextNum = (count + 1).toString().padStart(5, "0");
  return `ADJ-${nextNum}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. Validate request body against Zod Schema
    const validatedData = stockAdjustmentSchema.parse(body);
    const {
      id: existingAdjustmentId,
      reasonId,
      locationId,
      notes,
      status,
      lines,
    } = validatedData;

    const performedById = "cc920c31-bcb2-4264-9946-4b7693c9c7e0"; // test user

    // Execute atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      let adjustment: any;

      // ----------------------------------------------------------------
      // 1. Save Header & Lines (Draft or Posted)
      // ----------------------------------------------------------------
      if (existingAdjustmentId) {
        const existing = await tx.inventoryAdjustment.findUnique({
          where: { id: existingAdjustmentId },
        });

        if (!existing) {
          throw new Error("Adjustment record not found.");
        }
        if (existing.status === AdjustmentStatus.POSTED) {
          throw new Error("Cannot modify an adjustment that is already POSTED.");
        }

        // Clean up old draft lines before re-creating them
        await tx.inventoryAdjustmentLine.deleteMany({
          where: { adjustmentId: existingAdjustmentId },
        });

        adjustment = await tx.inventoryAdjustment.update({
          where: { id: existingAdjustmentId },
          data: {
            adjustmentReasonId: reasonId || null,
            notes: notes || null,
            performedById,
            status: status as AdjustmentStatus,
          },
        });
      } else {
        const adjustmentNumber = await generateAdjustmentNumber(tx);

        adjustment = await tx.inventoryAdjustment.create({
          data: {
            adjustmentNumber,
            adjustmentReasonId: reasonId || null,
            performedById,
            status: status as AdjustmentStatus,
            notes: notes || null,
          },
        });
      }

      // Record adjustment lines and serial audit snapshots
      const createdLineMap = new Map<string, any>(); // Map productId -> created line

      for (const line of lines) {
        const inventory = await tx.inventory.findUnique({
          where: {
            productId_locationId: {
              productId: line.productId,
              locationId,
            },
          },
        });

        const currentQtyBefore = inventory ? Number(inventory.quantityOnHand) : 0;
        const totalTargetQty = Number(line.quantityOnHand) || 0;
        const netAdjustmentQty = totalTargetQty - currentQtyBefore;

        const createdLine = await tx.inventoryAdjustmentLine.create({
          data: {
            adjustmentId: adjustment.id,
            inventoryId: inventory?.id || null,
            productId: line.productId,
            locationId: locationId,
            quantityBefore: currentQtyBefore,
            quantityAdjusted: netAdjustmentQty,
            quantityAfter: totalTargetQty,
            reason: line.reason || null,
          },
        });

        createdLineMap.set(line.productId, createdLine);
      }

      // ----------------------------------------------------------------
      // 2. Return early if DRAFT status
      // ----------------------------------------------------------------
      if (status === "DRAFT") {
        for (const line of lines) {
          const createdLine = createdLineMap.get(line.productId);
          const allLineSerials = new Set<string>(
            (line.serials || []).map((s: string) => s.trim()).filter(Boolean)
          );

          if (Array.isArray(line.bins)) {
            for (const b of line.bins) {
              if (Array.isArray(b.serials)) {
                b.serials.forEach((sn: string) => {
                  if (sn && sn.trim()) allLineSerials.add(sn.trim());
                });
              }
            }
          }

          if (allLineSerials.size > 0) {
            await tx.inventoryAdjustmentSerial.createMany({
              data: Array.from(allLineSerials).map((sn) => ({
                adjustmentLineId: createdLine.id,
                serialNumber: sn,
                action: InventorySerialAdjustmentAction.VERIFY,
              })),
            });
          }
        }
        return adjustment;
      }

      // ----------------------------------------------------------------
      // 3. Process Inventory, Bins, Ledgers & Serials (POSTED Status)
      // ----------------------------------------------------------------
      for (const line of lines) {
        const { productId, bins = [] } = line;
        const createdLine = createdLineMap.get(productId);

        let inventory = await tx.inventory.findUnique({
          where: { productId_locationId: { productId, locationId } },
        });

        const targetOnHand = Number(line.quantityOnHand) || 0;
        const currentOnHand = inventory ? Number(inventory.quantityOnHand) : 0;
        const netOnHandChange = targetOnHand - currentOnHand;

        if (!inventory) {
          inventory = await tx.inventory.create({
            data: {
              productId,
              locationId,
              quantityOnHand: targetOnHand,
              quantityAvailable: Math.max(
                0,
                targetOnHand - (Number(line.quantityReserved) || 0)
              ),
              quantityReserved: Number(line.quantityReserved) || 0,
            },
          });
        } else {
          const currentReserved = Number(inventory.quantityReserved) || 0;
          await tx.inventory.update({
            where: { id: inventory.id },
            data: {
              quantityOnHand: targetOnHand,
              quantityAvailable: Math.max(0, targetOnHand - currentReserved),
              lastCountedAt: new Date(),
              lastMovementAt: new Date(),
            },
          });
        }

        // Map sublocation ID -> InventoryBin ID
        const sublocationToBinMap = new Map<string, string>();

        for (const binData of bins) {
          const targetBinQty = Number(binData.quantity) || 0;
          const sublocationId = binData.sublocationId;

          if (!sublocationId) continue;

          let binRecord = await tx.inventoryBin.findUnique({
            where: {
              inventoryId_sublocationId: {
                inventoryId: inventory.id,
                sublocationId,
              },
            },
          });

          const previousBinQty = binRecord ? Number(binRecord.quantity) : 0;
          const quantityDifference = targetBinQty - previousBinQty;

          if (binRecord) {
            binRecord = await tx.inventoryBin.update({
              where: { id: binRecord.id },
              data: { quantity: targetBinQty },
            });
          } else {
            binRecord = await tx.inventoryBin.create({
              data: {
                inventoryId: inventory.id,
                sublocationId,
                quantity: targetBinQty,
              },
            });
          }

          sublocationToBinMap.set(sublocationId, binRecord.id);

          // Bin-level Audit Ledger entry
          if (quantityDifference !== 0) {
            await tx.inventoryLedger.create({
              data: {
                productId,
                locationId,
                sublocationId,
                transactionType: InventoryTransactionType.ADJUSTMENT,
                referenceType: InventoryReferenceType.ADJUSTMENT,
                referenceId: adjustment.id,
                performedById,
                quantityChange: quantityDifference,
                quantityBefore: previousBinQty,
                quantityAfter: targetBinQty,
                remarks:
                  notes ||
                  `Stock Adjustment posted (${adjustment.adjustmentNumber})`,
              },
            });
          }
        }

        // Location-level Audit Ledger entry (if no bins are defined)
        if (bins.length === 0 && netOnHandChange !== 0) {
          await tx.inventoryLedger.create({
            data: {
              productId,
              locationId,
              sublocationId: null,
              transactionType: InventoryTransactionType.ADJUSTMENT,
              referenceType: InventoryReferenceType.ADJUSTMENT,
              referenceId: adjustment.id,
              performedById,
              quantityChange: netOnHandChange,
              quantityBefore: currentOnHand,
              quantityAfter: targetOnHand,
              remarks:
                notes ||
                `Stock Adjustment posted (${adjustment.adjustmentNumber})`,
            },
          });
        }

        // ------------------------------------------------------------
        // 4. Reconcile Serial Numbers & Linking (InventoryBinItem)
        // ------------------------------------------------------------
        const serialToBinIdMap = new Map<string, string | null>();
        const allIncomingSerials: string[] = [];

        // Gather top-level serials
        (line.serials || []).forEach((s: string) => {
          const cleaned = s.trim();
          if (cleaned) {
            allIncomingSerials.push(cleaned);
            serialToBinIdMap.set(cleaned, null);
          }
        });

        // Gather bin-level serials (override bin ID)
        for (const b of bins) {
          const binId = sublocationToBinMap.get(b.sublocationId) || null;
          if (Array.isArray(b.serials)) {
            for (const binSerial of b.serials) {
              const cleaned = binSerial.trim();
              if (cleaned) {
                if (!allIncomingSerials.includes(cleaned)) {
                  allIncomingSerials.push(cleaned);
                }
                serialToBinIdMap.set(cleaned, binId);
              }
            }
          }
        }

        if (line.trackSerials) {
          // Find existing serial items currently in stock for this product & location
          const existingSerials = await tx.inventoryBinItem.findMany({
            where: { productId, locationId },
          });

          const existingSerialMap = new Map(
            existingSerials.map((s) => [s.serialNumber, s])
          );
          const existingSerialNumbers = Array.from(existingSerialMap.keys());

          const serialsToCreate = allIncomingSerials.filter(
            (sn) => !existingSerialNumbers.includes(sn)
          );
          const serialsToDelete = existingSerials.filter(
            (s) =>
              !allIncomingSerials.includes(s.serialNumber) &&
              s.status === "IN_STOCK"
          );

          // Delete removed serials & create audit logs
          if (serialsToDelete.length > 0) {
            for (const item of serialsToDelete) {
              await tx.inventoryAdjustmentSerial.create({
                data: {
                  adjustmentLineId: createdLine.id,
                  inventoryBinItemId: item.id,
                  serialNumber: item.serialNumber,
                  action: InventorySerialAdjustmentAction.REMOVE,
                  fromInventoryBinId: item.inventoryBinId,
                  toInventoryBinId: null,
                },
              });
            }

            await tx.inventoryBinItem.deleteMany({
              where: {
                id: { in: serialsToDelete.map((s) => s.id) },
              },
            });
          }

          // Create new serials & create audit logs
          for (const sn of serialsToCreate) {
            const targetBinId = serialToBinIdMap.get(sn) || null;
            const newItem = await tx.inventoryBinItem.create({
              data: {
                productId,
                locationId,
                inventoryBinId: targetBinId,
                serialNumber: sn,
                status: "IN_STOCK",
              },
            });

            await tx.inventoryAdjustmentSerial.create({
              data: {
                adjustmentLineId: createdLine.id,
                inventoryBinItemId: newItem.id,
                serialNumber: sn,
                action: InventorySerialAdjustmentAction.ADD,
                fromInventoryBinId: null,
                toInventoryBinId: targetBinId,
              },
            });
          }

          // Update bin placements for existing serials & create audit logs
          for (const sn of allIncomingSerials) {
            if (existingSerialMap.has(sn)) {
              const item = existingSerialMap.get(sn)!;
              const targetBinId = serialToBinIdMap.get(sn) || null;
              const hasMovedBin = item.inventoryBinId !== targetBinId;

              if (hasMovedBin) {
                await tx.inventoryBinItem.update({
                  where: { id: item.id },
                  data: { inventoryBinId: targetBinId },
                });

                await tx.inventoryAdjustmentSerial.create({
                  data: {
                    adjustmentLineId: createdLine.id,
                    inventoryBinItemId: item.id,
                    serialNumber: sn,
                    action: InventorySerialAdjustmentAction.MOVE,
                    fromInventoryBinId: item.inventoryBinId,
                    toInventoryBinId: targetBinId,
                  },
                });
              } else {
                await tx.inventoryAdjustmentSerial.create({
                  data: {
                    adjustmentLineId: createdLine.id,
                    inventoryBinItemId: item.id,
                    serialNumber: sn,
                    action: InventorySerialAdjustmentAction.VERIFY,
                    fromInventoryBinId: targetBinId,
                    toInventoryBinId: targetBinId,
                  },
                });
              }
            }
          }
        }
      }

      return adjustment;
    });

    return NextResponse.json(
      {
        message:
          status === "DRAFT"
            ? "Adjustment draft saved successfully."
            : "Adjustment posted successfully.",
        data: result,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[INVENTORY_ADJUSTMENT_POST_ERROR]", error);
    return NextResponse.json(
      {
        error:
          error.message ||
          "An internal error occurred while processing the adjustment.",
      },
      { status: 500 }
    );
  }
}

// import { NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";
// import { stockAdjustmentSchema } from "@/schemas/stock-adjustment.schema";
// import {
//   InventoryTransactionType,
//   InventoryReferenceType,
//   AdjustmentStatus,
// } from "@/generated/prisma/client";

// async function generateAdjustmentNumber(tx: any): Promise<string> {
//   const count = await tx.inventoryAdjustment.count();
//   const nextNum = (count + 1).toString().padStart(5, "0");
//   return `ADJ-${nextNum}`;
// }

// export async function POST(req: Request) {
//   try {
//     const body = await req.json();

//     // 1. Validate request body against Zod Schema
//     const validatedData = stockAdjustmentSchema.parse(body);
//     const {
//       id: existingAdjustmentId,
//       reasonId,
//       locationId,
//       notes,
//       status,
//       lines,
//     } = validatedData;

//     const performedById = "cc920c31-bcb2-4264-9946-4b7693c9c7e0"; // test user

//     // Execute atomic transaction
//     const result = await prisma.$transaction(async (tx) => {
//       let adjustment: any;

//       // ----------------------------------------------------------------
//       // 1. Save Header & Lines (Draft or Posted)
//       // ----------------------------------------------------------------
//       if (existingAdjustmentId) {
//         const existing = await tx.inventoryAdjustment.findUnique({
//           where: { id: existingAdjustmentId },
//         });

//         if (!existing) {
//           throw new Error("Adjustment record not found.");
//         }
//         if (existing.status === AdjustmentStatus.POSTED) {
//           throw new Error("Cannot modify an adjustment that is already POSTED.");
//         }

//         // Clean up old draft lines before re-creating them
//         await tx.inventoryAdjustmentLine.deleteMany({
//           where: { adjustmentId: existingAdjustmentId },
//         });

//         adjustment = await tx.inventoryAdjustment.update({
//           where: { id: existingAdjustmentId },
//           data: {
//             adjustmentReasonId: reasonId || null,
//             notes: notes || null,
//             performedById,
//             status: status as AdjustmentStatus,
//           },
//         });
//       } else {
//         const adjustmentNumber = await generateAdjustmentNumber(tx);

//         adjustment = await tx.inventoryAdjustment.create({
//           data: {
//             adjustmentNumber,
//             adjustmentReasonId: reasonId || null,
//             performedById,
//             status: status as AdjustmentStatus,
//             notes: notes || null,
//           },
//         });
//       }

//       // Record adjustment lines and serial audit snapshots
//       const createdLineMap = new Map<string, any>(); // Map productId -> created line

//       for (const line of lines) {
//         const inventory = await tx.inventory.findUnique({
//           where: {
//             productId_locationId: {
//               productId: line.productId,
//               locationId,
//             },
//           },
//         });

//         const currentQtyBefore = inventory ? Number(inventory.quantityOnHand) : 0;
//         const totalTargetQty = Number(line.quantityOnHand) || 0;
//         const netAdjustmentQty = totalTargetQty - currentQtyBefore;

//         const createdLine = await tx.inventoryAdjustmentLine.create({
//           data: {
//             adjustmentId: adjustment.id,
//             inventoryId: inventory?.id || null,
//             productId: line.productId,
//             locationId: locationId,
//             quantityBefore: currentQtyBefore,
//             quantityAdjusted: netAdjustmentQty,
//             quantityAfter: totalTargetQty,
//             reason: line.reason || null,
//           },
//         });

//         createdLineMap.set(line.productId, createdLine);
//       }

//       // ----------------------------------------------------------------
//       // 2. Return early if DRAFT status
//       // ----------------------------------------------------------------
//       if (status === "DRAFT") {
//         // Collect top-level and bin-level serials for draft record
//         for (const line of lines) {
//           const createdLine = createdLineMap.get(line.productId);
//           const allLineSerials = new Set<string>(
//             (line.serials || []).map((s) => s.trim()).filter(Boolean)
//           );
//           if (Array.isArray(line.bins)) {
//             for (const b of line.bins) {
//               if (Array.isArray(b.serials)) {
//                 b.serials.forEach((sn) => {
//                   if (sn && sn.trim()) allLineSerials.add(sn.trim());
//                 });
//               }
//             }
//           }

//           if (allLineSerials.size > 0) {
//             await tx.inventoryAdjustmentSerial.createMany({
//               data: Array.from(allLineSerials).map((sn) => ({
//                 adjustmentLineId: createdLine.id,
//                 serialNumber: sn,
//               })),
//             });
//           }
//         }
//         return adjustment;
//       }

//       // ----------------------------------------------------------------
//       // 3. Process Inventory, Bins, Ledgers & Serials (POSTED Status)
//       // ----------------------------------------------------------------
//       for (const line of lines) {
//         const { productId, bins = [] } = line;
//         const createdLine = createdLineMap.get(productId);

//         let inventory = await tx.inventory.findUnique({
//           where: { productId_locationId: { productId, locationId } },
//         });

//         const targetOnHand = Number(line.quantityOnHand) || 0;
//         const currentOnHand = inventory ? Number(inventory.quantityOnHand) : 0;
//         const netOnHandChange = targetOnHand - currentOnHand;

//         if (!inventory) {
//           inventory = await tx.inventory.create({
//             data: {
//               productId,
//               locationId,
//               quantityOnHand: targetOnHand,
//               quantityAvailable: Math.max(
//                 0,
//                 targetOnHand - (Number(line.quantityReserved) || 0)
//               ),
//               quantityReserved: Number(line.quantityReserved) || 0,
//             },
//           });
//         } else {
//           const currentReserved = Number(inventory.quantityReserved) || 0;
//           await tx.inventory.update({
//             where: { id: inventory.id },
//             data: {
//               quantityOnHand: targetOnHand,
//               quantityAvailable: Math.max(0, targetOnHand - currentReserved),
//               lastCountedAt: new Date(),
//               lastMovementAt: new Date(),
//             },
//           });
//         }

//         // Map sublocation ID -> InventoryBin ID
//         const sublocationToBinMap = new Map<string, string>();

//         for (const binData of bins) {
//           const targetBinQty = Number(binData.quantity) || 0;
//           const sublocationId = binData.sublocationId;

//           if (!sublocationId) continue;

//           let binRecord = await tx.inventoryBin.findUnique({
//             where: {
//               inventoryId_sublocationId: {
//                 inventoryId: inventory.id,
//                 sublocationId,
//               },
//             },
//           });

//           const previousBinQty = binRecord ? Number(binRecord.quantity) : 0;
//           const quantityDifference = targetBinQty - previousBinQty;

//           if (binRecord) {
//             binRecord = await tx.inventoryBin.update({
//               where: { id: binRecord.id },
//               data: { quantity: targetBinQty },
//             });
//           } else {
//             binRecord = await tx.inventoryBin.create({
//               data: {
//                 inventoryId: inventory.id,
//                 sublocationId,
//                 quantity: targetBinQty,
//               },
//             });
//           }

//           sublocationToBinMap.set(sublocationId, binRecord.id);

//           // Bin-level Audit Ledger entry
//           if (quantityDifference !== 0) {
//             await tx.inventoryLedger.create({
//               data: {
//                 productId,
//                 locationId,
//                 sublocationId,
//                 transactionType: InventoryTransactionType.ADJUSTMENT,
//                 referenceType: InventoryReferenceType.ADJUSTMENT,
//                 referenceId: adjustment.id,
//                 performedById,
//                 quantityChange: quantityDifference,
//                 quantityBefore: previousBinQty,
//                 quantityAfter: targetBinQty,
//                 remarks:
//                   notes ||
//                   `Stock Adjustment posted (${adjustment.adjustmentNumber})`,
//               },
//             });
//           }
//         }

//         // Location-level Audit Ledger entry (if no bins are defined)
//         if (bins.length === 0 && netOnHandChange !== 0) {
//           await tx.inventoryLedger.create({
//             data: {
//               productId,
//               locationId,
//               sublocationId: null,
//               transactionType: InventoryTransactionType.ADJUSTMENT,
//               referenceType: InventoryReferenceType.ADJUSTMENT,
//               referenceId: adjustment.id,
//               performedById,
//               quantityChange: netOnHandChange,
//               quantityBefore: currentOnHand,
//               quantityAfter: targetOnHand,
//               remarks:
//                 notes ||
//                 `Stock Adjustment posted (${adjustment.adjustmentNumber})`,
//             },
//           });
//         }

//         // ------------------------------------------------------------
//         // 4. Reconcile Serial Numbers & Linking (InventoryBinItem)
//         // ------------------------------------------------------------
//         const serialToBinIdMap = new Map<string, string | null>();
//         const allIncomingSerials: string[] = [];

//         // Gather top-level serials
//         (line.serials || []).forEach((s) => {
//           const cleaned = s.trim();
//           if (cleaned) {
//             allIncomingSerials.push(cleaned);
//             serialToBinIdMap.set(cleaned, null);
//           }
//         });

//         // Gather bin-level serials (override bin ID)
//         for (const b of bins) {
//           const binId = sublocationToBinMap.get(b.sublocationId) || null;
//           if (Array.isArray(b.serials)) {
//             for (const binSerial of b.serials) {
//               const cleaned = binSerial.trim();
//               if (cleaned) {
//                 if (!allIncomingSerials.includes(cleaned)) {
//                   allIncomingSerials.push(cleaned);
//                 }
//                 serialToBinIdMap.set(cleaned, binId);
//               }
//             }
//           }
//         }

//         if (line.trackSerials) {
//           // Find existing serial items currently in stock for this product & location
//           const existingSerials = await tx.inventoryBinItem.findMany({
//             where: { productId, locationId },
//           });

//           const existingSerialNumbers = existingSerials.map((s) => s.serialNumber);

//           const serialsToCreate = allIncomingSerials.filter(
//             (sn) => !existingSerialNumbers.includes(sn)
//           );
//           const serialsToDelete = existingSerials.filter(
//             (s) => !allIncomingSerials.includes(s.serialNumber) && s.status === "IN_STOCK"
//           );

//           // Delete removed serials
//           if (serialsToDelete.length > 0) {
//             await tx.inventoryBinItem.deleteMany({
//               where: {
//                 id: { in: serialsToDelete.map((s) => s.id) },
//               },
//             });
//           }

//           // Create new serials
//           if (serialsToCreate.length > 0) {
//             for (const sn of serialsToCreate) {
//               await tx.inventoryBinItem.create({
//                 data: {
//                   productId,
//                   locationId,
//                   inventoryBinId: serialToBinIdMap.get(sn) || null,
//                   serialNumber: sn,
//                   status: "IN_STOCK",
//                 },
//               });
//             }
//           }

//           // Update bin placements for kept existing serials
//           for (const sn of allIncomingSerials) {
//             if (existingSerialNumbers.includes(sn)) {
//               await tx.inventoryBinItem.updateMany({
//                 where: { productId, locationId, serialNumber: sn },
//                 data: { inventoryBinId: serialToBinIdMap.get(sn) || null },
//               });
//             }
//           }
//         }

//         // Link all adjusted serials back to InventoryAdjustmentSerial for auditing
//         const activeSerialRecords = await tx.inventoryBinItem.findMany({
//           where: {
//             productId,
//             locationId,
//             serialNumber: { in: allIncomingSerials },
//           },
//         });

//         const serialIdMap = new Map(
//           activeSerialRecords.map((item) => [item.serialNumber, item.id])
//         );

//         if (allIncomingSerials.length > 0) {
//           await tx.inventoryAdjustmentSerial.createMany({
//             data: allIncomingSerials.map((sn) => ({
//               adjustmentLineId: createdLine.id,
//               serialNumber: sn,
//               inventoryItemId: serialIdMap.get(sn) || null,
//             })),
//           });
//         }
//       }

//       return adjustment;
//     });

//     return NextResponse.json(
//       {
//         message:
//           status === "DRAFT"
//             ? "Adjustment draft saved successfully."
//             : "Adjustment posted successfully.",
//         data: result,
//       },
//       { status: 200 }
//     );
//   } catch (error: any) {
//     console.error("[INVENTORY_ADJUSTMENT_POST_ERROR]", error);
//     return NextResponse.json(
//       {
//         error:
//           error.message ||
//           "An internal error occurred while processing the adjustment.",
//       },
//       { status: 500 }
//     );
//   }
// }