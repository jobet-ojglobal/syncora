import { prisma } from "@/lib/prisma";
import {
  InflowStockAdjustInput,
  InflowStockAdjustmentLine,
} from "@/lib/inflow/types";
import { Prisma } from "@/generated/prisma/client";
import { SyncOptions } from "@/lib/workers/sync.worker";
import { upsertStockAdjustBulk } from "../data/inventory";
import crypto from "crypto";

type DbClient = Prisma.TransactionClient;

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
};

export type LocalProductWithRelations = Prisma.ProductGetPayload<{
  include: {
    // Unassigned floor serials attached directly to Product
    inventoryBinItems: true;
    inventories: {
      include: {
        location: {
          select: {
            inflowId: true;
            name: true;
            isActive: true;
            isDefault: true;
          };
        };
        bins: {
          include: {
            sublocation: true;
            inventoryBinItems: true; // Serial items assigned to specific bins
          };
        };
      };
    };
  };
}>;

export class InventoryCloudSyncService {
  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Utility helper to format milliseconds into readable output (e.g., "450ms" or "2.34s")
   */
  private formatDuration(ms: number): string {
    return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`;
  }


  async getProducts(
    db: DbClient | typeof prisma = prisma,
    locationId: string,
    selectedSublocationIds?: Set<string> | null,
    take: number = 30,
    excludeIds: string[] = []
  ): Promise<LocalProductWithRelations[]> {
    const sublocationsFilter =
      selectedSublocationIds && selectedSublocationIds.size > 0
        ? { sublocationId: { in: Array.from(selectedSublocationIds) } }
        : undefined;

    const whereClause: Prisma.ProductWhereInput = {
      deletedAt: null,
      isActive: true,
      isCloudSynced: true,
      ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
      inventories: {
        some: {
          locationId,
          ...(sublocationsFilter
            ? {
                bins: {
                  some: sublocationsFilter,
                },
              }
            : {}),
        },
      },
    };

    const products = await db.product.findMany({
      where: whereClause,
      take,
      orderBy: { createdAt: "asc" },
      include: {
        // 1. Fetch unassigned floor serial items directly on Product
        inventoryBinItems: {
          where: {
            locationId,
            inventoryBinId: null, // Floor serials have no bin assignment
            status: "IN_STOCK",
          },
        },
        // 2. Fetch inventories & bin-assigned serials
        inventories: {
          where: { locationId },
          include: {
            bins: {
              where: sublocationsFilter,
              include: {
                sublocation: true,
                inventoryBinItems: true, // Bin serials
              },
            },
            location: {
              select: {
                inflowId: true,
                name: true,
                isActive: true,
                isDefault: true,
              },
            },
          },
        },
      },
    });

    return products;
  }

  async processBatchBulk(
    products: LocalProductWithRelations[],
    checkSignal?: () => Promise<void>,
    batchNo: number = 0,
    reasonId?: string,
    locationId?: string
  ): Promise<{
    successfulIds: string[];
    failedIds: string[];
  }> {
    const batchStartTime = performance.now();
    const modifiedById = "56bfcf3b-3e98-4098-ae8f-2adcb657cb57";

    const batchLines: InflowStockAdjustmentLine[] = [];
    const processedProductIds: string[] = [];
    let targetLocationInflowId: string | null = null;

    // --- Phase A: Map Local Bin & Floor Inventory Lines ---
    for (const product of products) {
      if (checkSignal) await checkSignal();

      if (!product.inflowId) continue;

      // if(product.name === "FUJIFILM X100VI BLACK") continue;

      let productIncluded = false;

      for (const inv of product.inventories) {
        if (!targetLocationInflowId) {
          targetLocationInflowId = inv.location?.inflowId || locationId || inv.locationId;
        }

        // if (product.trackSerials) continue;

        let totalBinQty = 0;

        // 1. Process explicit bin stock
        for (const bin of inv.bins) {
          const binQty = Number(bin.quantity) || 0;
          totalBinQty += binQty;

          const binSerials =
            bin.inventoryBinItems?.map((item) => item.serialNumber).filter(Boolean) || [];

          const stockAdjLineInflowId = crypto.randomUUID().toLowerCase();

          if (binQty > 0) {
            const binAdjustmentLine: InflowStockAdjustmentLine = {
              productId: product.inflowId,
              stockAdjustmentLineId: stockAdjLineInflowId,
              quantity: {
                standardQuantity: String(binQty),
                uomQuantity: String(binQty),
                uom: product.standardUomName || "ea.",
                serialNumbers: binSerials,
              },
              sublocation: bin.sublocation?.name || "",
              description: `Location sync adjustment for ${product.name}`,
            };

            batchLines.push(binAdjustmentLine);
            productIncluded = true;
          }
        }

        // 2. Process floor stock (Quantity not assigned to any bin)
        const totalOnHand = Number(inv.quantityOnHand) || 0;
        const floorQty = totalOnHand - totalBinQty;

        // if (floorQty > 0) {
        if (inv.bins.length === 0 || floorQty > 0) {
          const stockAdjLineInflowId = crypto.randomUUID().toLowerCase();
          const floorSerials = product.inventoryBinItems
            ?.map((item) => item.serialNumber)
            .filter(Boolean) || [];


          const floorAdjustmentLine: InflowStockAdjustmentLine = {
            productId: product.inflowId,
            stockAdjustmentLineId: stockAdjLineInflowId,
            quantity: {
              standardQuantity: String(floorQty),
              uomQuantity: String(floorQty),
              uom: product.standardUomName || "ea.",
              serialNumbers: floorSerials,
            },
            sublocation: "", // Floor stock has no sublocation
            description: `Floor stock sync adjustment for ${product.name}`,
          };

          batchLines.push(floorAdjustmentLine);
          productIncluded = true;
        }
      }

      if (productIncluded) {
        processedProductIds.push(product.id);
      }
    }

    // --- Phase B: Build Single InFlow Stock Adjust Input Payload ---
    const successfulIds: string[] = [];
    const failedIds: string[] = [];
    const timestamp = new Date().toISOString().slice(-6);

    if (batchLines.length > 0) {
      const singleAdjustPayload: InflowStockAdjustInput = {
        stockAdjustmentId: crypto.randomUUID(),
        adjustmentNumber: `SYNC-${batchNo + 1}-${timestamp}`,
        adjustmentReasonId: reasonId || "",
        date: new Date().toISOString(),
        isCancelled: false,
        lastModifiedById: modifiedById,
        locationId: targetLocationInflowId || locationId || "",
        remarks: `Batch Sync #${batchNo + 1} Inventory Adjustment`,
        lines: batchLines,
      };

      try {
        console.log(
          `[Inventory Sync] Dispatching batch #${batchNo + 1} payload (${batchLines.length} lines, ${processedProductIds.length} products) to inFlow...`
        );

        await upsertStockAdjustBulk([singleAdjustPayload]);

        console.log(`[Inventory Sync] Bulk inFlow sync successful for batch #${batchNo + 1}.`);
        successfulIds.push(...processedProductIds);
      } catch (error) {
        console.error(`[Inventory Sync] Failed bulk dispatch to inFlow for batch #${batchNo + 1}:`, error);
        failedIds.push(...products.map((p) => p.id));
      }
    } else {
      successfulIds.push(...products.map((p) => p.id));
    }

    const batchDuration = performance.now() - batchStartTime;
    console.log(`[Product Sync] Batch #${batchNo + 1} finished in ${this.formatDuration(batchDuration)}`);

    return { successfulIds, failedIds };
  }

  async sync(
    options: SyncOptions,
    locationId: string,
    selectedRecords?: string[],
    syncedAll?: boolean
  ) {
    const syncStartTime = performance.now();
    const { onProgress, checkSignal } = options;
    const BATCH_SIZE = options?.batchSize ?? 200;
    const INTER_BATCH_DELAY = options?.delayBetweenBatchesMs ?? 1000;

    const defaultCategory = await prisma.category.findFirst({
      where: { isDefault: true },
      select: { inflowId: true, name: true, isDefault: true },
    });

    if (!defaultCategory) {
      console.error("[InventoryCloudSyncService] Sync aborted: Default category not found.");
      return { productsProcessed: 0, syncedAt: new Date().toISOString() };
    }

    const reason = await prisma.adjustmentReason.findFirst({
      where: { name: { contains: "Integration", mode: "insensitive" } },
    });

    if (!reason) {
      console.error("[InventoryCloudSyncService] Sync aborted: Adjustment reason not found.");
      return { productsProcessed: 0, syncedAt: new Date().toISOString() };
    }

    const selectedSublocationIds =
      !syncedAll && selectedRecords && selectedRecords.length > 0
        ? new Set(selectedRecords.map((item) => String(item)))
        : null;

    let totalProcessed = 0;
    let batchNo = 0;

    const processedProductIds: string[] = [];
    const permanentlyFailedIds: string[] = [];

    console.log(`[InventoryCloudSyncService] Starting sync batching (Size: ${BATCH_SIZE})...`);

    while (true) {
      const iterationStartTime = performance.now();
      if (checkSignal) await checkSignal();

      const fetchStartTime = performance.now();

      const rawBatch = await this.getProducts(
        prisma,
        locationId,
        selectedSublocationIds,
        BATCH_SIZE,
        processedProductIds
      );
      const fetchDuration = performance.now() - fetchStartTime;

      if (!rawBatch || rawBatch.length === 0) {
        console.log(`[InventoryCloudSyncService] No more products found. Sync complete.`);
        break;
      }

      console.log(
        `[InventoryCloudSyncService] Fetched ${rawBatch.length} items in ${this.formatDuration(fetchDuration)}`
      );

      if (checkSignal) await checkSignal();

      const { successfulIds, failedIds } = await this.processBatchBulk(
        rawBatch,
        checkSignal,
        batchNo,
        reason?.inflowId
      );

      const currentBatchIds = rawBatch.map((p) => p.id);
      processedProductIds.push(...currentBatchIds);

      if (failedIds.length > 0) {
        permanentlyFailedIds.push(...failedIds);
      }

      totalProcessed += successfulIds.length;
      batchNo++;

      const iterationDuration = performance.now() - iterationStartTime;

      console.log(
        `[InventoryCloudSyncService] Batch #${batchNo} done in ${this.formatDuration(iterationDuration)}. ` +
          `Processed: ${successfulIds.length}, Failed: ${failedIds.length}. Cumulative: ${totalProcessed}`
      );

      if (onProgress) {
        await onProgress(totalProcessed);
      }

      if (successfulIds.length === 0 && failedIds.length === rawBatch.length) {
        console.warn(`[InventoryCloudSyncService] Entire batch failed. Stopping execution loop.`);
        break;
      }

      if (INTER_BATCH_DELAY > 0) {
        await this.sleep(INTER_BATCH_DELAY);
      }
    }

    const totalSyncDuration = performance.now() - syncStartTime;
    console.log(
      `[InventoryCloudSyncService] Total job execution completed in ${this.formatDuration(totalSyncDuration)}. Total Processed: ${totalProcessed}, Total Failed: ${permanentlyFailedIds.length}`
    );

    return {
      inventoryLevelsProcessed: totalProcessed,
      failedCount: permanentlyFailedIds.length,
      syncedAt: new Date().toISOString(),
    };
  }
}

export const inventoryCloudSyncService = new InventoryCloudSyncService();



  // async processBatchBulk(
  //   products: LocalProductWithRelations[],
  //   checkSignal?: () => Promise<void>,
  //   batchNo: number = 0,
  //   reasonId?: string,
  //   locationId?: string
  // ): Promise<{
  //   successfulIds: string[];
  //   failedIds: string[];
  // }> {
  //   const batchStartTime = performance.now();
  //   const modifiedById = "56bfcf3b-3e98-4098-ae8f-2adcb657cb57";

  //   const batchLines: InflowStockAdjustmentLine[] = [];
  //   const processedProductIds: string[] = [];
  //   let targetLocationInflowId: string | null = null;

  //   // --- Phase A: Map Local Inventory Lines into a Single Batch Array ---
  //   for (const product of products) {
  //     if (checkSignal) await checkSignal();

  //     if (!product.inflowId) continue;

  //     let productIncluded = false;

  //     for (const inv of product.inventories) {
  //       // Resolve inFlow location ID once for the batch
  //       if (!targetLocationInflowId) {
  //         targetLocationInflowId = inv.location?.inflowId || locationId || inv.locationId;
  //       }

  //       for (const bin of inv.bins) {
  //         // Skip serial-tracked products if applicable
  //         if (product.trackSerials) continue;

  //         const binQty = Number(bin.quantity) || 0;
  //         const binSerials =
  //           bin.inventoryBinItems?.map((item) => item.serialNumber).filter(Boolean) || [];

  //         const adjustmentLine: InflowStockAdjustmentLine = {
  //           productId: product.inflowId,
  //           stockAdjustmentLineId: null,
  //           quantity: {
  //             standardQuantity: String(binQty),
  //             uomQuantity: String(binQty),
  //             uom: product.standardUomName || "ea.",
  //             serialNumbers: binSerials,
  //           },
  //           sublocation: bin.sublocation?.name || "",
  //           description: `Location sync adjustment for ${product.name}`,
  //         };

  //         batchLines.push(adjustmentLine);
  //         productIncluded = true;
  //       }
  //     }

  //     if (productIncluded) {
  //       processedProductIds.push(product.id);
  //     }
  //   }

  //   // --- Phase B: Build Single InFlow Stock Adjust Input Payload ---
  //   const successfulIds: string[] = [];
  //   const failedIds: string[] = [];
  //   const timestamp = new Date().toISOString().slice(-6);

  //   if (batchLines.length > 0) {
  //     const singleAdjustPayload: InflowStockAdjustInput = {
  //       stockAdjustmentId: crypto.randomUUID(),
  //       adjustmentNumber: `SYNC-${batchNo + 1}-${timestamp}`,
  //       adjustmentReasonId: reasonId || "",
  //       date: new Date().toISOString(),
  //       isCancelled: false,
  //       lastModifiedById: modifiedById,
  //       locationId: targetLocationInflowId || locationId || "",
  //       remarks: `Batch Sync #${batchNo + 1} Inventory Adjustment`,
  //       lines: batchLines,
  //     };

  //     try {
  //       console.log(
  //         `[Inventory Sync] Dispatching batch #${batchNo + 1} payload (${batchLines.length} lines, ${processedProductIds.length} products) to inFlow...`
  //       );

  //       // Send single payload inside array
  //       await upsertStockAdjustBulk([singleAdjustPayload]);

  //       console.log(`[Inventory Sync] Bulk inFlow sync successful for batch #${batchNo + 1}.`);
  //       successfulIds.push(...processedProductIds);
  //     } catch (error) {
  //       console.error(`[Inventory Sync] Failed bulk dispatch to inFlow for batch #${batchNo + 1}:`, error);
  //       failedIds.push(...products.map((p) => p.id));
  //     }
  //   } else {
  //     // No stock lines generated for this batch
  //     successfulIds.push(...products.map((p) => p.id));
  //   }

  //   const batchDuration = performance.now() - batchStartTime;
  //   console.log(`[Product Sync] Batch #${batchNo + 1} finished in ${this.formatDuration(batchDuration)}`);

  //   return { successfulIds, failedIds };
  // }

  // async getProducts(
  //   db: DbClient | typeof prisma = prisma,
  //   locationId: string,
  //   selectedSublocationIds?: Set<string> | null,
  //   take: number = 30,
  //   excludeIds: string[] = []
  // ): Promise<LocalProductWithRelations[]> {
  //   const sublocationsFilter =
  //     selectedSublocationIds && selectedSublocationIds.size > 0
  //       ? { sublocationId: { in: Array.from(selectedSublocationIds) } }
  //       : undefined;

  //   const whereClause: Prisma.ProductWhereInput = {
  //     deletedAt: null,
  //     isActive: true,
  //     isCloudSynced: true,
  //     ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
  //     inventories: {
  //       some: {
  //         locationId,
  //         bins: {
  //           some: sublocationsFilter || {},
  //         },
  //       },
  //     },
  //   };

  //   const products = await db.product.findMany({
  //     where: whereClause,
  //     take,
  //     orderBy: { createdAt: "asc" },
  //     include: {
  //       inventories: {
  //         where: { locationId },
  //         include: {
  //           bins: {
  //             where: sublocationsFilter,
  //             include: {
  //               sublocation: true,
  //               inventoryBinItems: true,
  //             },
  //           },
  //           location: {
  //             select: {
  //               inflowId: true,
  //               name: true,
  //               isActive: true,
  //               isDefault: true,
  //             },
  //           },
  //         },
  //       },
  //     },
  //   });

  //   return products;
  // }


  // async processBatchBulk(
  //   products: LocalProductWithRelations[],
  //   checkSignal?: () => Promise<void>,
  //   batchNo: number = 0,
  //   reasonId?: string
  // ): Promise<{
  //   successfulIds: string[];
  //   failedIds: string[];
  // }> {
  //   const batchStartTime = performance.now();
  //   const modifiedById = "56bfcf3b-3e98-4098-ae8f-2adcb657cb57";

  //   // Map: target Location InflowId -> InflowStockAdjustmentLine[]
  //   const locationLinesMap = new Map<string, InflowStockAdjustmentLine[]>();
  //   const processedProductIds: string[] = [];

  //   // --- Phase A: Map Local Inventory to Inflow Stock Adjustment Lines ---
  //   for (const product of products) {
  //     if (checkSignal) await checkSignal();

  //     // Skip non-synced products or items missing inflowId
  //     if (!product.inflowId) continue;

  //     let productIncluded = false;

  //     for (const inv of product.inventories) {
  //       // Resolve the inFlow location ID (prefer inflowId over local ID)
  //       const targetLocationInflowId = inv.location?.inflowId || inv.locationId;
  //       if (!targetLocationInflowId) continue;

  //       for (const bin of inv.bins) {
  //         // Temporary skip serial-tracked products if necessary
  //         if (product.trackSerials) continue;

  //         const binQty = Number(bin.quantity) || 0;
  //         const binSerials =
  //           bin.inventoryBinItems?.map((item) => item.serialNumber).filter(Boolean) || [];

  //         const adjustmentLine: InflowStockAdjustmentLine = {
  //           productId: product.inflowId,
  //           stockAdjustmentLineId: null,
  //           quantity: {
  //             standardQuantity: String(binQty),
  //             uomQuantity: String(binQty),
  //             uom: product.standardUomName || "ea.",
  //             serialNumbers: binSerials,
  //           },
  //           sublocation: bin.sublocation?.name || "",
  //           description: `Location sync adjustment for ${product.name}`,
  //         };

  //         const existingLines = locationLinesMap.get(targetLocationInflowId) ?? [];
  //         existingLines.push(adjustmentLine);
  //         locationLinesMap.set(targetLocationInflowId, existingLines);

  //         productIncluded = true;
  //       }
  //     }

  //     if (productIncluded) {
  //       processedProductIds.push(product.id);
  //     }
  //   }

  //   // --- Phase B: Build InFlow Stock Adjust Inputs Per Location ---
  //   const inflowBulkPayloads: InflowStockAdjustInput[] = [];
  //   const timestamp = new Date().toISOString();

  //   for (const [locationInflowId, lines] of locationLinesMap) {
  //     if (lines.length === 0) continue;

  //     const inflowAdjustPayload: InflowStockAdjustInput = {
  //       stockAdjustmentId: crypto.randomUUID(),
  //       adjustmentNumber: `SYNC-${batchNo + 1}-${Date.now().toString().slice(-6)}`,
  //       adjustmentReasonId: reasonId || "",
  //       date: timestamp,
  //       isCancelled: false,
  //       lastModifiedById: modifiedById,
  //       locationId: locationInflowId,
  //       remarks: `Batch Sync #${batchNo + 1} Inventory Adjustment`,
  //       lines,
  //     };

  //     inflowBulkPayloads.push(inflowAdjustPayload);
  //   }

  //   // --- Phase C: Bulk Send to external InFlow API ---
  //   const successfulIds: string[] = [];
  //   const failedIds: string[] = [];

  //   if (inflowBulkPayloads.length > 0) {
  //     try {
  //       console.log(
  //         `[Inventory Sync] Dispatching ${inflowBulkPayloads.length} location adjustment payload(s) containing ${products.length} product records to inFlow...`
  //       );
        
  //       await upsertStockAdjustBulk(inflowBulkPayloads);
        
  //       console.log(`[Inventory Sync] Bulk inFlow sync successful.`);
  //       successfulIds.push(...processedProductIds);
  //     } catch (error) {
  //       console.error(`[Inventory Sync] Failed bulk dispatch to inFlow:`, error);
  //       failedIds.push(...products.map((p) => p.id));
  //     }
  //   } else {
  //     // No stock lines generated for this batch (e.g. all skipped or no bin stock)
  //     successfulIds.push(...products.map((p) => p.id));
  //   }

  //   const batchDuration = performance.now() - batchStartTime;
  //   console.log(`[Product Sync] Finished in ${this.formatDuration(batchDuration)}`);

  //   return { successfulIds, failedIds };
  // }