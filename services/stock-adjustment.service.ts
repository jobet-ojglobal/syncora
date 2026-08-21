import { PrismaClient, Prisma } from "@/generated/prisma/client";
import {
  AdjustmentStatus,
  InventoryAdjustmentLineReason,
  InventorySerialAdjustmentAction,
} from "@/generated/prisma/client";
<<<<<<< HEAD
import { StockAdjustmentLineInput } from "@/schemas/stock-adjustment.schema";
=======
>>>>>>> f774fa4d46540598445552ff7ba82d06bcdf5aad

export interface StockAdjustmentBinInput {
  sublocationId: string;
  quantity: number;
  serials?: string[];
}

export type SyncAdjustmentLine = StockAdjustmentLineInput & {
  description?: string;
};

<<<<<<< HEAD
// export interface StockAdjustmentLineInput {
//   productId: string;
//   quantityOnHand: number;
//   quantityReserved?: number;
//   trackSerials?: boolean;
//   reason?: string;
//   description?: string;
//   serials?: string[];
//   bins?: StockAdjustmentBinInput[];
// }
=======
export type StockAdjustmentLineInput = {
  productId: string;
  trackSerials: boolean;
  quantityAdjusted: number;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  bins: {
    sublocationId: string;
    quantity: number;
    serials: string[];
    id?: string | undefined;
  }[];
  serials: string[];
  id?: string | undefined;
  reason?: string | null | undefined;
<<<<<<< HEAD
}
>>>>>>> f774fa4d46540598445552ff7ba82d06bcdf5aad
=======
};
>>>>>>> c66250bba3194c91f5b84633a80c8f9687f3d979

export interface PostAdjustmentPayload {
  existingAdjustmentId?: string;
  reasonId?: string;
  locationId: string;
  remarks?: string;
  performedById: string;
  lines: SyncAdjustmentLine[];
  
}

export interface ProcessedAdjustmentResult {
  adjustment: any;
  createdAdjustmentLines: Array<{
    inflowId: string | null;
    productId: string;
    quantityOnHand: number;
    quantityAdjusted: number;
    sublocation: string | null;
    serials: string[];
    description?: string;
  }>;
}

export class AdjustmentService {
  constructor(
    private prisma: PrismaClient,
    private queueProvider?: { addJob: (jobName: string, payload: any) => Promise<void> }
  ) {}

  async postAdjustment(payload: PostAdjustmentPayload, prefix?: string): Promise<ProcessedAdjustmentResult> {
    const {
      existingAdjustmentId,
      reasonId,
      locationId,
      remarks,
      performedById,
      lines,
    } = payload;

    const result = await this.prisma.$transaction(
      async (tx) => {
        let adjustment: any;
        const createdAdjustmentLines: ProcessedAdjustmentResult["createdAdjustmentLines"] = [];

        // ----------------------------------------------------------------
        // 1. Header Validation & Upsert
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

          // Clear pre-existing draft lines before committing POST
          const existingLines = await tx.inventoryAdjustmentLine.findMany({
            where: { adjustmentId: existingAdjustmentId },
            select: { id: true },
          });
          const existingLineIds = existingLines.map((l) => l.id);

          if (existingLineIds.length > 0) {
            await tx.inventoryAdjustmentSerial.deleteMany({
              where: { adjustmentLineId: { in: existingLineIds } },
            });
            await tx.inventoryAdjustmentLineBin.deleteMany({
              where: { adjustmentLineId: { in: existingLineIds } },
            });
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
              status: AdjustmentStatus.POSTED,
            },
          });
        } else {
          const adjustmentNumber = await this.generateAdjustmentNumber(tx, prefix);
          const computedInflowId = crypto.randomUUID().toLowerCase();

          adjustment = await tx.inventoryAdjustment.create({
            data: {
              inflowId: computedInflowId,
              adjustmentNumber,
              adjustmentReasonId: reasonId || null,
              performedById,
              status: AdjustmentStatus.POSTED,
              remarks: remarks || null,
            },
          });
        }

        // ----------------------------------------------------------------
        // 2. Commit Inventory, Bins, & Ledger Balances
        // ----------------------------------------------------------------
        const ledgerEntriesToCreate: Prisma.InventoryLedgerCreateManyInput[] = [];
        const serialAuditsToCreate: Prisma.InventoryAdjustmentSerialCreateManyInput[] = [];

        for (const line of lines) {
          const { productId, bins = [], trackSerials } = line;

          let inventory = await tx.inventory.findUnique({
            where: { productId_locationId: { productId, locationId } },
          });

          const targetOnHand = Number(line.quantityOnHand) || 0;
          const currentOnHand = inventory ? Number(inventory.quantityOnHand) : 0;
          const netOnHandChange = targetOnHand - currentOnHand;

          // Sync Header Inventory
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
                quantityReserved: Number(line.quantityReserved) || 0,
                quantityAvailable: Math.max(0, targetOnHand - currentReserved),
                lastCountedAt: new Date(),
                lastMovementAt: new Date(),
              },
            });
          }

          const sublocationToBinMap = new Map<string, string>();

          // Non-serialized vs serialized line persistence
          if (!trackSerials) {
            if (bins.length > 0) {
              for (const binData of bins) {
                if (!binData.sublocationId) continue;

                const sublocation = await tx.sublocation.findUnique({
                  where: { id: binData.sublocationId },
                  select: { name: true },
                });

                if (!sublocation?.name) continue;

                const targetBinQty = Number(binData.quantity) || 0;

                const existingBin = await tx.inventoryBin.findUnique({
                  where: {
                    inventoryId_sublocationId: {
                      inventoryId: inventory.id,
                      sublocationId: binData.sublocationId,
                    },
                  },
                });

                const prevBinQty = existingBin ? Number(existingBin.quantity) : 0;
                const quantityDifference = targetBinQty - prevBinQty;

                if (existingBin) {
                  await tx.inventoryBin.update({
                    where: { id: existingBin.id },
                    data: { quantity: targetBinQty },
                  });
                  sublocationToBinMap.set(binData.sublocationId, existingBin.id);
                } else {
                  const newBin = await tx.inventoryBin.create({
                    data: {
                      inventoryId: inventory.id,
                      sublocationId: binData.sublocationId,
                      quantity: targetBinQty,
                    },
                  });
                  sublocationToBinMap.set(binData.sublocationId, newBin.id);
                }

                if (quantityDifference !== 0) {
                  ledgerEntriesToCreate.push({
                    productId,
                    locationId,
                    sublocationId: binData.sublocationId,
                    transactionType: "ADJUSTMENT",
                    referenceType: "ADJUSTMENT",
                    referenceId: adjustment.id,
                    performedById,
                    quantityChange: quantityDifference,
                    quantityBefore: prevBinQty,
                    quantityAfter: targetBinQty,
                    remarks:
                      remarks ||
                      `Stock Adjustment posted (${adjustment.adjustmentNumber})`,
                  });
                }

                const computedInflowId = crypto.randomUUID().toLowerCase();

                const createdLine = await tx.inventoryAdjustmentLine.create({
                  data: {
                    inflowId: computedInflowId,
                    adjustmentId: adjustment.inflowId,
                    inventoryId: inventory.id,
                    productId,
                    locationId,
                    inventoryBinId: sublocationToBinMap.get(binData.sublocationId) || null,
                    quantityBefore: prevBinQty,
                    quantityAdjusted: quantityDifference,
                    quantityAfter: targetBinQty,
                    quantityReserved: line.quantityReserved,
                    reason: (line.reason as InventoryAdjustmentLineReason) || null,
                    description: line.description || null,
                  },
                });

                createdAdjustmentLines.push({
                  inflowId: createdLine.inflowId,
                  productId: line.productId,
                  quantityOnHand: targetBinQty,
                  quantityAdjusted: quantityDifference,
                  sublocation: sublocation.name,
                  serials: [],
                  description: line.description || undefined,
                });
              }
            } else {
              // Location Ledger Entry (No sublocations)
              if (netOnHandChange !== 0) {
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

              const computedInflowId = crypto.randomUUID().toLowerCase();

              const createdLine = await tx.inventoryAdjustmentLine.create({
                data: {
                  inflowId: computedInflowId,
                  adjustmentId: adjustment.inflowId,
                  inventoryId: inventory.id,
                  productId,
                  locationId,
                  inventoryBinId: null,
                  quantityBefore: currentOnHand,
                  quantityAdjusted: line.quantityAdjusted ?? netOnHandChange,
                  quantityAfter: targetOnHand,
                  quantityReserved: line.quantityReserved,
                  reason: (line.reason as InventoryAdjustmentLineReason) || null,
                  description: line.description || null,
                },
              });

              createdAdjustmentLines.push({
                inflowId: createdLine.inflowId,
                productId: line.productId,
                quantityOnHand: targetOnHand,
                quantityAdjusted: line.quantityAdjusted ?? netOnHandChange,
                sublocation: null,
                serials: [],
                description: line.description || undefined,
              });
            }
          } else {
            // ----------------------------------------------------------------
            // SERIALIZED PATH 
            // ----------------------------------------------------------------
            const existingSerials = await tx.inventoryBinItem.findMany({
              where: { productId, locationId },
            });
            const existingSerialMap = new Map(existingSerials.map((s) => [s.serialNumber, s]));
            const existingSerialNumbers = Array.from(existingSerialMap.keys());

            const serialToBinIdMap = new Map<string, string | null>();
            const allIncomingSerials: string[] = [];

            (line.serials || []).forEach((s: string) => {
              const cleaned = s.trim();
              if (cleaned) {
                allIncomingSerials.push(cleaned);
                serialToBinIdMap.set(cleaned, null);
              }
            });

            // Map serial numbers inside bins
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

            // Categorize serials accurately
            const serialsToCreate = allIncomingSerials.filter((sn) => !existingSerialNumbers.includes(sn));
            const serialsToDelete = existingSerials.filter(
              (s) => !allIncomingSerials.includes(s.serialNumber) && s.status === "IN_STOCK"
            );

            const serialAdjustmentLineMap = new Map<string, string>();
            let fallbackLineId: string | null = null; 

            // STEP A: Handle Removals
            if (serialsToDelete.length > 0) {
              const removedInflowId = crypto.randomUUID().toLowerCase();
              const removedLine = await tx.inventoryAdjustmentLine.create({
                data: {
                  inflowId: removedInflowId,
                  adjustmentId: adjustment.inflowId,
                  inventoryId: inventory.id,
                  productId,
                  locationId,
                  inventoryBinId: null,
                  quantityBefore: currentOnHand,
                  quantityAdjusted: -serialsToDelete.length,
                  quantityAfter: currentOnHand - serialsToDelete.length,
                  quantityReserved: line.quantityReserved,
                  reason: (line.reason as InventoryAdjustmentLineReason) || null,
                  description: `Removed ${serialsToDelete.length} serial(s)`,
                },
              });
              fallbackLineId = removedLine.id;

              const removedSerialNumbers = serialsToDelete.map(s => s.serialNumber);
              createdAdjustmentLines.push({
                inflowId: removedLine.inflowId,
                productId: line.productId,
                quantityOnHand: currentOnHand - serialsToDelete.length,
                quantityAdjusted: -serialsToDelete.length,
                sublocation: null,
                serials: removedSerialNumbers,
                description: line.description || `Removed ${serialsToDelete.length} serial(s)`,
              });

              for (const item of serialsToDelete) {
                serialAuditsToCreate.push({
                  adjustmentLineId: removedLine.id,
                  inventoryBinItemId: null,
                  serialNumber: item.serialNumber,
                  action: InventorySerialAdjustmentAction.REMOVE,
                  fromInventoryBinId: item.inventoryBinId,
                  toInventoryBinId: null,
                });
              }

              await tx.inventoryBinItem.deleteMany({
                where: { id: { in: serialsToDelete.map((s) => s.id) } },
              });
            }

            // STEP B: Handle Additions
            if (serialsToCreate.length > 0) {
              const binGroups = new Map<string | null, string[]>();
              for (const sn of serialsToCreate) {
                const binId = serialToBinIdMap.get(sn) || null;
                if (!binGroups.has(binId)) binGroups.set(binId, []);
                binGroups.get(binId)!.push(sn);
              }

              for (const [binId, newSerials] of binGroups.entries()) {
                const addedInflowId = crypto.randomUUID().toLowerCase();
                const addedLine = await tx.inventoryAdjustmentLine.create({
                  data: {
                    inflowId: addedInflowId,
                    adjustmentId: adjustment.inflowId,
                    inventoryId: inventory.id,
                    productId,
                    locationId,
                    inventoryBinId: binId,
                    quantityBefore: currentOnHand, 
                    quantityAdjusted: newSerials.length,
                    quantityAfter: targetOnHand, 
                    quantityReserved: line.quantityReserved,
                    reason: (line.reason as InventoryAdjustmentLineReason) || null,
                    description: `Added ${newSerials.length} serial(s)`,
                  },
                });
                fallbackLineId = addedLine.id;

                newSerials.forEach(sn => serialAdjustmentLineMap.set(sn, addedLine.id));

                let sublocationName: string | null = null;
                if (binId) {
                  const matchedBin = bins.find(b => sublocationToBinMap.get(b.sublocationId) === binId);
                  if (matchedBin) {
                    const sub = await tx.sublocation.findUnique({ where: { id: matchedBin.sublocationId }, select: { name: true }});
                    sublocationName = sub?.name || null;
                  }
                }

                createdAdjustmentLines.push({
                  inflowId: addedLine.inflowId,
                  productId: line.productId,
                  quantityOnHand: targetOnHand,
                  quantityAdjusted: newSerials.length,
                  sublocation: sublocationName,
                  serials: newSerials,
                  description: line.description || `Added ${newSerials.length} serial(s)`,
                });
              }
            }

            // STEP C: Handle Pure Movements/Net Zero States
            if (serialsToDelete.length === 0 && serialsToCreate.length === 0) {
              const neutralInflowId = crypto.randomUUID().toLowerCase();
              const neutralLine = await tx.inventoryAdjustmentLine.create({
                data: {
                  inflowId: neutralInflowId,
                  adjustmentId: adjustment.inflowId,
                  inventoryId: inventory.id,
                  productId,
                  locationId,
                  inventoryBinId: null,
                  quantityBefore: currentOnHand,
                  quantityAdjusted: line.quantityAdjusted ?? netOnHandChange,
                  quantityAfter: targetOnHand,
                  quantityReserved: line.quantityReserved,
                  reason: (line.reason as InventoryAdjustmentLineReason) || null,
                  description: line.description || `Verified serials`,
                },
              });
              fallbackLineId = neutralLine.id;

              createdAdjustmentLines.push({
                inflowId: neutralLine.inflowId,
                productId: line.productId,
                quantityOnHand: targetOnHand,
                quantityAdjusted: line.quantityAdjusted ?? netOnHandChange,
                sublocation: null,
                serials: allIncomingSerials,
                description: line.description || undefined,
              });
            }

            // STEP D: Process Database Insertions and Movement Audits
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

              const lineId = serialAdjustmentLineMap.get(sn) || fallbackLineId!;
              serialAuditsToCreate.push({
                adjustmentLineId: lineId,
                inventoryBinItemId: newItem.id,
                serialNumber: sn,
                action: InventorySerialAdjustmentAction.ADD,
                fromInventoryBinId: null,
                toInventoryBinId: targetBinId,
              });
            }

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
                    adjustmentLineId: fallbackLineId!,
                    inventoryBinItemId: item.id,
                    serialNumber: sn,
                    action: InventorySerialAdjustmentAction.MOVE,
                    fromInventoryBinId: item.inventoryBinId,
                    toInventoryBinId: targetBinId,
                  });
                } else {
                  serialAuditsToCreate.push({
                    adjustmentLineId: fallbackLineId!,
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
        
          // } else {
          //   // SERIALIZED PATH
          //   const computedInflowId = crypto.randomUUID().toLowerCase();

          //   const createdLine = await tx.inventoryAdjustmentLine.create({
          //     data: {
          //       inflowId: computedInflowId,
          //       adjustmentId: adjustment.inflowId,
          //       inventoryId: inventory.id,
          //       productId,
          //       locationId,
          //       inventoryBinId: null,
          //       quantityBefore: currentOnHand,
          //       quantityAdjusted: line.quantityAdjusted ?? netOnHandChange,
          //       quantityAfter: targetOnHand,
          //       quantityReserved: line.quantityReserved,
          //       reason: (line.reason as InventoryAdjustmentLineReason) || null,
          //       description: line.description || null,
          //     },
          //   });

          //   const serialToBinIdMap = new Map<string, string | null>();
          //   const allIncomingSerials: string[] = [];

          //   (line.serials || []).forEach((s: string) => {
          //     const cleaned = s.trim();
          //     if (cleaned) {
          //       allIncomingSerials.push(cleaned);
          //       serialToBinIdMap.set(cleaned, null);
          //     }
          //   });

          //   // Map serial numbers inside bins
          //   for (const b of bins) {
          //     const binId = sublocationToBinMap.get(b.sublocationId) || null;
          //     if (Array.isArray(b.serials)) {
          //       for (const binSerial of b.serials) {
          //         const cleaned = binSerial.trim();
          //         if (cleaned) {
          //           if (!allIncomingSerials.includes(cleaned)) {
          //             allIncomingSerials.push(cleaned);
          //           }
          //           serialToBinIdMap.set(cleaned, binId);
          //         }
          //       }
          //     }
          //   }

          //   // Record bin & unallocated serial lines payload
          //   if (bins.length > 0) {
          //     const allocatedSerials = new Set<string>();

          //     for (const b of bins) {
          //       const sublocation = await tx.sublocation.findUnique({
          //         where: { id: b.sublocationId },
          //         select: { name: true },
          //       });

          //       const binSerials = (b.serials || []).map((s) => s.trim()).filter(Boolean);
          //       binSerials.forEach((s) => allocatedSerials.add(s));

          //       createdAdjustmentLines.push({
          //         inflowId: createdLine.inflowId,
          //         productId: line.productId,
          //         quantityOnHand: Number(b.quantity) || binSerials.length,
          //         quantityAdjusted: line.quantityAdjusted ?? binSerials.length,
          //         sublocation: sublocation?.name || null,
          //         serials: binSerials,
          //         description: line.description || undefined,
          //       });
          //     }

          //     const unallocatedSerials = allIncomingSerials.filter(
          //       (sn) => !allocatedSerials.has(sn)
          //     );

          //     if (unallocatedSerials.length > 0) {
          //       createdAdjustmentLines.push({
          //         inflowId: createdLine.inflowId,
          //         productId: line.productId,
          //         quantityOnHand: unallocatedSerials.length,
          //         quantityAdjusted: line.quantityAdjusted ?? unallocatedSerials.length,
          //         sublocation: null,
          //         serials: unallocatedSerials,
          //         description: line.description || undefined,
          //       });
          //     }
          //   } else {
          //     createdAdjustmentLines.push({
          //       inflowId: createdLine.inflowId,
          //       productId: line.productId,
          //       quantityOnHand: targetOnHand,
          //       quantityAdjusted: line.quantityAdjusted ?? netOnHandChange,
          //       sublocation: null,
          //       serials: allIncomingSerials,
          //       description: line.description || undefined,
          //     });
          //   }

          //   // Sync physical bin serials state (Insertions, Movements, Deletions)
          //   const existingSerials = await tx.inventoryBinItem.findMany({
          //     where: { productId, locationId },
          //   });

          //   const existingSerialMap = new Map(
          //     existingSerials.map((s) => [s.serialNumber, s])
          //   );
          //   const existingSerialNumbers = Array.from(existingSerialMap.keys());

          //   const serialsToCreate = allIncomingSerials.filter(
          //     (sn) => !existingSerialNumbers.includes(sn)
          //   );
          //   const serialsToDelete = existingSerials.filter(
          //     (s) =>
          //       !allIncomingSerials.includes(s.serialNumber) &&
          //       s.status === "IN_STOCK"
          //   );

          //   // 1. Additions
          //   for (const sn of serialsToCreate) {
          //     const targetBinId = serialToBinIdMap.get(sn) || null;
          //     const newItem = await tx.inventoryBinItem.create({
          //       data: {
          //         productId,
          //         locationId,
          //         inventoryBinId: targetBinId,
          //         serialNumber: sn,
          //         status: "IN_STOCK",
          //       },
          //     });

          //     serialAuditsToCreate.push({
          //       adjustmentLineId: createdLine.id,
          //       inventoryBinItemId: newItem.id,
          //       serialNumber: sn,
          //       action: InventorySerialAdjustmentAction.ADD,
          //       fromInventoryBinId: null,
          //       toInventoryBinId: targetBinId,
          //     });
          //   }

          //   // 2. Relocations & Audits
          //   for (const sn of allIncomingSerials) {
          //     if (existingSerialMap.has(sn)) {
          //       const item = existingSerialMap.get(sn)!;
          //       const targetBinId = serialToBinIdMap.get(sn) || null;

          //       if (item.inventoryBinId !== targetBinId) {
          //         await tx.inventoryBinItem.update({
          //           where: { id: item.id },
          //           data: { inventoryBinId: targetBinId },
          //         });

          //         serialAuditsToCreate.push({
          //           adjustmentLineId: createdLine.id,
          //           inventoryBinItemId: item.id,
          //           serialNumber: sn,
          //           action: InventorySerialAdjustmentAction.MOVE,
          //           fromInventoryBinId: item.inventoryBinId,
          //           toInventoryBinId: targetBinId,
          //         });
          //       } else {
          //         serialAuditsToCreate.push({
          //           adjustmentLineId: createdLine.id,
          //           inventoryBinItemId: item.id,
          //           serialNumber: sn,
          //           action: InventorySerialAdjustmentAction.VERIFY,
          //           fromInventoryBinId: targetBinId,
          //           toInventoryBinId: targetBinId,
          //         });
          //       }
          //     }
          //   }

          //   // 3. Deletions
          //   if (serialsToDelete.length > 0) {
          //     serialsToDelete.forEach((item) => {
          //       serialAuditsToCreate.push({
          //         adjustmentLineId: createdLine.id,
          //         inventoryBinItemId: null,
          //         serialNumber: item.serialNumber,
          //         action: InventorySerialAdjustmentAction.REMOVE,
          //         fromInventoryBinId: item.inventoryBinId,
          //         toInventoryBinId: null,
          //       });
          //     });

          //     await tx.inventoryBinItem.deleteMany({
          //       where: { id: { in: serialsToDelete.map((s) => s.id) } },
          //     });
          //   }
          // }
        }

        // Bulk insert transactional entries
        if (ledgerEntriesToCreate.length > 0) {
          await tx.inventoryLedger.createMany({ data: ledgerEntriesToCreate });
        }
        if (serialAuditsToCreate.length > 0) {
          await tx.inventoryAdjustmentSerial.createMany({ data: serialAuditsToCreate });
        }

        return {
          adjustment,
          createdAdjustmentLines,
        };
      },
      { timeout: 15000 }
    );

    // ----------------------------------------------------------------
    // 3. Dispatch Background Queue Job
    // ----------------------------------------------------------------
    if (this.queueProvider) {
      await this.dispatchBackgroundSync(result, payload);
    }

    return result;
  }

  private async dispatchBackgroundSync(
    result: ProcessedAdjustmentResult,
    payload: PostAdjustmentPayload
  ) {
    const inflowPayload = {
      stockAdjustmentId: result.adjustment.inflowId,
      adjustmentNumber: result.adjustment.adjustmentNumber,
      adjustmentReasonId: payload.reasonId || "",
      date: new Date().toISOString(),
      isCancelled: false,
      lastModifiedById: payload.performedById,
      locationId: payload.locationId,
      remarks: payload.remarks || "",
      lines: result.createdAdjustmentLines.map((createdLine) => {
        const qtyDelta = createdLine.quantityAdjusted ?? createdLine.quantityOnHand;
        return {
          stockAdjustmentLineId: createdLine.inflowId,
          productId: createdLine.productId,
          sublocation: createdLine.sublocation,
          quantity: {
            standardQuantity: qtyDelta > 0 ? `+${qtyDelta}` : String(qtyDelta),
            uomQuantity: qtyDelta > 0 ? `+${qtyDelta}` : String(qtyDelta),
            uom: "ea.",
            serialNumbers: createdLine.serials,
          },
          description: createdLine.description,
        };
      }),
    };

    await this.queueProvider?.addJob("stock_adjust_upsert", {
      source: "STOCK_ADJUST_UPSERT_CLOUD",
      model: "StockAdjustment",
      payload: inflowPayload,
      timestamp: new Date().toISOString(),
    });
  }

  private async generateAdjustmentNumber(tx: Prisma.TransactionClient, prefix: string = 'ADJ'): Promise<string> {
    const count = await tx.inventoryAdjustment.count();
    return `${prefix}-${String(count + 1).padStart(6, "0")}`;
  }
}


  // async postAdjustmentWithAdjustedReturn(payload: PostAdjustmentPayload): Promise<ProcessedAdjustmentResult> {
  //   const {
  //     existingAdjustmentId,
  //     reasonId,
  //     locationId,
  //     remarks,
  //     performedById,
  //     lines,
  //   } = payload;

  //   const result = await this.prisma.$transaction(
  //     async (tx) => {
  //       let adjustment: any;
  //       const createdAdjustmentLines: ProcessedAdjustmentResult["createdAdjustmentLines"] = [];

  //       // ----------------------------------------------------------------
  //       // 1. Header Validation & Upsert
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

  //         const existingLines = await tx.inventoryAdjustmentLine.findMany({
  //           where: { adjustmentId: existingAdjustmentId },
  //           select: { id: true },
  //         });
  //         const existingLineIds = existingLines.map((l) => l.id);

  //         if (existingLineIds.length > 0) {
  //           await tx.inventoryAdjustmentSerial.deleteMany({
  //             where: { adjustmentLineId: { in: existingLineIds } },
  //           });
  //           await tx.inventoryAdjustmentLineBin.deleteMany({
  //             where: { adjustmentLineId: { in: existingLineIds } },
  //           });
  //           await tx.inventoryAdjustmentLine.deleteMany({
  //             where: { adjustmentId: existingAdjustmentId },
  //           });
  //         }

  //         adjustment = await tx.inventoryAdjustment.update({
  //           where: { id: existingAdjustmentId },
  //           data: {
  //             adjustmentReasonId: reasonId || null,
  //             remarks: remarks || null,
  //             lastModifiedById: performedById,
  //             status: AdjustmentStatus.POSTED,
  //           },
  //         });
  //       } else {
  //         const adjustmentNumber = await this.generateAdjustmentNumber(tx);
  //         const computedInflowId = crypto.randomUUID().toLowerCase();

  //         adjustment = await tx.inventoryAdjustment.create({
  //           data: {
  //             inflowId: computedInflowId,
  //             adjustmentNumber,
  //             adjustmentReasonId: reasonId || null,
  //             performedById,
  //             status: AdjustmentStatus.POSTED,
  //             remarks: remarks || null,
  //           },
  //         });
  //       }

  //       // ----------------------------------------------------------------
  //       // 2. Commit Inventory, Bins, & Ledger Balances
  //       // ----------------------------------------------------------------
  //       const ledgerEntriesToCreate: Prisma.InventoryLedgerCreateManyInput[] = [];
  //       const serialAuditsToCreate: Prisma.InventoryAdjustmentSerialCreateManyInput[] = [];

  //       for (const line of lines) {
  //         const { productId, bins = [], trackSerials } = line;

  //         let inventory = await tx.inventory.findUnique({
  //           where: { productId_locationId: { productId, locationId } },
  //         });

  //         const targetOnHand = Number(line.quantityOnHand) || 0;
  //         const currentOnHand = inventory ? Number(inventory.quantityOnHand) : 0;
  //         const netOnHandChange = targetOnHand - currentOnHand;

  //         // Sync Header Inventory
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
  //               quantityReserved: Number(line.quantityReserved) || 0,
  //               quantityAvailable: Math.max(0, targetOnHand - currentReserved),
  //               lastCountedAt: new Date(),
  //               lastMovementAt: new Date(),
  //             },
  //           });
  //         }

  //         const sublocationToBinMap = new Map<string, string>();

  //         // Pre-sync/upsert bins to obtain IDs for both serialized and non-serialized paths
  //         for (const binData of bins) {
  //           if (!binData.sublocationId) continue;

  //           const targetBinQty = Number(binData.quantity) || 0;

  //           const existingBin = await tx.inventoryBin.findUnique({
  //             where: {
  //               inventoryId_sublocationId: {
  //                 inventoryId: inventory.id,
  //                 sublocationId: binData.sublocationId,
  //               },
  //             },
  //           });

  //           if (existingBin) {
  //             await tx.inventoryBin.update({
  //               where: { id: existingBin.id },
  //               data: { quantity: targetBinQty },
  //             });
  //             sublocationToBinMap.set(binData.sublocationId, existingBin.id);
  //           } else {
  //             const newBin = await tx.inventoryBin.create({
  //               data: {
  //                 inventoryId: inventory.id,
  //                 sublocationId: binData.sublocationId,
  //                 quantity: targetBinQty,
  //               },
  //             });
  //             sublocationToBinMap.set(binData.sublocationId, newBin.id);
  //           }
  //         }

  //         // NON-SERIALIZED PATH
  //         if (!trackSerials) {
  //           if (bins.length > 0) {
  //             for (const binData of bins) {
  //               if (!binData.sublocationId) continue;

  //               const sublocation = await tx.sublocation.findUnique({
  //                 where: { id: binData.sublocationId },
  //                 select: { name: true },
  //               });

  //               if (!sublocation?.name) continue;

  //               const targetBinQty = Number(binData.quantity) || 0;
  //               const binId = sublocationToBinMap.get(binData.sublocationId)!;
                
  //               // Find original bin quantity for exact calculation
  //               const prevBin = await tx.inventoryBin.findUnique({
  //                 where: { id: binId },
  //               });
  //               const prevBinQty = prevBin ? Number(prevBin.quantity) : 0;
  //               const binQuantityDiff = targetBinQty - prevBinQty;

  //               if (binQuantityDiff !== 0) {
  //                 ledgerEntriesToCreate.push({
  //                   productId,
  //                   locationId,
  //                   sublocationId: binData.sublocationId,
  //                   transactionType: "ADJUSTMENT",
  //                   referenceType: "ADJUSTMENT",
  //                   referenceId: adjustment.id,
  //                   performedById,
  //                   quantityChange: binQuantityDiff,
  //                   quantityBefore: prevBinQty,
  //                   quantityAfter: targetBinQty,
  //                   remarks:
  //                     remarks ||
  //                     `Stock Adjustment posted (${adjustment.adjustmentNumber})`,
  //                 });
  //               }

  //               const createdLine = await tx.inventoryAdjustmentLine.create({
  //                 data: {
  //                   inflowId: crypto.randomUUID().toLowerCase(),
  //                   adjustmentId: adjustment.inflowId, // Using header inflowId mapping
  //                   inventoryId: inventory.id,
  //                   productId,
  //                   locationId,
  //                   inventoryBinId: binId,
  //                   quantityBefore: prevBinQty,
  //                   quantityAdjusted: binQuantityDiff,
  //                   quantityAfter: targetBinQty,
  //                   quantityReserved: line.quantityReserved,
  //                   reason: (line.reason as InventoryAdjustmentLineReason) || null,
  //                   description: line.description || null,
  //                 },
  //               });

  //               createdAdjustmentLines.push({
  //                 inflowId: createdLine.inflowId,
  //                 productId: line.productId,
  //                 quantityOnHand: targetBinQty,
  //                 quantityAdjusted: binQuantityDiff, 
  //                 sublocation: sublocation.name,
  //                 serials: [],
  //                 description: line.description, 
  //               });
  //             }
  //           } else {
  //             // Location-wide adjustment (No bins)
  //             if (netOnHandChange !== 0) {
  //               ledgerEntriesToCreate.push({
  //                 productId,
  //                 locationId,
  //                 sublocationId: null,
  //                 transactionType: "ADJUSTMENT",
  //                 referenceType: "ADJUSTMENT",
  //                 referenceId: adjustment.id,
  //                 performedById,
  //                 quantityChange: netOnHandChange,
  //                 quantityBefore: currentOnHand,
  //                 quantityAfter: targetOnHand,
  //                 remarks:
  //                   remarks ||
  //                   `Stock Adjustment posted (${adjustment.adjustmentNumber})`,
  //               });
  //             }

  //             const createdLine = await tx.inventoryAdjustmentLine.create({
  //               data: {
  //                 inflowId: crypto.randomUUID().toLowerCase(),
  //                 adjustmentId: adjustment.inflowId,
  //                 inventoryId: inventory.id,
  //                 productId,
  //                 locationId,
  //                 inventoryBinId: null,
  //                 quantityBefore: currentOnHand,
  //                 quantityAdjusted: netOnHandChange,
  //                 quantityAfter: targetOnHand,
  //                 quantityReserved: line.quantityReserved,
  //                 reason: (line.reason as InventoryAdjustmentLineReason) || null,
  //                 description: line.description || null,
  //               },
  //             });

  //             createdAdjustmentLines.push({
  //               inflowId: createdLine.inflowId,
  //               productId: line.productId,
  //               quantityOnHand: targetOnHand,
  //               quantityAdjusted: netOnHandChange,
  //               sublocation: null,
  //               serials: [],
  //               description: line.description,
  //             });
  //           }
  //         } else {
  //           // SERIALIZED PATH
  //           const createdLine = await tx.inventoryAdjustmentLine.create({
  //             data: {
  //               inflowId: crypto.randomUUID().toLowerCase(),
  //               adjustmentId: adjustment.inflowId,
  //               inventoryId: inventory.id,
  //               productId,
  //               locationId,
  //               inventoryBinId: null,
  //               quantityBefore: currentOnHand,
  //               quantityAdjusted: netOnHandChange,
  //               quantityAfter: targetOnHand,
  //               quantityReserved: line.quantityReserved,
  //               reason: (line.reason as InventoryAdjustmentLineReason) || null,
  //               description: line.description || null,
  //             },
  //           });

  //           const serialToBinIdMap = new Map<string, string | null>();
  //           const allIncomingSerials: string[] = [];

  //           (line.serials || []).forEach((s: string) => {
  //             const cleaned = s.trim();
  //             if (cleaned) {
  //               allIncomingSerials.push(cleaned);
  //               serialToBinIdMap.set(cleaned, null);
  //             }
  //           });

  //           // Map serials to created/updated bins
  //           for (const b of bins) {
  //             const binId = sublocationToBinMap.get(b.sublocationId) || null;
  //             if (Array.isArray(b.serials)) {
  //               for (const binSerial of b.serials) {
  //                 const cleaned = binSerial.trim();
  //                 if (cleaned) {
  //                   if (!allIncomingSerials.includes(cleaned)) {
  //                     allIncomingSerials.push(cleaned);
  //                   }
  //                   serialToBinIdMap.set(cleaned, binId);
  //                 }
  //               }
  //             }
  //           }

  //           if (bins.length > 0) {
  //             const allocatedSerials = new Set<string>();

  //             for (const b of bins) {
  //               const sublocation = await tx.sublocation.findUnique({
  //                 where: { id: b.sublocationId },
  //                 select: { name: true },
  //               });

  //               const binSerials = (b.serials || []).map((s) => s.trim()).filter(Boolean);
  //               binSerials.forEach((s) => allocatedSerials.add(s));

  //               const targetQty = Number(b.quantity) || binSerials.length;

  //               createdAdjustmentLines.push({
  //                 inflowId: createdLine.inflowId,
  //                 productId: line.productId,
  //                 quantityOnHand: targetQty,
  //                 quantityAdjusted: binSerials.length, 
  //                 sublocation: sublocation?.name || null,
  //                 serials: binSerials,
  //                 description: line.description,
  //               });
  //             }

  //             const unallocatedSerials = allIncomingSerials.filter(
  //               (sn) => !allocatedSerials.has(sn)
  //             );

  //             if (unallocatedSerials.length > 0) {
  //               createdAdjustmentLines.push({
  //                 inflowId: createdLine.inflowId,
  //                 productId: line.productId,
  //                 quantityOnHand: unallocatedSerials.length,
  //                 quantityAdjusted: unallocatedSerials.length,
  //                 sublocation: null,
  //                 serials: unallocatedSerials,
  //                 description: line.description,
  //               });
  //             }
  //           } else {
  //             createdAdjustmentLines.push({
  //               inflowId: createdLine.inflowId,
  //               productId: line.productId,
  //               quantityOnHand: targetOnHand,
  //               quantityAdjusted: netOnHandChange,
  //               sublocation: null,
  //               serials: allIncomingSerials,
  //               description: line.description,
  //             });
  //           }

  //           // Sync physical bin serials state
  //           const existingSerials = await tx.inventoryBinItem.findMany({
  //             where: { productId, locationId },
  //           });

  //           const existingSerialMap = new Map(
  //             existingSerials.map((s) => [s.serialNumber, s])
  //           );
  //           const existingSerialNumbers = Array.from(existingSerialMap.keys());

  //           const serialsToCreate = allIncomingSerials.filter(
  //             (sn) => !existingSerialNumbers.includes(sn)
  //           );
  //           const serialsToDelete = existingSerials.filter(
  //             (s) =>
  //               !allIncomingSerials.includes(s.serialNumber) &&
  //               s.status === "IN_STOCK"
  //           );

  //           // 1. Additions
  //           for (const sn of serialsToCreate) {
  //             const targetBinId = serialToBinIdMap.get(sn) || null;
  //             const newItem = await tx.inventoryBinItem.create({
  //               data: {
  //                 productId,
  //                 locationId,
  //                 inventoryBinId: targetBinId,
  //                 serialNumber: sn,
  //                 status: "IN_STOCK",
  //               },
  //             });

  //             serialAuditsToCreate.push({
  //               adjustmentLineId: createdLine.id,
  //               inventoryBinItemId: newItem.id,
  //               serialNumber: sn,
  //               action: InventorySerialAdjustmentAction.ADD,
  //               fromInventoryBinId: null,
  //               toInventoryBinId: targetBinId,
  //             });
  //           }

  //           // 2. Relocations & Audits
  //           for (const sn of allIncomingSerials) {
  //             if (existingSerialMap.has(sn)) {
  //               const item = existingSerialMap.get(sn)!;
  //               const targetBinId = serialToBinIdMap.get(sn) || null;

  //               if (item.inventoryBinId !== targetBinId) {
  //                 await tx.inventoryBinItem.update({
  //                   where: { id: item.id },
  //                   data: { inventoryBinId: targetBinId },
  //                 });

  //                 serialAuditsToCreate.push({
  //                   adjustmentLineId: createdLine.id,
  //                   inventoryBinItemId: item.id,
  //                   serialNumber: sn,
  //                   action: InventorySerialAdjustmentAction.MOVE,
  //                   fromInventoryBinId: item.inventoryBinId,
  //                   toInventoryBinId: targetBinId,
  //                 });
  //               } else {
  //                 serialAuditsToCreate.push({
  //                   adjustmentLineId: createdLine.id,
  //                   inventoryBinItemId: item.id,
  //                   serialNumber: sn,
  //                   action: InventorySerialAdjustmentAction.VERIFY,
  //                   fromInventoryBinId: targetBinId,
  //                   toInventoryBinId: targetBinId,
  //                 });
  //               }
  //             }
  //           }

  //           // 3. Deletions
  //           if (serialsToDelete.length > 0) {
  //             serialsToDelete.forEach((item) => {
  //               serialAuditsToCreate.push({
  //                 adjustmentLineId: createdLine.id,
  //                 inventoryBinItemId: null,
  //                 serialNumber: item.serialNumber,
  //                 action: InventorySerialAdjustmentAction.REMOVE,
  //                 fromInventoryBinId: item.inventoryBinId,
  //                 toInventoryBinId: null,
  //               });
  //             });

  //             await tx.inventoryBinItem.deleteMany({
  //               where: { id: { in: serialsToDelete.map((s) => s.id) } },
  //             });
  //           }
  //         }
  //       }

  //       if (ledgerEntriesToCreate.length > 0) {
  //         await tx.inventoryLedger.createMany({ data: ledgerEntriesToCreate });
  //       }
  //       if (serialAuditsToCreate.length > 0) {
  //         await tx.inventoryAdjustmentSerial.createMany({ data: serialAuditsToCreate });
  //       }

  //       // ✅ Updated return block strictly mapped to ProcessedAdjustmentResult
  //       return {
  //         adjustment: {
  //           id: adjustment.id,
  //           inflowId: adjustment.inflowId,
  //           adjustmentNumber: adjustment.adjustmentNumber,
  //         },
  //         createdAdjustmentLines,
  //       };
  //     },
  //     { timeout: 15000 }
  //   );

  //   if (this.queueProvider) {
  //     await this.dispatchBackgroundSync(result, payload);
  //   }

  //   return result;
  // }

  // async postAdjustmentWithAdjustedReturn(payload: PostAdjustmentPayload): Promise<ProcessedAdjustmentResult> {
  //   const {
  //     existingAdjustmentId,
  //     reasonId,
  //     locationId,
  //     remarks,
  //     performedById,
  //     lines,
  //   } = payload;

  //   const result = await this.prisma.$transaction(
  //     async (tx) => {
  //       let adjustment: any;
  //       const createdAdjustmentLines: ProcessedAdjustmentResult["createdAdjustmentLines"] = [];

  //       // ----------------------------------------------------------------
  //       // 1. Header Validation & Upsert
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

  //         const existingLines = await tx.inventoryAdjustmentLine.findMany({
  //           where: { adjustmentId: existingAdjustmentId },
  //           select: { id: true },
  //         });
  //         const existingLineIds = existingLines.map((l) => l.id);

  //         if (existingLineIds.length > 0) {
  //           await tx.inventoryAdjustmentSerial.deleteMany({
  //             where: { adjustmentLineId: { in: existingLineIds } },
  //           });
  //           await tx.inventoryAdjustmentLineBin.deleteMany({
  //             where: { adjustmentLineId: { in: existingLineIds } },
  //           });
  //           await tx.inventoryAdjustmentLine.deleteMany({
  //             where: { adjustmentId: existingAdjustmentId },
  //           });
  //         }

  //         adjustment = await tx.inventoryAdjustment.update({
  //           where: { id: existingAdjustmentId },
  //           data: {
  //             adjustmentReasonId: reasonId || null,
  //             remarks: remarks || null,
  //             lastModifiedById: performedById,
  //             status: AdjustmentStatus.POSTED,
  //           },
  //         });
  //       } else {
  //         const adjustmentNumber = await this.generateAdjustmentNumber(tx);
  //         const computedInflowId = crypto.randomUUID().toLowerCase();

  //         adjustment = await tx.inventoryAdjustment.create({
  //           data: {
  //             inflowId: computedInflowId,
  //             adjustmentNumber,
  //             adjustmentReasonId: reasonId || null,
  //             performedById,
  //             status: AdjustmentStatus.POSTED,
  //             remarks: remarks || null,
  //           },
  //         });
  //       }

  //       // ----------------------------------------------------------------
  //       // 2. Commit Inventory, Bins, & Ledger Balances
  //       // ----------------------------------------------------------------
  //       const ledgerEntriesToCreate: Prisma.InventoryLedgerCreateManyInput[] = [];
  //       const serialAuditsToCreate: Prisma.InventoryAdjustmentSerialCreateManyInput[] = [];

  //       for (const line of lines) {
  //         const { productId, bins = [], trackSerials } = line;

  //         let inventory = await tx.inventory.findUnique({
  //           where: { productId_locationId: { productId, locationId } },
  //         });

  //         const targetOnHand = Number(line.quantityOnHand) || 0;
  //         const currentOnHand = inventory ? Number(inventory.quantityOnHand) : 0;
  //         const netOnHandChange = targetOnHand - currentOnHand;

  //         // Sync Header Inventory
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
  //               quantityReserved: Number(line.quantityReserved) || 0,
  //               quantityAvailable: Math.max(0, targetOnHand - currentReserved),
  //               lastCountedAt: new Date(),
  //               lastMovementAt: new Date(),
  //             },
  //           });
  //         }

  //         const sublocationToBinMap = new Map<string, string>();

  //         // Pre-sync/upsert bins to obtain IDs for both serialized and non-serialized paths
  //         for (const binData of bins) {
  //           if (!binData.sublocationId) continue;

  //           const targetBinQty = Number(binData.quantity) || 0;

  //           const existingBin = await tx.inventoryBin.findUnique({
  //             where: {
  //               inventoryId_sublocationId: {
  //                 inventoryId: inventory.id,
  //                 sublocationId: binData.sublocationId,
  //               },
  //             },
  //           });

  //           if (existingBin) {
  //             await tx.inventoryBin.update({
  //               where: { id: existingBin.id },
  //               data: { quantity: targetBinQty },
  //             });
  //             sublocationToBinMap.set(binData.sublocationId, existingBin.id);
  //           } else {
  //             const newBin = await tx.inventoryBin.create({
  //               data: {
  //                 inventoryId: inventory.id,
  //                 sublocationId: binData.sublocationId,
  //                 quantity: targetBinQty,
  //               },
  //             });
  //             sublocationToBinMap.set(binData.sublocationId, newBin.id);
  //           }
  //         }

  //         // NON-SERIALIZED PATH
  //         if (!trackSerials) {
  //           if (bins.length > 0) {
  //             for (const binData of bins) {
  //               if (!binData.sublocationId) continue;

  //               const sublocation = await tx.sublocation.findUnique({
  //                 where: { id: binData.sublocationId },
  //                 select: { name: true },
  //               });

  //               if (!sublocation?.name) continue;

  //               const targetBinQty = Number(binData.quantity) || 0;
  //               const binId = sublocationToBinMap.get(binData.sublocationId)!;
                
  //               // Find original bin quantity for exact calculation
  //               const prevBin = await tx.inventoryBin.findUnique({
  //                 where: { id: binId },
  //               });
  //               const prevBinQty = prevBin ? Number(prevBin.quantity) : 0;
  //               const binQuantityDiff = targetBinQty - prevBinQty;

  //               if (binQuantityDiff !== 0) {
  //                 ledgerEntriesToCreate.push({
  //                   productId,
  //                   locationId,
  //                   sublocationId: binData.sublocationId,
  //                   transactionType: "ADJUSTMENT",
  //                   referenceType: "ADJUSTMENT",
  //                   referenceId: adjustment.id,
  //                   performedById,
  //                   quantityChange: binQuantityDiff,
  //                   quantityBefore: prevBinQty,
  //                   quantityAfter: targetBinQty,
  //                   remarks:
  //                     remarks ||
  //                     `Stock Adjustment posted (${adjustment.adjustmentNumber})`,
  //                 });
  //               }

  //               const createdLine = await tx.inventoryAdjustmentLine.create({
  //                 data: {
  //                   inflowId: crypto.randomUUID().toLowerCase(),
  //                   adjustmentId: adjustment.inflowId,
  //                   inventoryId: inventory.id,
  //                   productId,
  //                   locationId,
  //                   inventoryBinId: binId,
  //                   quantityBefore: prevBinQty,
  //                   quantityAdjusted: binQuantityDiff,
  //                   quantityAfter: targetBinQty,
  //                   quantityReserved: line.quantityReserved,
  //                   reason: (line.reason as InventoryAdjustmentLineReason) || null,
  //                   description: line.description || null,
  //                 },
  //               });

  //               createdAdjustmentLines.push({
  //                 inflowId: createdLine.inflowId,
  //                 productId: line.productId,
  //                 quantityOnHand: targetBinQty,
  //                 quantityAdjusted: binQuantityDiff, // ✅ Accurate Bin Delta
  //                 sublocation: sublocation.name,
  //                 serials: [],
  //                 description: line.description, // ✅ Propagated description
  //               });
  //             }
  //           } else {
  //             // Location-wide adjustment (No bins)
  //             if (netOnHandChange !== 0) {
  //               ledgerEntriesToCreate.push({
  //                 productId,
  //                 locationId,
  //                 sublocationId: null,
  //                 transactionType: "ADJUSTMENT",
  //                 referenceType: "ADJUSTMENT",
  //                 referenceId: adjustment.id,
  //                 performedById,
  //                 quantityChange: netOnHandChange,
  //                 quantityBefore: currentOnHand,
  //                 quantityAfter: targetOnHand,
  //                 remarks:
  //                   remarks ||
  //                   `Stock Adjustment posted (${adjustment.adjustmentNumber})`,
  //               });
  //             }

  //             const createdLine = await tx.inventoryAdjustmentLine.create({
  //               data: {
  //                 inflowId: crypto.randomUUID().toLowerCase(),
  //                 adjustmentId: adjustment.inflowId,
  //                 inventoryId: inventory.id,
  //                 productId,
  //                 locationId,
  //                 inventoryBinId: null,
  //                 quantityBefore: currentOnHand,
  //                 quantityAdjusted: netOnHandChange,
  //                 quantityAfter: targetOnHand,
  //                 quantityReserved: line.quantityReserved,
  //                 reason: (line.reason as InventoryAdjustmentLineReason) || null,
  //                 description: line.description || null,
  //               },
  //             });

  //             createdAdjustmentLines.push({
  //               inflowId: createdLine.inflowId,
  //               productId: line.productId,
  //               quantityOnHand: targetOnHand,
  //               quantityAdjusted: netOnHandChange,
  //               sublocation: null,
  //               serials: [],
  //               description: line.description,
  //             });
  //           }
  //         } else {
  //           // SERIALIZED PATH
  //           const createdLine = await tx.inventoryAdjustmentLine.create({
  //             data: {
  //               inflowId: crypto.randomUUID().toLowerCase(),
  //               adjustmentId: adjustment.inflowId,
  //               inventoryId: inventory.id,
  //               productId,
  //               locationId,
  //               inventoryBinId: null,
  //               quantityBefore: currentOnHand,
  //               quantityAdjusted: netOnHandChange,
  //               quantityAfter: targetOnHand,
  //               quantityReserved: line.quantityReserved,
  //               reason: (line.reason as InventoryAdjustmentLineReason) || null,
  //               description: line.description || null,
  //             },
  //           });

  //           const serialToBinIdMap = new Map<string, string | null>();
  //           const allIncomingSerials: string[] = [];

  //           (line.serials || []).forEach((s: string) => {
  //             const cleaned = s.trim();
  //             if (cleaned) {
  //               allIncomingSerials.push(cleaned);
  //               serialToBinIdMap.set(cleaned, null);
  //             }
  //           });

  //           // Map serials to created/updated bins
  //           for (const b of bins) {
  //             const binId = sublocationToBinMap.get(b.sublocationId) || null;
  //             if (Array.isArray(b.serials)) {
  //               for (const binSerial of b.serials) {
  //                 const cleaned = binSerial.trim();
  //                 if (cleaned) {
  //                   if (!allIncomingSerials.includes(cleaned)) {
  //                     allIncomingSerials.push(cleaned);
  //                   }
  //                   serialToBinIdMap.set(cleaned, binId);
  //                 }
  //               }
  //             }
  //           }

  //           if (bins.length > 0) {
  //             const allocatedSerials = new Set<string>();

  //             for (const b of bins) {
  //               const sublocation = await tx.sublocation.findUnique({
  //                 where: { id: b.sublocationId },
  //                 select: { name: true },
  //               });

  //               const binSerials = (b.serials || []).map((s) => s.trim()).filter(Boolean);
  //               binSerials.forEach((s) => allocatedSerials.add(s));

  //               // Compute actual delta for serialized bin
  //               const targetQty = Number(b.quantity) || binSerials.length;

  //               createdAdjustmentLines.push({
  //                 inflowId: createdLine.inflowId,
  //                 productId: line.productId,
  //                 quantityOnHand: targetQty,
  //                 quantityAdjusted: binSerials.length, // ✅ Bin specific count/delta
  //                 sublocation: sublocation?.name || null,
  //                 serials: binSerials,
  //                 description: line.description,
  //               });
  //             }

  //             const unallocatedSerials = allIncomingSerials.filter(
  //               (sn) => !allocatedSerials.has(sn)
  //             );

  //             if (unallocatedSerials.length > 0) {
  //               createdAdjustmentLines.push({
  //                 inflowId: createdLine.inflowId,
  //                 productId: line.productId,
  //                 quantityOnHand: unallocatedSerials.length,
  //                 quantityAdjusted: unallocatedSerials.length,
  //                 sublocation: null,
  //                 serials: unallocatedSerials,
  //                 description: line.description,
  //               });
  //             }
  //           } else {
  //             createdAdjustmentLines.push({
  //               inflowId: createdLine.inflowId,
  //               productId: line.productId,
  //               quantityOnHand: targetOnHand,
  //               quantityAdjusted: netOnHandChange,
  //               sublocation: null,
  //               serials: allIncomingSerials,
  //               description: line.description,
  //             });
  //           }

  //           // Sync physical bin serials state
  //           const existingSerials = await tx.inventoryBinItem.findMany({
  //             where: { productId, locationId },
  //           });

  //           const existingSerialMap = new Map(
  //             existingSerials.map((s) => [s.serialNumber, s])
  //           );
  //           const existingSerialNumbers = Array.from(existingSerialMap.keys());

  //           const serialsToCreate = allIncomingSerials.filter(
  //             (sn) => !existingSerialNumbers.includes(sn)
  //           );
  //           const serialsToDelete = existingSerials.filter(
  //             (s) =>
  //               !allIncomingSerials.includes(s.serialNumber) &&
  //               s.status === "IN_STOCK"
  //           );

  //           // 1. Additions
  //           for (const sn of serialsToCreate) {
  //             const targetBinId = serialToBinIdMap.get(sn) || null;
  //             const newItem = await tx.inventoryBinItem.create({
  //               data: {
  //                 productId,
  //                 locationId,
  //                 inventoryBinId: targetBinId,
  //                 serialNumber: sn,
  //                 status: "IN_STOCK",
  //               },
  //             });

  //             serialAuditsToCreate.push({
  //               adjustmentLineId: createdLine.id,
  //               inventoryBinItemId: newItem.id,
  //               serialNumber: sn,
  //               action: InventorySerialAdjustmentAction.ADD,
  //               fromInventoryBinId: null,
  //               toInventoryBinId: targetBinId,
  //             });
  //           }

  //           // 2. Relocations & Audits
  //           for (const sn of allIncomingSerials) {
  //             if (existingSerialMap.has(sn)) {
  //               const item = existingSerialMap.get(sn)!;
  //               const targetBinId = serialToBinIdMap.get(sn) || null;

  //               if (item.inventoryBinId !== targetBinId) {
  //                 await tx.inventoryBinItem.update({
  //                   where: { id: item.id },
  //                   data: { inventoryBinId: targetBinId },
  //                 });

  //                 serialAuditsToCreate.push({
  //                   adjustmentLineId: createdLine.id,
  //                   inventoryBinItemId: item.id,
  //                   serialNumber: sn,
  //                   action: InventorySerialAdjustmentAction.MOVE,
  //                   fromInventoryBinId: item.inventoryBinId,
  //                   toInventoryBinId: targetBinId,
  //                 });
  //               } else {
  //                 serialAuditsToCreate.push({
  //                   adjustmentLineId: createdLine.id,
  //                   inventoryBinItemId: item.id,
  //                   serialNumber: sn,
  //                   action: InventorySerialAdjustmentAction.VERIFY,
  //                   fromInventoryBinId: targetBinId,
  //                   toInventoryBinId: targetBinId,
  //                 });
  //               }
  //             }
  //           }

  //           // 3. Deletions
  //           if (serialsToDelete.length > 0) {
  //             serialsToDelete.forEach((item) => {
  //               serialAuditsToCreate.push({
  //                 adjustmentLineId: createdLine.id,
  //                 inventoryBinItemId: null,
  //                 serialNumber: item.serialNumber,
  //                 action: InventorySerialAdjustmentAction.REMOVE,
  //                 fromInventoryBinId: item.inventoryBinId,
  //                 toInventoryBinId: null,
  //               });
  //             });

  //             await tx.inventoryBinItem.deleteMany({
  //               where: { id: { in: serialsToDelete.map((s) => s.id) } },
  //             });
  //           }
  //         }
  //       }

  //       if (ledgerEntriesToCreate.length > 0) {
  //         await tx.inventoryLedger.createMany({ data: ledgerEntriesToCreate });
  //       }
  //       if (serialAuditsToCreate.length > 0) {
  //         await tx.inventoryAdjustmentSerial.createMany({ data: serialAuditsToCreate });
  //       }

  //       return {
  //         adjustment,
  //         createdAdjustmentLines,
  //       };
  //     },
  //     { timeout: 15000 }
  //   );

  //   if (this.queueProvider) {
  //     await this.dispatchBackgroundSync(result, payload);
  //   }

  //   return result;
  // }

// Sample Usage
// import { NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";
// import { getMidSyncQueue } from "@/lib/queue";
// import { AdjustmentService } from "@/services/adjustment.service";

// export async function POST(req: Request) {
//   try {
//     const body = await req.json();
//     const { id, reasonId, locationId, remarks, lines } = body;

//     // Optional queue wrapper to inject
//     const queueProvider = {
//       addJob: async (jobName: string, payload: any) => {
//         const queue = getMidSyncQueue();
//         await queue.add(jobName, payload);
//       },
//     };

//     const adjustmentService = new AdjustmentService(prisma, queueProvider);

//     const result = await adjustmentService.postAdjustment({
//       existingAdjustmentId: id,
//       reasonId,
//       locationId,
//       remarks,
//       performedById: "56bfcf3b-3e98-4098-ae8f-2adcb657cb57", // Extract from auth session
//       lines,
//     });

//     return NextResponse.json(
//       {
//         message: "Adjustment posted successfully.",
//         data: result,
//       },
//       { status: 200 }
//     );
//   } catch (error: any) {
//     console.error("[INVENTORY_ADJUSTMENT_POST_ERROR]", error);
//     return NextResponse.json(
//       { error: error.message || "An error occurred while posting the adjustment." },
//       { status: 500 }
//     );
//   }
// }