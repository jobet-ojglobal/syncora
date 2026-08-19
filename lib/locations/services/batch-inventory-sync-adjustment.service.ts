import { prisma } from "@/lib/prisma";
import { syncInventoryLines } from "./inventory-line-sync";
import { LocalProductInventory, SyncOptions } from "../types";
import { getLocalInventoryLines } from "../data/product-local";
import { 
  AdjustmentService,
  PostAdjustmentPayload,
  ProcessedAdjustmentResult
} from "@/services/stock-adjustment.service";
import { InflowStockAdjustInput } from "@/lib/inflow/types";
import { upsertStockAdjustBulk } from "@/lib/inflow/data/inventory";

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

export function mapToInflowStockAdjustInput(
  result: ProcessedAdjustmentResult,
  payload: PostAdjustmentPayload
): InflowStockAdjustInput {
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
      // Delta change calculation
      const qtyDelta = createdLine.quantityAdjusted ?? createdLine.quantityOnHand;

      // Ensure serial numbers are clean strings
      // const serials = (createdLine.serials || []).map((s) => String(s).trim()).filter(Boolean);

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

  return inflowPayload;
}

export class InventorySyncService {
  private adjustmentService: AdjustmentService;

  constructor() {
    this.adjustmentService = new AdjustmentService(prisma);
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async getAdjustmentReason(reasonName: string) {
    return await prisma.adjustmentReason.findFirst({
      where: { name: reasonName },
      select: { id: true, name: true, inflowId: true },
    });
  }

  async sync(
    location: {
      inflowId: string;
      name: string;
      url: string;
    },
    options: SyncOptions,
    selectedRecords?: any[],
    syncedAll?: boolean,
    after: string | undefined = undefined
  ) {
    const syncStartTime = performance.now();

    const { onProgress, checkSignal, batchSize, delayBetweenBatchesMs } = options;
    const BATCH_SIZE = batchSize ?? 100;
    const INTER_BATCH_DELAY = delayBetweenBatchesMs ?? 300;
    const CLIENT_RETRIES = 3;
    const REQUEST_TIMEOUT_MS = 15000;

    const reason = await this.getAdjustmentReason("Integration import");
    const modifiedBy = "56bfcf3b-3e98-4098-ae8f-2adcb657cb57";

    const caches = {
      verifiedLocationIds: new Set<string>(),
      verifiedProductIds: new Map<string, string>(),
    };

    let batchNo = 0;
    let totalProcessed = 0;
    let hasMore = true;

    // Detailed execution & error tracking maps
    const successfulIds: string[] = [];
    const failedIds: string[] = [];
    const errorDetails: Array<{ productId: string; batchNo: number; error: string }> = [];

    const allowedIds =
      !syncedAll && selectedRecords && selectedRecords.length > 0
        ? new Set(selectedRecords.map((item) => String(item.id ?? item.productId)))
        : null;

    console.log(
      `Starting batch inventory sync map (Batch Size: ${BATCH_SIZE}, Throttle: ${INTER_BATCH_DELAY}ms)...`
    );

    while (hasMore) {
      const batchStartTime = performance.now();

      // 1. Check signal before starting remote fetch
      if (checkSignal) await checkSignal();

      const fetchStartTime = performance.now();
      const rawBatch: LocalProductInventory[] = await getLocalInventoryLines(
        location.url,
        BATCH_SIZE,
        after,
        CLIENT_RETRIES,
        REQUEST_TIMEOUT_MS
      );
      const fetchTimeMs = (performance.now() - fetchStartTime).toFixed(2);

      if (!rawBatch || rawBatch.length === 0) break;

      after = String(rawBatch[rawBatch.length - 1].productId);
      if (rawBatch.length < BATCH_SIZE) hasMore = false;

      let batch = rawBatch;
      if (allowedIds) {
        batch = batch.filter((item) => allowedIds.has(String(item.productId)));
      }

      if (batch.length === 0) continue;

      if (checkSignal) await checkSignal();

      try {
        const locationAdjustmentMap = new Map<string, StockAdjustmentLineInput[]>();
        const processedProductIds: string[] = [];

        // --- Phase A: Local DB Processing inside Transaction ---
        const phaseAStart = performance.now();

        await prisma.$transaction(
          async (tx) => {
            for (const product of batch) {
              let validProductId: string | null = null;

              if (checkSignal) await checkSignal();

              if (product.productId) {
                const cacheKey = `${location.inflowId}_${product.productId}`;

                if (caches.verifiedProductIds.has(cacheKey)) {
                  validProductId = caches.verifiedProductIds.get(cacheKey) ?? null;
                } else {
                  const mappedProduct = await tx.productLocationMap.findFirst({
                    where: {
                      locationId: location.inflowId,
                      localId: Number(product.productId),
                    },
                    select: { productId: true },
                  });

                  if (mappedProduct) {
                    validProductId = mappedProduct.productId;
                    caches.verifiedProductIds.set(cacheKey, validProductId);
                  }
                }
              }

              if (!validProductId) {
                console.warn(
                  `[Sync Notification] Skipping line item "${product.productId}": Unresolved productId.`
                );
                continue;
              }

              processedProductIds.push(validProductId);

              const lines = product.inventoryLines
                ? Array.isArray(product.inventoryLines)
                  ? product.inventoryLines
                  : [product.inventoryLines]
                : [];

              const deltaLines = await syncInventoryLines(
                tx,
                validProductId,
                lines,
                caches,
                [location.inflowId]
              );

              for (const line of deltaLines) {
                const targetLocId = line.targetLocationId;
                if (!targetLocId) continue;

                const adjustmentInput: StockAdjustmentLineInput & { description?: string } = {
                  productId: line.productId,
                  trackSerials: line.trackSerials,
                  quantityAdjusted: line.quantityAdjusted,
                  quantityOnHand: line.quantityOnHand,
                  quantityReserved: line.quantityReserved,
                  quantityAvailable: line.quantityAvailable,
                  serials: line.serials || [],
                  bins: line.bins || [],
                  description: line.description,
                };

                const existingGroup = locationAdjustmentMap.get(targetLocId) ?? [];
                existingGroup.push(adjustmentInput);
                locationAdjustmentMap.set(targetLocId, existingGroup);
              }
            }
          },
          { timeout: 40000 }
        );

        const phaseATimeMs = (performance.now() - phaseAStart).toFixed(2);

        // --- Phase B: Save Local Adjustments ---
        const phaseBStart = performance.now();
        const inflowBulkPayloads: InflowStockAdjustInput[] = [];

        for (const [targetLocationId, adjustmentLines] of locationAdjustmentMap) {
          if (adjustmentLines.length === 0) continue;

          const postPayload: PostAdjustmentPayload = {
            locationId: targetLocationId,
            reasonId: reason?.inflowId || undefined,
            remarks: `Global Sync Batch #${batchNo + 1} Mid Inventory Adjustment`,
            performedById: modifiedBy,
            lines: adjustmentLines,
          };

          const postResult = await this.adjustmentService.postAdjustmentWithAdjustedReturn(postPayload);
          const inflowPayload = mapToInflowStockAdjustInput(postResult, postPayload);
          inflowBulkPayloads.push(inflowPayload);
        }

        const phaseBTimeMs = (performance.now() - phaseBStart).toFixed(2);

        // --- Phase C: Dispatch to External InFlow API ---
        const phaseCStart = performance.now();

        if (inflowBulkPayloads.length > 0) {
          try {
            console.log(
              `[Inventory Sync] Dispatching batch #${batchNo + 1} (${inflowBulkPayloads.length} payloads, ${processedProductIds.length} products) to inFlow...`
            );

            await upsertStockAdjustBulk(inflowBulkPayloads);

            const phaseCTimeMs = (performance.now() - phaseCStart).toFixed(2);
            console.log(`[Inventory Sync] Bulk inFlow cloud sync successful for batch #${batchNo + 1} (${phaseCTimeMs}ms).`);
            
            successfulIds.push(...processedProductIds);
          } catch (error: any) {
            const errorMessage = error?.message || String(error);
            console.error(`[Inventory Sync] Failed bulk dispatch to inFlow for batch #${batchNo + 1}:`, errorMessage);

            // Record failure for all product IDs in this failed batch
            failedIds.push(...processedProductIds);
            processedProductIds.forEach((id) => {
              errorDetails.push({
                productId: id,
                batchNo: batchNo + 1,
                error: errorMessage,
              });
            });
          }
        } else {
          successfulIds.push(...processedProductIds);
        }

        const totalBatchTimeMs = (performance.now() - batchStartTime).toFixed(2);
        console.log(
          `[Batch #${batchNo + 1} Timings] Total: ${totalBatchTimeMs}ms | Fetch: ${fetchTimeMs}ms | Phase A (DB): ${phaseATimeMs}ms | Phase B (Post): ${phaseBTimeMs}ms`
        );

      } catch (transactionError: any) {
        console.error(`[Batch Sync Error] Batch #${batchNo + 1} ending with ID ${after}:`, transactionError);
        throw transactionError;
      }

      after = batch[batch.length - 1].productId;
      totalProcessed += batch.length;
      batchNo++;

      if (onProgress) {
        await onProgress(totalProcessed);
      }

      if (INTER_BATCH_DELAY > 0) {
        await this.sleep(INTER_BATCH_DELAY);
      }
    }

    const totalSyncTimeSec = ((performance.now() - syncStartTime) / 1000).toFixed(2);
    console.log(`Sync Process Finished in ${totalSyncTimeSec}s. Total Items: ${totalProcessed}. Successful: ${successfulIds.length}, Failed: ${failedIds.length}`);

    return {
      inventoryProcessed: totalProcessed,
      successfulIds,
      failedIds,
      errorDetails, // Contains detailed per-product error breakdown
      syncedAt: new Date().toISOString(),
      executionTimeSeconds: Number(totalSyncTimeSec),
    };
  }
}

export const inventoryLocalSyncService = new InventorySyncService();

// import { prisma } from "@/lib/prisma";
// import { syncInventoryLines } from "./inventory-line-sync";
// import { LocalProductInventory, SyncOptions } from "../types";
// import { getLocalInventoryLines } from "../data/product-local";
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
//     const modifiedBy = "56bfcf3b-3e98-4098-ae8f-2adcb657cb57";

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

//       const rawBatch: LocalProductInventory[] = await getLocalInventoryLines(
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