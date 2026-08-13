import { PrismaClient, Prisma } from "@/generated/prisma/client";

// Replace with your actual project imports/enums
import {
  AdjustmentStatus,
  InventoryAdjustmentLineReason,
  InventorySerialAdjustmentAction,
} from "@/generated/prisma/client";

export interface StockAdjustmentBinInput {
  sublocationId: string;
  quantity: number;
  serials?: string[];
}

export type SyncAdjustmentLine = StockAdjustmentLineInput & {
  description?: string;
};

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
}

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

  /**
   * Posts and commits an inventory adjustment directly to ledger and physical balances.
   */
  async postAdjustment(payload: PostAdjustmentPayload): Promise<ProcessedAdjustmentResult> {
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
          const adjustmentNumber = await this.generateAdjustmentNumber(tx);
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

          // non-serialized vs serialized line persistence
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
                    description: line.description || null
                  },
                });

                createdAdjustmentLines.push({
                  inflowId: createdLine.inflowId,
                  productId: line.productId,
                  quantityOnHand: targetBinQty,
                  sublocation: sublocation.name,
                  serials: [],
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
                  quantityAdjusted: netOnHandChange,
                  quantityAfter: targetOnHand,
                  quantityReserved: line.quantityReserved,
                  reason: (line.reason as InventoryAdjustmentLineReason) || null,
                  description: line.description || null
                },
              });

              createdAdjustmentLines.push({
                inflowId: createdLine.inflowId,
                productId: line.productId,
                quantityOnHand: Number(line.quantityOnHand) || 0,
                sublocation: null,
                serials: [],
              });
            }
          } else {
            // SERIALIZED PATH
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
                quantityAdjusted: netOnHandChange,
                quantityAfter: targetOnHand,
                quantityReserved: line.quantityReserved,
                reason: (line.reason as InventoryAdjustmentLineReason) || null,
                description: line.description || null
              },
            });

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

            // Record bin & unallocated serial lines payload
            if (bins.length > 0) {
              const allocatedSerials = new Set<string>();

              for (const b of bins) {
                const sublocation = await tx.sublocation.findUnique({
                  where: { id: b.sublocationId },
                  select: { name: true },
                });

                const binSerials = (b.serials || []).map((s) => s.trim()).filter(Boolean);
                binSerials.forEach((s) => allocatedSerials.add(s));

                createdAdjustmentLines.push({
                  inflowId: createdLine.inflowId,
                  productId: line.productId,
                  quantityOnHand: Number(b.quantity) || binSerials.length,
                  sublocation: sublocation?.name || null,
                  serials: binSerials,
                });
              }

              const unallocatedSerials = allIncomingSerials.filter(
                (sn) => !allocatedSerials.has(sn)
              );

              if (unallocatedSerials.length > 0) {
                createdAdjustmentLines.push({
                  inflowId: createdLine.inflowId,
                  productId: line.productId,
                  quantityOnHand: unallocatedSerials.length,
                  sublocation: null,
                  serials: unallocatedSerials,
                });
              }
            } else {
              createdAdjustmentLines.push({
                inflowId: createdLine.inflowId,
                productId: line.productId,
                quantityOnHand: Number(line.quantityOnHand) || 0,
                sublocation: null,
                serials: allIncomingSerials,
              });
            }

            // Sync physical bin serials state (Insertions, Movements, Deletions)
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

            // 1. Additions
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

            // 2. Relocations & Audits
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

            // 3. Deletions
            if (serialsToDelete.length > 0) {
              serialsToDelete.forEach((item) => {
                serialAuditsToCreate.push({
                  adjustmentLineId: createdLine.id,
                  inventoryBinItemId: null,
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
          }
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
      lines: result.createdAdjustmentLines.map((createdLine) => ({
        stockAdjustmentLineId: createdLine.inflowId,
        productId: createdLine.productId,
        sublocation: createdLine.sublocation,
        quantity: {
          standardQuantity: String(createdLine.quantityOnHand),
          uomQuantity: String(createdLine.quantityOnHand),
          uom: "ea.",
          serialNumbers: createdLine.serials,
        },
        description: createdLine.description
      })),
    };

    await this.queueProvider?.addJob("stock_adjust_upsert", {
      source: "STOCK_ADJUST_UPSERT_CLOUD",
      model: "StockAdjustment",
      payload: inflowPayload,
      timestamp: new Date().toISOString(),
    });
  }

  private async generateAdjustmentNumber(tx: Prisma.TransactionClient): Promise<string> {
    const count = await tx.inventoryAdjustment.count();
    return `ADJ-${String(count + 1).padStart(6, "0")}`;
  }
}

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