import { prisma } from "@/lib/prisma";
import { 
  AdjustmentService,
  PostAdjustmentPayload,
  ProcessedAdjustmentResult
} from "@/services/stock-adjustment.service";
import { InflowProduct, InflowStockAdjustInput } from "@/lib/inflow/types";
import { getInventoryLevels } from "../data/inventory";
import { SyncOptions } from "@/lib/locations/types";

export type SyncAdjustmentLine = StockAdjustmentLineInput & {
  description?: string;
  targetLocationId: string;
};

type SyncCache = {
  verifiedProductIds: Map<string, { productId: string; trackSerials: boolean }>;
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

export function mapToInflowStockAdjustInput(
  result: ProcessedAdjustmentResult,
  payload: PostAdjustmentPayload
): InflowStockAdjustInput {
  return {
    stockAdjustmentId: result.adjustment.inflowId,
    adjustmentNumber: result.adjustment.adjustmentNumber,
    adjustmentReasonId: payload.reasonId || "",
    date: new Date().toISOString(),
    isCancelled: false,
    lastModifiedById: payload.performedById,
    locationId: payload.locationId,
    remarks: payload.remarks || "System Inbound Cloud Inventory Sync",
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
          serialNumbers: createdLine.serials || [],
        },
        description: createdLine.description,
      };
    }),
  };
}

export class InventorySyncService {
  private adjustmentService: AdjustmentService;

  constructor() {
    this.adjustmentService = new AdjustmentService(prisma);
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private formatDuration(ms: number): string {
    return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`;
  }

  async getAdjustmentReason(reasonName: string) {
    return await prisma.adjustmentReason.findFirst({
      where: { name: reasonName },
      select: { id: true, name: true, inflowId: true },
    });
  }

  async processBatch(
    products: InflowProduct[],
    batchNo: number = 0,
    modifiedBy: string,
    reasonId: string,
    selectedRecords: Set<string> | null,
    selectedLocations: Set<string> | null,
    caches: SyncCache,
    checkSignal?: () => Promise<void>,
  ): Promise<{
    successfulIds: string[];
    failedIds: string[];
  }> {
    const batchStartTime = performance.now();
    const locationAdjustmentMap = new Map<string, SyncAdjustmentLine[]>();
    const validationFailedProductIds = new Set<string>();

    // Phase A: Build Adjustment Inputs
    const results = await Promise.allSettled(
      products.map(async (product) => {
        if (checkSignal) await checkSignal();

        if (selectedRecords && !selectedRecords.has(String(product.productId))) {
          return null;
        }

        let productMeta: { productId: string; trackSerials: boolean } | null = null;

        if (product.productId) {
          const cacheKey = product.productId;
          if (caches.verifiedProductIds.has(cacheKey)) {
            productMeta = caches.verifiedProductIds.get(cacheKey) ?? null;
          } else {
            const localProduct = await prisma.product.findUnique({
              where: { inflowId: product.productId },
              select: { inflowId: true, trackSerials: true },
            });

            if (localProduct) {
              productMeta = {
                productId: localProduct.inflowId,
                trackSerials: localProduct?.trackSerials ?? false,
              };
              caches.verifiedProductIds.set(cacheKey, productMeta);
            }
          }
        }

        if (!productMeta) {
          console.warn(
            `[Sync Notification] Skipping line item "${product.productId}": Unresolved productId.`
          );
          return null;
        }

        if (!product.inventoryLines || product.inventoryLines.length === 0) {
          console.warn(
            `[Sync Debug] Skipping product "${product.name}" (${product.productId}): No inventory lines available.`
          );
          return null;
        }

        for (const inv of product.inventoryLines) {
          const targetLocationId = inv.locationId;

          if (selectedLocations && !selectedLocations.has(targetLocationId)) {
            continue;
          }

          const newOnHand = Number(inv.quantityOnHand);
          const incomingSerials = inv.serial
            ? Array.isArray(inv.serial)
              ? inv.serial
              : [inv.serial]
            : [];
          const isTrackSerials = productMeta.trackSerials;
          const sublocationName = inv.sublocation?.trim() || "";

          // Validation: Verify Serial Count === StockOnHand Qty for Tracked Items
          if (isTrackSerials && incomingSerials.length !== newOnHand) {
            console.error(
              `[Sync Validation Error] Mismatch for product "${product.name}" (${product.productId}) at sublocation "${sublocationName}": ` +
              `Serial count (${incomingSerials.length}) does not match stock on hand (${newOnHand}). Skipping adjustment.`
            );
            validationFailedProductIds.add(product.productId);
            throw new Error(`Serial count mismatch (${incomingSerials.length} serials vs ${newOnHand} Qty) for product ${product.productId}`);
          }

          // Fetch current local DB inventory
          const existingInv = await prisma.inventory.findFirst({
            where: {
              productId: productMeta.productId,
              locationId: targetLocationId,
            },
            include: {
              bins: {
                include: {
                  inventoryBinItems: true,
                },
              },
            },
          });

          const currentOnHand = existingInv ? Number(existingInv.quantityOnHand) : 0;
          const currentReserved = existingInv ? Number(existingInv.quantityReserved) : 0;

          const quantityDelta = newOnHand - currentOnHand;
          const hasQtyChange = quantityDelta !== 0;

          // Extract existing serials from local DB across all bins & unassigned floor items
          const existingTargetSerials = isTrackSerials && existingInv?.bins
            ? existingInv.bins.flatMap((b) =>
                b.inventoryBinItems.map((item) => item.serialNumber)
              )
            : [];

          const removedSerials = isTrackSerials
            ? existingTargetSerials.filter((s) => !incomingSerials.includes(s))
            : [];

          const addedSerials = isTrackSerials
            ? incomingSerials.filter((s) => !existingTargetSerials.includes(s))
            : [];

          const serialsChanged = removedSerials.length > 0 || addedSerials.length > 0;
          const isOpeningBalance = !existingInv && newOnHand > 0;

          // Skip if no changes and not an opening balance
          if (!hasQtyChange && !serialsChanged && existingInv && !isOpeningBalance) {
            continue;
          }

          const availableQty = Math.max(0, newOnHand - currentReserved);

          if (!locationAdjustmentMap.has(targetLocationId)) {
            locationAdjustmentMap.set(targetLocationId, []);
          }
          const adjustmentLines = locationAdjustmentMap.get(targetLocationId)!;

          // Resolve bin setup
          const binsPayload = sublocationName
            ? [
                {
                  sublocationId: sublocationName,
                  quantity: newOnHand,
                  serials: incomingSerials,
                },
              ]
            : [];

          if (isTrackSerials && (serialsChanged || isOpeningBalance)) {
            const serialsToPost = isOpeningBalance ? incomingSerials : addedSerials;

            if (removedSerials.length > 0) {
              adjustmentLines.push({
                targetLocationId,
                productId: productMeta.productId,
                trackSerials: true,
                quantityAdjusted: -removedSerials.length,
                quantityOnHand: newOnHand,
                quantityReserved: currentReserved,
                quantityAvailable: availableQty,
                serials: removedSerials,
                description: `Removed ${removedSerials.length} serial(s) for ${product.name}`,
                bins: binsPayload,
              });
            }

            if (serialsToPost.length > 0) {
              adjustmentLines.push({
                targetLocationId,
                productId: productMeta.productId,
                trackSerials: true,
                quantityAdjusted: serialsToPost.length,
                quantityOnHand: newOnHand,
                quantityReserved: currentReserved,
                quantityAvailable: availableQty,
                serials: serialsToPost,
                description: isOpeningBalance
                  ? `Opening balance for ${product.name}`
                  : `Added ${serialsToPost.length} serial(s) for ${product.name}`,
                bins: binsPayload,
              });
            }
          } else {
            adjustmentLines.push({
              targetLocationId,
              productId: productMeta.productId,
              trackSerials: isTrackSerials,
              quantityAdjusted: quantityDelta,
              quantityOnHand: newOnHand,
              quantityReserved: currentReserved,
              quantityAvailable: availableQty,
              serials: incomingSerials,
              description: isOpeningBalance
                ? `Opening balance for ${product.name}`
                : `Inbound sync inventory adjustment for ${product.name}`,
              bins: binsPayload,
            });
          }
        }

        return product.productId;
      })
    );

    // Collect Phase A Results
    const processedProductIds: string[] = [];
    const failedIds: string[] = [];

    results.forEach((res, index) => {
      if (res.status === "fulfilled") {
        if (res.value) processedProductIds.push(res.value);
      } else {
        failedIds.push(products[index].productId);
        console.error(`[Product Sync] Phase A Failed (${products[index].name}):`, res.reason);
      }
    });

    // Phase B: Execute Adjustments per Location
    const successfulIds: string[] = [];

    for (const [locationId, lines] of locationAdjustmentMap.entries()) {
      if (lines.length === 0) continue;

      try {
        const payload: PostAdjustmentPayload = {
          locationId,
          reasonId,
          performedById: modifiedBy,
          remarks: "System Inbound Cloud Inventory Sync",
          lines,
        };

        await this.adjustmentService.postAdjustment(payload);

        // Record products that were successfully synchronized in this location step
        lines.forEach((line) => {
          if (!successfulIds.includes(line.productId)) {
            successfulIds.push(line.productId);
          }
        });
      } catch (err) {
        console.error(`[Product Sync] Phase B Posting Error for location ${locationId}:`, err);
        lines.forEach((line) => {
          if (!failedIds.includes(line.productId)) {
            failedIds.push(line.productId);
          }
        });
      }
    }

    const batchDuration = performance.now() - batchStartTime;
    console.log(`[Product Sync] Batch finished in ${this.formatDuration(batchDuration)}`);

    return { successfulIds, failedIds };
  }

  async batchSync(
    options: SyncOptions, 
    after: string | undefined = undefined,
    selectedRecords: string[],
    selectedLocations: string[], 
    syncedAll: boolean,
  ) {
    const syncStartTime = performance.now();
    const { onProgress, checkSignal } = options;
    const BATCH_SIZE = options?.batchSize ?? 500; 
    const INTER_BATCH_DELAY = options?.delayBetweenBatchesMs ?? 300;

    const modifiedBy = "8ff3e71d-eb02-425d-8e0f-00a69fc8e482";
    
    const reason = await prisma.adjustmentReason.findFirst({
      where: { name: { contains: "Integration", mode: "insensitive" } },
    });

    if (!reason) {
      console.error("[CloudInventorySyncService] Sync aborted: Reason not found.");
      return { productsProcessed: 0, syncedAt: new Date().toISOString() };
    }

    const selectedProductIds =
      !syncedAll && selectedRecords && selectedRecords.length > 0
        ? new Set(selectedRecords.map((item) => String(item)))
        : null;

    const selectedSubLocationIds = selectedLocations && selectedLocations.length > 0
        ? new Set(selectedLocations.map((item) => String(item)))
        : null;

    let totalProcessed = 0;
    let batchNo = 0;
    let cursor: string | undefined = after;

    const caches: SyncCache = {
      verifiedProductIds: new Map(),
    };

    const permanentlyFailedIds: string[] = [];

    console.log(`[CloudInventorySyncService] Starting sync batching (Size: ${BATCH_SIZE})...`);

    while (true) {
      const iterationStartTime = performance.now();
      if (checkSignal) await checkSignal();

      const fetchStartTime = performance.now();
      
      const rawBatch: InflowProduct[] = await getInventoryLevels(
        BATCH_SIZE,
        cursor
      );
      const fetchDuration = performance.now() - fetchStartTime;

      if (!rawBatch || rawBatch.length === 0) {
        console.log(`[CloudInventorySyncService] No more products found. Sync complete.`);
        break;
      }

      console.log(
        `[CloudInventorySyncService] Fetched ${rawBatch.length} items in ${this.formatDuration(fetchDuration)}`
      );

      if (checkSignal) await checkSignal();

      const { successfulIds, failedIds } = await this.processBatch(
        rawBatch,
        batchNo,
        modifiedBy,
        reason.inflowId,
        selectedProductIds,
        selectedSubLocationIds,
        caches,
        checkSignal,
      );

      cursor = rawBatch[rawBatch.length - 1].productId;

      if (failedIds.length > 0) {
        permanentlyFailedIds.push(...failedIds);
      }

      totalProcessed += successfulIds.length;
      batchNo++;

      const iterationDuration = performance.now() - iterationStartTime;

      console.log(
        `[CloudInventorySyncService] Batch #${batchNo} done in ${this.formatDuration(iterationDuration)}. ` +
        `Processed: ${successfulIds.length}, Failed: ${failedIds.length}. Cumulative: ${totalProcessed}`
      );

      if (onProgress) {
        await onProgress(totalProcessed);
      }

      if (successfulIds.length === 0 && failedIds.length === rawBatch.length) {
        console.warn(`[CloudInventorySyncService] Entire batch failed. Stopping execution loop.`);
        break;
      }

      if (INTER_BATCH_DELAY > 0) {
        await this.sleep(INTER_BATCH_DELAY);
      }
    }

    const totalSyncDuration = performance.now() - syncStartTime;
    console.log(
      `[CloudInventorySyncService] Total job execution completed in ${this.formatDuration(totalSyncDuration)}. Total Processed: ${totalProcessed}, Total Failed: ${permanentlyFailedIds.length}`
    );

    return {
      inventoryLevelsProcessed: totalProcessed,
      failedCount: permanentlyFailedIds.length,
      syncedAt: new Date().toISOString(),
    };
  }
}

export const inventoryLocalSyncService = new InventorySyncService();