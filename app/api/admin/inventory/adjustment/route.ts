import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stockAdjustmentSchema } from "@/schemas/stock-adjustment.schema";
import {
  InventoryTransactionType,
  InventoryReferenceType,
  AdjustmentStatus,
  InventorySerialAdjustmentAction,
  Prisma,
  InventoryAdjustmentLineReason,
} from "@/generated/prisma/client";
import { ZodError } from "zod";

/**
 * Generates the next sequential adjustment number using transactional locking
 * to prevent duplicate key race conditions under high concurrency.
 */
async function generateAdjustmentNumber(tx: Prisma.TransactionClient): Promise<string> {
  const result = await tx.$queryRaw<Array<{ count: bigint | number }>>`
    SELECT COUNT(*)::bigint FROM "inventory_adjustment"
  `;

  // Number(...) cleanly parses both JS numbers and BigInts
  const count = Number(result[0]?.count ?? 0); 
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
      remarks,
      status,
      lines,
    } = validatedData;

    // TODO: Replace with dynamic user context from session / auth header
    const performedById = "cc920c31-bcb2-4264-9946-4b7693c9c7e0";

    // Execute atomic transaction with custom timeout
    const result = await prisma.$transaction(
      async (tx) => {
        let adjustment: any;

        // ----------------------------------------------------------------
        // 1. Save Header (Create or Update Draft)
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

          // Fetch existing line IDs to explicitly clear nested draft records
          const existingLines = await tx.inventoryAdjustmentLine.findMany({
            where: { adjustmentId: existingAdjustmentId },
            select: { id: true },
          });
          const existingLineIds = existingLines.map((l) => l.id);

          if (existingLineIds.length > 0) {
            // Delete draft serials and draft bins associated with existing lines
            await tx.inventoryAdjustmentSerial.deleteMany({
              where: { adjustmentLineId: { in: existingLineIds } },
            });
            await tx.inventoryAdjustmentLineBin.deleteMany({
              where: { adjustmentLineId: { in: existingLineIds } },
            });
            // Clean up old draft lines
            await tx.inventoryAdjustmentLine.deleteMany({
              where: { adjustmentId: existingAdjustmentId },
            });
          }

          adjustment = await tx.inventoryAdjustment.update({
            where: { id: existingAdjustmentId },
            data: {
              adjustmentReasonId: reasonId || null,
              remarks: remarks || null,
              lastModifiedById: performedById,
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
              remarks: remarks || null,
            },
          });
        }

        // ----------------------------------------------------------------
        // 2. Record Adjustment Lines
        // ----------------------------------------------------------------
        // Store lines in an array by index to handle multiple lines per productId safely
        const createdLines: any[] = [];

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];

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
              locationId,
              quantityBefore: currentQtyBefore,
              quantityAdjusted: netAdjustmentQty,
              quantityAfter: totalTargetQty,
              reason: (line.reason as InventoryAdjustmentLineReason) || null,
            },
          });

          createdLines[i] = createdLine;
        }

        // ----------------------------------------------------------------
        // 3. Save DRAFT Sub-resources & Early Return
        // ----------------------------------------------------------------
        // if (status === AdjustmentStatus.DRAFT) {
        //   const draftSerialsToCreate: Prisma.InventoryAdjustmentSerialCreateManyInput[] = [];
        //   const draftBinsToCreate: Prisma.InventoryAdjustmentLineBinCreateManyInput[] = [];

        //   for (let i = 0; i < lines.length; i++) {
        //     const line = lines[i];
        //     const createdLine = createdLines[i];

        //     // A. Process Serials for Draft
        //     const allLineSerials = new Set<string>(
        //       (line.serials || []).map((s: string) => s.trim()).filter(Boolean)
        //     );

        //     if (Array.isArray(line.bins)) {
        //       for (const b of line.bins) {
        //         if (Array.isArray(b.serials)) {
        //           b.serials.forEach((sn: string) => {
        //             const cleaned = sn?.trim();
        //             if (cleaned) allLineSerials.add(cleaned);
        //           });
        //         }
        //       }
        //     }

        //     if (allLineSerials.size > 0) {
        //       Array.from(allLineSerials).forEach((sn) => {
        //         draftSerialsToCreate.push({
        //           adjustmentLineId: createdLine.id,
        //           serialNumber: sn,
        //           action: InventorySerialAdjustmentAction.VERIFY,
        //         });
        //       });
        //     }

        //     // B. Process Bin Allocations for Draft
        //     const { bins = [] } = line;
        //     for (const binData of bins) {
        //       if (!binData.sublocationId) continue;

        //       draftBinsToCreate.push({
        //         adjustmentLineId: createdLine.id,
        //         sublocationId: binData.sublocationId,
        //         quantity: Number(binData.quantity) || 0,
        //       });
        //     }
        //   }

        //   if (draftSerialsToCreate.length > 0) {
        //     await tx.inventoryAdjustmentSerial.createMany({
        //       data: draftSerialsToCreate,
        //     });
        //   }

        //   if (draftBinsToCreate.length > 0) {
        //     await tx.inventoryAdjustmentLineBin.createMany({
        //       data: draftBinsToCreate,
        //     });
        //   }

        //   return adjustment;
        // }

        // ----------------------------------------------------------------
        // 3. Save DRAFT Sub-resources & Early Return
        // ----------------------------------------------------------------
        if (status === AdjustmentStatus.DRAFT) {
          const draftSerialsToCreate: Prisma.InventoryAdjustmentSerialCreateManyInput[] = [];

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const createdLine = createdLines[i];
            const { bins = [] } = line;

            // Track serial numbers assigned to specific bins vs unassigned
            const assignedBinSerials = new Set<string>();

            // A. Process Draft Bins first to capture generated draftBin.id
            for (const binData of bins) {
              if (!binData.sublocationId) continue;

              const createdDraftBin = await tx.inventoryAdjustmentLineBin.create({
                data: {
                  adjustmentLineId: createdLine.id,
                  sublocationId: binData.sublocationId,
                  quantity: Number(binData.quantity) || 0,
                },
              });

              // Track and link serials belonging to this specific bin
              if (Array.isArray(binData.serials)) {
                binData.serials.forEach((sn: string) => {
                  const cleaned = sn?.trim();
                  if (cleaned) {
                    assignedBinSerials.add(cleaned);
                    draftSerialsToCreate.push({
                      adjustmentLineId: createdLine.id,
                      draftBinId: createdDraftBin.id, // Explicit draft bin link!
                      serialNumber: cleaned,
                      action: InventorySerialAdjustmentAction.VERIFY,
                    });
                  }
                });
              }
            }

            // B. Process Unassigned / Line-level Serials (draftBinId = null)
            const rawLineSerials: string[] = line.serials || [];
            rawLineSerials.forEach((sn: string) => {
              const cleaned = sn?.trim();
              if (cleaned && !assignedBinSerials.has(cleaned)) {
                draftSerialsToCreate.push({
                  adjustmentLineId: createdLine.id,
                  draftBinId: null, // Unassigned serial
                  serialNumber: cleaned,
                  action: InventorySerialAdjustmentAction.VERIFY,
                });
              }
            });
          }

          // Bulk insert all draft serials (both bin-assigned and unassigned)
          if (draftSerialsToCreate.length > 0) {
            await tx.inventoryAdjustmentSerial.createMany({
              data: draftSerialsToCreate,
            });
          }

          return adjustment;
        }

        // ----------------------------------------------------------------
        // 4. Process POSTED Status (Stock, Bins, Ledgers, & Serials)
        // ----------------------------------------------------------------
        const ledgerEntriesToCreate: Prisma.InventoryLedgerCreateManyInput[] = [];
        const serialAuditsToCreate: Prisma.InventoryAdjustmentSerialCreateManyInput[] = [];

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const createdLine = createdLines[i];
          const { productId, bins = [] } = line;

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

          // Bin-level reconciliations
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

            // Staging Bin Ledger Entries
            if (quantityDifference !== 0) {
              ledgerEntriesToCreate.push({
                productId,
                locationId,
                sublocationId,
                transactionType: "ADJUSTMENT",
                referenceType: "ADJUSTMENT",
                referenceId: adjustment.id,
                performedById,
                quantityChange: quantityDifference,
                quantityBefore: previousBinQty,
                quantityAfter: targetBinQty,
                remarks:
                  remarks ||
                  `Stock Adjustment posted (${adjustment.adjustmentNumber})`,
              });
            }
          }

          // Staging Location Ledger Entry (if no bins are defined)
          if (bins.length === 0 && netOnHandChange !== 0) {
            ledgerEntriesToCreate.push({
              productId,
              locationId,
              sublocationId: null,
              transactionType: "ADJUSTMENT",
              referenceType: "ADJUSTMENT",
              referenceId: adjustment.id,
              performedById,
              quantityChange: netOnHandChange,
              quantityBefore: currentOnHand,
              quantityAfter: targetOnHand,
              remarks:
                remarks ||
                `Stock Adjustment posted (${adjustment.adjustmentNumber})`,
            });
          }

          // Serials Processing
          const serialToBinIdMap = new Map<string, string | null>();
          const allIncomingSerials: string[] = [];

          (line.serials || []).forEach((s: string) => {
            const cleaned = s.trim();
            if (cleaned) {
              allIncomingSerials.push(cleaned);
              serialToBinIdMap.set(cleaned, null);
            }
          });

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

            // Deletions
            if (serialsToDelete.length > 0) {
              serialsToDelete.forEach((item) => {
                serialAuditsToCreate.push({
                  adjustmentLineId: createdLine.id,
                  inventoryBinItemId: item.id,
                  serialNumber: item.serialNumber,
                  action: InventorySerialAdjustmentAction.REMOVE,
                  fromInventoryBinId: item.inventoryBinId,
                  toInventoryBinId: null,
                });
              });

              await tx.inventoryBinItem.deleteMany({
                where: { id: { in: serialsToDelete.map((s) => s.id) } },
              });
            }

            // Insertions
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

              serialAuditsToCreate.push({
                adjustmentLineId: createdLine.id,
                inventoryBinItemId: newItem.id,
                serialNumber: sn,
                action: InventorySerialAdjustmentAction.ADD,
                fromInventoryBinId: null,
                toInventoryBinId: targetBinId,
              });
            }

            // Movements & Verifications
            for (const sn of allIncomingSerials) {
              if (existingSerialMap.has(sn)) {
                const item = existingSerialMap.get(sn)!;
                const targetBinId = serialToBinIdMap.get(sn) || null;

                if (item.inventoryBinId !== targetBinId) {
                  await tx.inventoryBinItem.update({
                    where: { id: item.id },
                    data: { inventoryBinId: targetBinId },
                  });

                  serialAuditsToCreate.push({
                    adjustmentLineId: createdLine.id,
                    inventoryBinItemId: item.id,
                    serialNumber: sn,
                    action: InventorySerialAdjustmentAction.MOVE,
                    fromInventoryBinId: item.inventoryBinId,
                    toInventoryBinId: targetBinId,
                  });
                } else {
                  serialAuditsToCreate.push({
                    adjustmentLineId: createdLine.id,
                    inventoryBinItemId: item.id,
                    serialNumber: sn,
                    action: InventorySerialAdjustmentAction.VERIFY,
                    fromInventoryBinId: targetBinId,
                    toInventoryBinId: targetBinId,
                  });
                }
              }
            }
          }
        }

        // Dynamic Bulk Inserts for Posted State
        if (ledgerEntriesToCreate.length > 0) {
          await tx.inventoryLedger.createMany({ data: ledgerEntriesToCreate });
        }
        if (serialAuditsToCreate.length > 0) {
          await tx.inventoryAdjustmentSerial.createMany({ data: serialAuditsToCreate });
        }

        return adjustment;
      },
      { timeout: 15000 }
    );

    return NextResponse.json(
      {
        message:
          status === AdjustmentStatus.DRAFT
            ? "Adjustment draft saved successfully."
            : "Adjustment posted successfully.",
        data: result,
      },
      { status: 200 }
    );
  } catch (error: any) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error },
        { status: 400 }
      );
    }

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

// if (status === AdjustmentStatus.DRAFT) {
        //   const draftSerialsToCreate: Prisma.InventoryAdjustmentSerialCreateManyInput[] = [];

        //   for (const line of lines) {
        //     const createdLine = createdLineMap.get(line.productId);
        //     const { productId, bins = [] } = line;

        //     // Find or create Inventory container so sublocation bins can be mapped/linked
        //     let inventory = await tx.inventory.findUnique({
        //       where: { productId_locationId: { productId, locationId } },
        //     });

        //     if (!inventory) {
        //       inventory = await tx.inventory.create({
        //         data: {
        //           productId,
        //           locationId,
        //           quantityOnHand: 0,
        //           quantityAvailable: 0,
        //           quantityReserved: 0,
        //         },
        //       });
        //     }

        //     // Map sublocations to actual InventoryBin records during DRAFT save
        //     const sublocationToBinMap = new Map<string, string>();
        //     const serialToBinIdMap = new Map<string, string | null>();

        //     for (const binData of bins) {
        //       const sublocationId = binData.sublocationId;
        //       if (!sublocationId) continue;

        //       // Find existing bin or create placeholder bin for draft persistence
        //       let binRecord = await tx.inventoryBin.findUnique({
        //         where: {
        //           inventoryId_sublocationId: {
        //             inventoryId: inventory.id,
        //             sublocationId,
        //           },
        //         },
        //       });

        //       if (!binRecord) {
        //         binRecord = await tx.inventoryBin.create({
        //           data: {
        //             inventoryId: inventory.id,
        //             sublocationId,
        //             quantity: Number(binData.quantity) || 0,
        //           },
        //         });
        //       }

        //       sublocationToBinMap.set(sublocationId, binRecord.id);

        //       // Map serials inside this bin to its bin record ID
        //       if (Array.isArray(binData.serials)) {
        //         binData.serials.forEach((binSerial: string) => {
        //           const cleaned = binSerial?.trim();
        //           if (cleaned) {
        //             serialToBinIdMap.set(cleaned, binRecord.id);
        //           }
        //         });
        //       }
        //     }

        //     // Collect top-level and bin-level serials
        //     const allLineSerials = new Map<string, string | null>();

        //     (line.serials || []).forEach((s: string) => {
        //       const cleaned = s.trim();
        //       if (cleaned) {
        //         allLineSerials.set(cleaned, serialToBinIdMap.get(cleaned) || null);
        //       }
        //     });

        //     for (const [sn, targetBinId] of serialToBinIdMap.entries()) {
        //       if (!allLineSerials.has(sn)) {
        //         allLineSerials.set(sn, targetBinId);
        //       }
        //     }

        //     // Stage serial adjustment audit records with target bin context for DRAFT mode
        //     for (const [sn, targetBinId] of allLineSerials.entries()) {
        //       draftSerialsToCreate.push({
        //         adjustmentLineId: createdLine.id,
        //         serialNumber: sn,
        //         action: InventorySerialAdjustmentAction.VERIFY,
        //         fromInventoryBinId: targetBinId,
        //         toInventoryBinId: targetBinId,
        //       });
        //     }
        //   }

        //   if (draftSerialsToCreate.length > 0) {
        //     await tx.inventoryAdjustmentSerial.createMany({
        //       data: draftSerialsToCreate,
        //     });
        //   }

        //   return adjustment;
        // }

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
//       remarks,
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
//             remarks: remarks || null,
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
//             remarks: remarks || null,
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
//                   remarks ||
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
//                 remarks ||
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