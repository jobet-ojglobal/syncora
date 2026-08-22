import { prisma } from "@/lib/prisma";
import { LocalProductInventory } from "../types";
import { getLocalBatchInventory } from "../data/product-local";
import { 
  AdjustmentService,
  PostAdjustmentPayload,
  ProcessedAdjustmentResult
} from "@/services/stock-adjustment.service";
import { InflowStockAdjustInput } from "@/lib/inflow/types";
import { upsertStockAdjustBulk } from "@/lib/inflow/data/inventory";
import { SyncOptions } from "@/lib/workers/types";

export type SyncAdjustmentLine = StockAdjustmentLineInput & {
  description?: string;
  targetLocationId: string;
};

type SyncCache = {
  verifiedProductIds: Map<string, { productId: string; trackSerials: boolean }>;
  mappedSublocations: Map<
    number, // Keyed by flat localId (e.g. 101)
    {
      sublocationId: string;
      locationId: string;
      linkedLocationId: string | null;
    }
  >;
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

  /**
   * Warm up Sublocation map cache for the default parent Location
   */
  private async loadSublocationMappings(
    locationInflowId: string,
    cache: Map<number, { sublocationId: string; locationId: string; linkedLocationId: string | null }>
  ) {
    const mappings = await prisma.sublocationLocationMap.findMany({
      where: { locationId: locationInflowId },
      select: {
        localId: true,
        sublocationId: true,
        locationId: true,
        sublocation: {
          select: {
            linkedLocationId: true,
          },
        },
      },
    });

    for (const m of mappings) {
      cache.set(m.localId, {
        sublocationId: m.sublocationId,
        locationId: m.locationId,
        linkedLocationId: m.sublocation?.linkedLocationId ?? null,
      });
    }

    console.log(
      `[Sync Debug] Loaded ${cache.size} sublocation location mapping(s) for location ${locationInflowId}`
    );
  }

  async processBatch(
    defaultLocationId: string,
    products: LocalProductInventory[],
    batchNo: number = 0,
    modifiedBy: string,
    reasonId: string,
    selectedRecords: Set<string> | null,
    selectedSubLocations: Set<string> | null,
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
          const cacheKey = `${defaultLocationId}_${product.productId}`;

          if (caches.verifiedProductIds.has(cacheKey)) {
            productMeta = caches.verifiedProductIds.get(cacheKey) ?? null;
          } else {
            const mappedProduct = await prisma.productLocationMap.findFirst({
              where: {
                locationId: defaultLocationId,
                localId: Number(product.productId),
              },
              select: { 
                productId: true, 
                product: { select: { trackSerials: true } } 
              },
            });

            if (mappedProduct) {
              productMeta = {
                productId: mappedProduct.productId,
                trackSerials: mappedProduct.product?.trackSerials ?? false,
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
          const rawLocalId = Number(inv.locationId);

          // 1. Resolve local flat sublocation ID against mapped cache
          let sublocationMeta = caches.mappedSublocations.get(rawLocalId);

          if (!sublocationMeta) {
            // Lazy fetch fallback if not warm in cache
            const mapping = await prisma.sublocationLocationMap.findFirst({
              where: {
                locationId: defaultLocationId,
                localId: rawLocalId,
              },
              select: {
                sublocationId: true,
                locationId: true,
                sublocation: {
                  select: { linkedLocationId: true },
                },
              },
            });

            if (mapping) {
              sublocationMeta = {
                sublocationId: mapping.sublocationId,
                locationId: mapping.locationId,
                linkedLocationId: mapping.sublocation?.linkedLocationId ?? null,
              };
              caches.mappedSublocations.set(rawLocalId, sublocationMeta);
            }
          }

          // 2. Sublocation filter check
          if (
            selectedSubLocations &&
            sublocationMeta &&
            !selectedSubLocations.has(sublocationMeta.sublocationId)
          ) {
            continue;
          }

          // 3. Resolve targetLocationId: Use linkedLocationId if available, else defaultLocationId
          const targetLocationId = sublocationMeta?.linkedLocationId;

          if(!targetLocationId) continue;

          const newOnHand = Number(inv.quantityOnHand);
          const incomingSerials = inv.serials || [];
          const isTrackSerials = productMeta.trackSerials;

          // ----------------------------------------------------------------
          // Validation: Verify Serial Count === StockOnHand Qty for Tracked Items
          // ----------------------------------------------------------------
          if (isTrackSerials && incomingSerials.length !== newOnHand) {
            console.error(
              `[Sync Validation Error] Mismatch for product "${product.name}" (${product.productId}) at sublocation ${rawLocalId}: ` +
              `Serial count (${incomingSerials.length}) does not match stock on hand (${newOnHand}). Skipping adjustment.`
            );
            validationFailedProductIds.add(product.productId);
            throw new Error(`Serial count mismatch (${incomingSerials.length} serials vs ${newOnHand} Qty) for product ${product.productId}`);
          }

          // Fetch current database inventory for comparison
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

          // Extract existing serial numbers from local DB
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
                bins: [],
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
                bins: [],
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
              bins: [],
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

    // Phase B: Post Local Adjustments & Collect InFlow Payloads
    const inflowBulkPayloads: InflowStockAdjustInput[] = [];

    // DO NOT DELETE
    // for (const [targetLocationId, adjustmentLines] of locationAdjustmentMap) {
    //   if (adjustmentLines.length === 0) continue;

    //   console.log(
    //     `[Sync Debug] Location ${targetLocationId} has ${adjustmentLines.length} line(s) to adjust:`,
    //     JSON.stringify(adjustmentLines, null, 2)
    //   );

    //   const postPayload: PostAdjustmentPayload = {
    //     locationId: targetLocationId,
    //     reasonId: reasonId || undefined,
    //     remarks: `Global Sync Batch #${batchNo + 1} Mid Inventory Adjustment`,
    //     performedById: modifiedBy,
    //     lines: adjustmentLines,
    //   };

    //   console.log(`[Sync Debug] Executing postAdjustment for target location: ${targetLocationId}...`);
    //   const postResult = await this.adjustmentService.postAdjustment(postPayload, "SYNC-ADJ");

    //   const inflowPayload = mapToInflowStockAdjustInput(postResult, postPayload);
    //   inflowBulkPayloads.push(inflowPayload);

    //   console.log(
    //     `[Inventory Sync] Local adjustment created (${postResult.adjustment.inflowId}) for target location: ${targetLocationId}`
    //   );
    // }

    const CHUNK_SIZE = 100;

    for (const [targetLocationId, adjustmentLines] of locationAdjustmentMap) {
      if (adjustmentLines.length === 0) continue;

      // Split lines into chunks of max 100 items
      for (let i = 0; i < adjustmentLines.length; i += CHUNK_SIZE) {
        const chunkIndex = Math.floor(i / CHUNK_SIZE);
        const lineChunk = adjustmentLines.slice(i, i + CHUNK_SIZE);
        const isExcessChunk = chunkIndex > 0;

        console.log(
          `[Sync Debug] Location ${targetLocationId} (Chunk ${chunkIndex + 1}) has ${lineChunk.length} line(s) to adjust:`,
          JSON.stringify(lineChunk, null, 2)
        );

        const postPayload: PostAdjustmentPayload = {
          locationId: targetLocationId,
          reasonId: reasonId || undefined,
          remarks: `Global Sync Batch #${batchNo + 1} Mid Inventory Adjustment${isExcessChunk ? ` (Part ${chunkIndex + 1})` : ''}`,
          performedById: modifiedBy,
          lines: lineChunk,
        };

        console.log(`[Sync Debug] Executing postAdjustment for target location: ${targetLocationId} (Chunk ${chunkIndex + 1})...`);
        const postResult = await this.adjustmentService.postAdjustment(postPayload, "SYNC-ADJ");

        // If chunking exceeds 100 lines, transform adjustment number to ADJ-[chunkIndex+1]-[number] (e.g., ADJ-2-002382)
        if (isExcessChunk && postResult.adjustment?.adjustmentNumber) {
          const baseNum = postResult.adjustment.adjustmentNumber.replace(/^SYNC-ADJ-/, '');
          postResult.adjustment.adjustmentNumber = `SYNC-ADJ-${chunkIndex + 1}-${baseNum}`;
        }

        const inflowPayload = mapToInflowStockAdjustInput(postResult, postPayload);
        inflowBulkPayloads.push(inflowPayload);

        console.log(
          `[Inventory Sync] Local adjustment created (${postResult.adjustment.adjustmentNumber} | inflowId: ${postResult.adjustment.inflowId}) for target location: ${targetLocationId}`
        );
      }
    }


    const successfulIds: string[] = [];

    // Phase C: Bulk Send to External InFlow API
    if (inflowBulkPayloads.length > 0) {
      try {
        console.log(
          `[Inventory Sync] Dispatching batch #${batchNo + 1} cloud payload (${inflowBulkPayloads.length} locations) to inFlow...`
        );

        await upsertStockAdjustBulk(inflowBulkPayloads);

        console.log(`[Inventory Sync] Bulk inFlow cloud sync successful for batch #${batchNo + 1}.`);
        successfulIds.push(...processedProductIds);
      } catch (error) {
        console.error(`[Inventory Sync] Failed bulk dispatch to inFlow for batch #${batchNo + 1}:`, error);
        failedIds.push(...processedProductIds);
      }
    } else {
      console.log(`[Sync Debug] No adjustments generated to push to upsertStockAdjustBulk.`);
      successfulIds.push(...processedProductIds);
    }

    const batchDuration = performance.now() - batchStartTime;
    console.log(`[Product Sync] Finished in ${this.formatDuration(batchDuration)}`);

    return { successfulIds, failedIds };
  }

  async sync(
    location: {
      inflowId: string;
      name: string;
      url: string;
    },
    options: SyncOptions, 
    after: string | undefined = undefined,
    selectedRecords: string[],
    selectedSubLocations: string[],
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
      console.error("[InventoryLocationSyncService] Sync aborted: Reason not found.");
      return { productsProcessed: 0, syncedAt: new Date().toISOString() };
    }

    const allowedIds =
      !syncedAll && selectedRecords && selectedRecords.length > 0
        ? new Set(selectedRecords.map((id) => String(id)))
        : null;

    const selectedSubLocationIds = selectedSubLocations && selectedSubLocations.length > 0
        ? new Set(selectedSubLocations.map((item) => String(item)))
        : null;

    let totalProcessed = 0;
    let batchNo = 0;
    let cursor: string | undefined = after;

    const caches: SyncCache = {
      verifiedProductIds: new Map(),
      mappedSublocations: new Map(),
    };

    // Pre-fill cache for location sublocations
    await this.loadSublocationMappings(location.inflowId, caches.mappedSublocations);

    const permanentlyFailedIds: string[] = [];

    console.log(`[InventoryLocationSyncService] Starting sync batching (Size: ${BATCH_SIZE})...`);

    while (true) {
      const iterationStartTime = performance.now();
      if (checkSignal) await checkSignal();

      const fetchStartTime = performance.now();
      
      const rawBatch: LocalProductInventory[] = await getLocalBatchInventory(
        location.url,
        BATCH_SIZE,
        cursor,
      );
      const fetchDuration = performance.now() - fetchStartTime;

      if (!rawBatch || rawBatch.length === 0) {
        console.log(`[InventoryLocationSyncService] No more products found. Sync complete.`);
        break;
      }

      console.log(
        `[InventoryLocationSyncService] Fetched ${rawBatch.length} items in ${this.formatDuration(fetchDuration)}`
      );

      if (checkSignal) await checkSignal();

      const { successfulIds, failedIds } = await this.processBatch(
        location.inflowId,
        rawBatch,
        batchNo,
        modifiedBy,
        reason.inflowId,
        allowedIds,
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
        `[InventoryLocationSyncService] Batch #${batchNo} done in ${this.formatDuration(iterationDuration)}. ` +
        `Processed: ${successfulIds.length}, Failed: ${failedIds.length}. Cumulative: ${totalProcessed}`
      );

      if (onProgress) {
        await onProgress(totalProcessed);
      }

      if (successfulIds.length === 0 && failedIds.length === rawBatch.length) {
        console.warn(`[InventoryLocationSyncService] Entire batch failed. Stopping execution loop.`);
        break;
      }

      if (INTER_BATCH_DELAY > 0) {
        await this.sleep(INTER_BATCH_DELAY);
      }
    }

    const totalSyncDuration = performance.now() - syncStartTime;
    console.log(
      `[InventoryLocationSyncService] Total job execution completed in ${this.formatDuration(totalSyncDuration)}. Total Processed: ${totalProcessed}, Total Failed: ${permanentlyFailedIds.length}`
    );

    return {
      inventoryLevelsProcessed: totalProcessed,
      failedCount: permanentlyFailedIds.length,
      syncedAt: new Date().toISOString(),
    };
  }
}

const inventoryService = new InventorySyncService();
export const localInventoryServiceMap = inventoryService.sync.bind(inventoryService);


    // Construct target sublocation bin entry
          // const targetBins = activeSublocationId
          //   ? [
          //       {
          //         sublocationId: activeSublocationId,
          //         quantity: newOnHand,
          //         serials: incomingSerials,
          //       },
          //     ]
          //   : [];

  // async sync(
  //   location: {
  //     inflowId: string;
  //     name: string;
  //     url: string;
  //   },
  //   options: SyncOptions,
  //   selectedRecords?: any[],
  //   syncedAll?: boolean,
  //   after: string | undefined = undefined
  // ) {
  //   const syncStartTime = performance.now();

  //   const { onProgress, checkSignal, batchSize, delayBetweenBatchesMs } = options;
  //   const BATCH_SIZE = batchSize ?? 100;
  //   const INTER_BATCH_DELAY = delayBetweenBatchesMs ?? 300;
  //   const CLIENT_RETRIES = 3;
  //   const REQUEST_TIMEOUT_MS = 15000;

  //   const reason = await this.getAdjustmentReason("Integration import");
  //   const modifiedBy = "8ff3e71d-eb02-425d-8e0f-00a69fc8e482";

  //   const caches = {
  //     verifiedLocationIds: new Set<string>(),
  //     verifiedProductIds: new Map<string, string>(),
  //   };

  //   let batchNo = 0;
  //   let totalProcessed = 0;
  //   let hasMore = true;

  //   // Detailed execution & error tracking maps
  //   const successfulIds: string[] = [];
  //   const failedIds: string[] = [];
  //   const errorDetails: Array<{ productId: string; batchNo: number; error: string }> = [];

  //   const allowedIds =
  //     !syncedAll && selectedRecords && selectedRecords.length > 0
  //       ? new Set(selectedRecords.map((item) => String(item.id ?? item.productId)))
  //       : null;

  //   console.log(
  //     `Starting batch inventory sync map (Batch Size: ${BATCH_SIZE}, Throttle: ${INTER_BATCH_DELAY}ms)...`
  //   );

  //   while (hasMore) {
  //     const batchStartTime = performance.now();

  //     // 1. Check signal before starting remote fetch
  //     if (checkSignal) await checkSignal();

  //     const fetchStartTime = performance.now();
  //     const rawBatch: LocalProductInventory[] = await getLocalBatchInventory(
  //       location.url,
  //       BATCH_SIZE,
  //       after,
  //       CLIENT_RETRIES,
  //       REQUEST_TIMEOUT_MS
  //     );
  //     const fetchTimeMs = (performance.now() - fetchStartTime).toFixed(2);

  //     if (!rawBatch || rawBatch.length === 0) break;

  //     after = String(rawBatch[rawBatch.length - 1].productId);
  //     if (rawBatch.length < BATCH_SIZE) hasMore = false;

  //     let batch = rawBatch;
  //     if (allowedIds) {
  //       batch = batch.filter((item) => allowedIds.has(String(item.productId)));
  //     }

  //     if (batch.length === 0) continue;

  //     if (checkSignal) await checkSignal();

  //     try {
  //       const locationAdjustmentMap = new Map<string, StockAdjustmentLineInput[]>();
  //       const processedProductIds: string[] = [];

  //       // --- Phase A: Local DB Processing inside Transaction ---
  //       const phaseAStart = performance.now();

  //       await prisma.$transaction(
  //         async (tx) => {
  //           for (const product of batch) {
  //             let validProductId: string | null = null;

  //             if (checkSignal) await checkSignal();

  //             if (product.productId) {
  //               const cacheKey = `${location.inflowId}_${product.productId}`;

  //               if (caches.verifiedProductIds.has(cacheKey)) {
  //                 validProductId = caches.verifiedProductIds.get(cacheKey) ?? null;
  //               } else {
  //                 const mappedProduct = await tx.productLocationMap.findFirst({
  //                   where: {
  //                     locationId: location.inflowId,
  //                     localId: Number(product.productId),
  //                   },
  //                   select: { productId: true },
  //                 });

  //                 if (mappedProduct) {
  //                   validProductId = mappedProduct.productId;
  //                   caches.verifiedProductIds.set(cacheKey, validProductId);
  //                 }
  //               }
  //             }

  //             if (!validProductId) {
  //               console.warn(
  //                 `[Sync Notification] Skipping line item "${product.productId}": Unresolved productId.`
  //               );
  //               continue;
  //             }

  //             processedProductIds.push(validProductId);

  //             const lines = product.inventoryLines
  //               ? Array.isArray(product.inventoryLines)
  //                 ? product.inventoryLines
  //                 : [product.inventoryLines]
  //               : [];

  //             const deltaLines = await syncInventoryLines(
  //               tx,
  //               validProductId,
  //               lines,
  //               caches,
  //               [location.inflowId]
  //             );

  //             for (const line of deltaLines) {
  //               const targetLocId = line.targetLocationId;
  //               if (!targetLocId) continue;

  //               const adjustmentInput: StockAdjustmentLineInput & { description?: string } = {
  //                 productId: line.productId,
  //                 trackSerials: line.trackSerials,
  //                 quantityAdjusted: line.quantityAdjusted,
  //                 quantityOnHand: line.quantityOnHand,
  //                 quantityReserved: line.quantityReserved,
  //                 quantityAvailable: line.quantityAvailable,
  //                 serials: line.serials || [],
  //                 bins: line.bins || [],
  //                 description: line.description,
  //               };

  //               const existingGroup = locationAdjustmentMap.get(targetLocId) ?? [];
  //               existingGroup.push(adjustmentInput);
  //               locationAdjustmentMap.set(targetLocId, existingGroup);
  //             }
  //           }
  //         },
  //         { timeout: 40000 }
  //       );

  //       const phaseATimeMs = (performance.now() - phaseAStart).toFixed(2);

  //       // --- Phase B: Save Local Adjustments ---
  //       const phaseBStart = performance.now();
  //       const inflowBulkPayloads: InflowStockAdjustInput[] = [];

  //       for (const [targetLocationId, adjustmentLines] of locationAdjustmentMap) {
  //         if (adjustmentLines.length === 0) continue;

  //         const postPayload: PostAdjustmentPayload = {
  //           locationId: targetLocationId,
  //           reasonId: reason?.inflowId || undefined,
  //           remarks: `Global Sync Batch #${batchNo + 1} Mid Inventory Adjustment`,
  //           performedById: modifiedBy,
  //           lines: adjustmentLines,
  //         };

  //         const postResult = await this.adjustmentService.postAdjustmentWithAdjustedReturn(postPayload);
  //         const inflowPayload = mapToInflowStockAdjustInput(postResult, postPayload);
  //         inflowBulkPayloads.push(inflowPayload);
  //       }

  //       const phaseBTimeMs = (performance.now() - phaseBStart).toFixed(2);

  //       // --- Phase C: Dispatch to External InFlow API ---
  //       const phaseCStart = performance.now();

  //       if (inflowBulkPayloads.length > 0) {
  //         try {
  //           console.log(
  //             `[Inventory Sync] Dispatching batch #${batchNo + 1} (${inflowBulkPayloads.length} payloads, ${processedProductIds.length} products) to inFlow...`
  //           );

  //           await upsertStockAdjustBulk(inflowBulkPayloads);

  //           const phaseCTimeMs = (performance.now() - phaseCStart).toFixed(2);
  //           console.log(`[Inventory Sync] Bulk inFlow cloud sync successful for batch #${batchNo + 1} (${phaseCTimeMs}ms).`);
            
  //           successfulIds.push(...processedProductIds);
  //         } catch (error: any) {
  //           const errorMessage = error?.message || String(error);
  //           console.error(`[Inventory Sync] Failed bulk dispatch to inFlow for batch #${batchNo + 1}:`, errorMessage);

  //           // Record failure for all product IDs in this failed batch
  //           failedIds.push(...processedProductIds);
  //           processedProductIds.forEach((id) => {
  //             errorDetails.push({
  //               productId: id,
  //               batchNo: batchNo + 1,
  //               error: errorMessage,
  //             });
  //           });
  //         }
  //       } else {
  //         successfulIds.push(...processedProductIds);
  //       }

  //       const totalBatchTimeMs = (performance.now() - batchStartTime).toFixed(2);
  //       console.log(
  //         `[Batch #${batchNo + 1} Timings] Total: ${totalBatchTimeMs}ms | Fetch: ${fetchTimeMs}ms | Phase A (DB): ${phaseATimeMs}ms | Phase B (Post): ${phaseBTimeMs}ms`
  //       );

  //     } catch (transactionError: any) {
  //       console.error(`[Batch Sync Error] Batch #${batchNo + 1} ending with ID ${after}:`, transactionError);
  //       throw transactionError;
  //     }

  //     after = batch[batch.length - 1].productId;
  //     totalProcessed += batch.length;
  //     batchNo++;

  //     if (onProgress) {
  //       await onProgress(totalProcessed);
  //     }

  //     if (INTER_BATCH_DELAY > 0) {
  //       await this.sleep(INTER_BATCH_DELAY);
  //     }
  //   }

  //   const totalSyncTimeSec = ((performance.now() - syncStartTime) / 1000).toFixed(2);
  //   console.log(`Sync Process Finished in ${totalSyncTimeSec}s. Total Items: ${totalProcessed}. Successful: ${successfulIds.length}, Failed: ${failedIds.length}`);

  //   return {
  //     inventoryProcessed: totalProcessed,
  //     successfulIds,
  //     failedIds,
  //     errorDetails, // Contains detailed per-product error breakdown
  //     syncedAt: new Date().toISOString(),
  //     executionTimeSeconds: Number(totalSyncTimeSec),
  //   };
  // }

// import { prisma } from "@/lib/prisma";
// import { syncInventoryLines } from "./inventory-line-sync";
// import { LocalProductInventory, SyncOptions } from "../types";
// import { getLocalBatchInventory } from "../data/product-local";
// import { 
//   AdjustmentService,
//   PostAdjustmentPayload,
//   ProcessedAdjustmentResult
// } from "@/services/stock-adjustment.service";
// import { InflowStockAdjustInput } from "@/lib/inflow/types";
// import { upsertStockAdjustBulk } from "@/lib/inflow/data/inventory";

// export type SyncAdjustmentLine = StockAdjustmentLineInput & {
//   description?: string;
// };

// export type StockAdjustmentLineInput = {
//   productId: string;
//   trackSerials: boolean;
//   quantityAdjusted: number;
//   quantityOnHand: number;
//   quantityReserved: number;
//   quantityAvailable: number;
//   bins: {
//     sublocationId: string;
//     quantity: number;
//     serials: string[];
//     id?: string | undefined;
//   }[];
//   serials: string[];
//   id?: string | undefined;
//   reason?: string | null | undefined;
// };

// export function mapToInflowStockAdjustInput(
//   result: ProcessedAdjustmentResult,
//   payload: PostAdjustmentPayload
// ): InflowStockAdjustInput {
//   const inflowPayload = {
//     stockAdjustmentId: result.adjustment.inflowId,
//     adjustmentNumber: result.adjustment.adjustmentNumber,
//     adjustmentReasonId: payload.reasonId || "",
//     date: new Date().toISOString(),
//     isCancelled: false,
//     lastModifiedById: payload.performedById,
//     locationId: payload.locationId,
//     remarks: payload.remarks || "",
//     lines: result.createdAdjustmentLines.map((createdLine) => {
//       // Use quantityAdjusted for the delta (+2 or -1)
//       const qtyDelta = createdLine.quantityAdjusted ?? createdLine.quantityOnHand;

//       return {
//         stockAdjustmentLineId: createdLine.inflowId,
//         productId: createdLine.productId,
//         sublocation: createdLine.sublocation,
//         quantity: {
//           standardQuantity: qtyDelta > 0 ? `+${qtyDelta}` : String(qtyDelta),
//           uomQuantity: qtyDelta > 0 ? `+${qtyDelta}` : String(qtyDelta),
//           uom: "ea.",
//           serialNumbers: createdLine.serials || [],
//         },
//         description: createdLine.description,
//       };
//     }),
//   };

//   return inflowPayload;
// }

// export class InventorySyncService {
//   private adjustmentService: AdjustmentService;

//   constructor() {
//     this.adjustmentService = new AdjustmentService(prisma);
//   }

//   private sleep(ms: number) {
//     return new Promise((resolve) => setTimeout(resolve, ms));
//   }

//   async getAdjustmentReason(reasonName: string) {
//     return await prisma.adjustmentReason.findFirst({
//       where: { name: reasonName },
//       select: { id: true, name: true, inflowId: true },
//     });
//   }

//   async sync(
//     location: {
//       inflowId: string;
//       name: string;
//       url: string;
//     },
//     options: SyncOptions,
//     selectedRecords?: any[],
//     syncedAll?: boolean,
//     after: string | undefined = undefined
//   ) {
//     const { onProgress, checkSignal, batchSize, delayBetweenBatchesMs } = options;
//     const BATCH_SIZE = batchSize ?? 300;
//     const INTER_BATCH_DELAY = delayBetweenBatchesMs ?? 300;
//     const CLIENT_RETRIES = 1;

//     const reason = await this.getAdjustmentReason("Integration import");
//     const modifiedBy = "8ff3e71d-eb02-425d-8e0f-00a69fc8e482";

//     const caches = {
//       verifiedLocationIds: new Set<string>(),
//       verifiedProductIds: new Map<string, string>(),
//     };

//     let batchNo = 0;
//     let totalProcessed = 0;
//     let hasMore = true;

//     // Track successful and failed product IDs across batches
//     const successfulIds: string[] = [];
//     const failedIds: string[] = [];

//     const allowedIds =
//       !syncedAll && selectedRecords && selectedRecords.length > 0
//         ? new Set(selectedRecords.map((item) => String(item.id ?? item.productId)))
//         : null;

//     console.log(
//       `Starting batch inventory sync map (Batch Size: ${BATCH_SIZE}, Throttle: ${INTER_BATCH_DELAY}ms)...`
//     );

//     while (hasMore) {
//       // 1. Check signal before starting remote fetch
//       if (checkSignal) await checkSignal();

//       const rawBatch: LocalProductInventory[] = await getLocalBatchInventory(
//         location.url,
//         BATCH_SIZE,
//         after,
//         CLIENT_RETRIES
//       );

//       if (!rawBatch || rawBatch.length === 0) break;

//       after = String(rawBatch[rawBatch.length - 1].productId);
//       if (rawBatch.length < BATCH_SIZE) hasMore = false;

//       let batch = rawBatch;
//       if (allowedIds) {
//         batch = batch.filter((item) => allowedIds.has(String(item.productId)));
//       }

//       if (batch.length === 0) continue;

//       // 2. Check signal before DB processing
//       if (checkSignal) await checkSignal();

//       try {
//         // Collect adjustments per target location during calculation
//         const locationAdjustmentMap = new Map<string, StockAdjustmentLineInput[]>();
//         const processedProductIds: string[] = [];

//         // Phase A: Calculate changes per product line inside transaction context
//         await prisma.$transaction(
//           async (tx) => {
//             for (const product of batch) {
//               let validProductId: string | null = null;

//               if (checkSignal) await checkSignal();

//               if (product.productId) {
//                 const cacheKey = `${location.inflowId}_${product.productId}`;

//                 if (caches.verifiedProductIds.has(cacheKey)) {
//                   validProductId = caches.verifiedProductIds.get(cacheKey) ?? null;
//                 } else {
//                   const mappedProduct = await tx.productLocationMap.findFirst({
//                     where: {
//                       locationId: location.inflowId,
//                       localId: Number(product.productId),
//                     },
//                     select: { productId: true },
//                   });

//                   if (mappedProduct) {
//                     validProductId = mappedProduct.productId;
//                     caches.verifiedProductIds.set(cacheKey, validProductId);
//                   }
//                 }
//               }

//               if (!validProductId) {
//                 console.warn(
//                   `[Sync Notification] Skipping line item "${product.productId}": Unresolved productId.`
//                 );
//                 continue;
//               }

//               processedProductIds.push(validProductId);

//               const lines = product.inventoryLines
//                 ? Array.isArray(product.inventoryLines)
//                   ? product.inventoryLines
//                   : [product.inventoryLines]
//                 : [];

//               const deltaLines = await syncInventoryLines(
//                 tx,
//                 validProductId,
//                 lines,
//                 caches,
//                 [location.inflowId]
//               );

//               // Map internal delta lines back to AdjustmentService payloads
//               for (const line of deltaLines) {
//                 const targetLocId = line.targetLocationId;
//                 if (!targetLocId) continue;

//                 const adjustmentInput: StockAdjustmentLineInput & { description?: string } = {
//                   productId: line.productId,
//                   trackSerials: line.trackSerials,
//                   quantityAdjusted: line.quantityAdjusted,
//                   quantityOnHand: line.quantityOnHand,
//                   quantityReserved: line.quantityReserved,
//                   quantityAvailable: line.quantityAvailable,
//                   serials: line.serials,
//                   bins: line.bins,
//                   description: line.description,
//                 };

//                 const existingGroup = locationAdjustmentMap.get(targetLocId) ?? [];
//                 existingGroup.push(adjustmentInput);
//                 locationAdjustmentMap.set(targetLocId, existingGroup);
//               }
//             }
//           },
//           { timeout: 40000 }
//         );

//         // --- Phase B: Post Local Adjustments & Collect InFlow Payloads ---
//         const inflowBulkPayloads: InflowStockAdjustInput[] = [];

//         for (const [targetLocationId, adjustmentLines] of locationAdjustmentMap) {
//           if (adjustmentLines.length === 0) continue;

//           const postPayload: PostAdjustmentPayload = {
//             locationId: targetLocationId,
//             reasonId: reason?.inflowId || undefined,
//             remarks: `Global Sync Batch #${batchNo + 1} Mid Inventory Adjustment`,
//             performedById: modifiedBy,
//             lines: adjustmentLines,
//           };

//           // 1. Save locally
//           const postResult = await this.adjustmentService.postAdjustmentWithAdjustedReturn(postPayload);

//           // 2. Transform and accumulate for inFlow
//           const inflowPayload = mapToInflowStockAdjustInput(postResult, postPayload);
//           inflowBulkPayloads.push(inflowPayload);

//           console.log(
//             `[Inventory Sync] Local adjustment created (${postResult.adjustment.inflowId}) for location: ${targetLocationId}`
//           );
//         }

//         // --- Phase C: Bulk Send to External InFlow API ---
//         if (inflowBulkPayloads.length > 0) {
//           try {
//             console.log(
//               `[Inventory Sync] Dispatching batch #${batchNo + 1} cloud payload (${inflowBulkPayloads.length} lines, ${processedProductIds.length} products) to inFlow...`
//             );

//             await upsertStockAdjustBulk(inflowBulkPayloads);

//             console.log(`[Inventory Sync] Bulk inFlow cloud sync successful for batch #${batchNo + 1}.`);
//             successfulIds.push(...processedProductIds);
//           } catch (error) {
//             console.error(`[Inventory Sync] Failed bulk dispatch to inFlow for batch #${batchNo + 1}:`, error);
//             failedIds.push(...processedProductIds);
//           }
//         } else {
//           // No external payload needed; all Phase A items succeeded locally without changes
//           successfulIds.push(...processedProductIds);
//         }

//       } catch (transactionError) {
//         console.error(
//           `[Batch Sync Error] Batch ending with ID ${after}:`,
//           transactionError
//         );
//         throw transactionError;
//       }

//       after = batch[batch.length - 1].productId;
//       totalProcessed += batch.length;
//       batchNo++;

//       console.log(`Batch #${batchNo} completed. Processed ${totalProcessed} lines.`);

//       if (onProgress) {
//         await onProgress(totalProcessed);
//       }

//       if (INTER_BATCH_DELAY > 0) {
//         await this.sleep(INTER_BATCH_DELAY);
//       }
//     }

//     return {
//       inventoryProcessed: totalProcessed,
//       successfulIds,
//       failedIds,
//       syncedAt: new Date().toISOString(),
//     };
//   }
// }

// export const inventoryLocalSyncService = new InventorySyncService();