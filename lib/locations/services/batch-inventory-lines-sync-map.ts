import { prisma } from "@/lib/prisma";
import { syncInventoryLines } from "./inventory-line-sync.return-adjustments";
import { LocalProductInventory } from "../types";
import { getLocalBatchInventory } from "../data/product-local";
import { MidWebhookJobData } from "@/lib/workers/mid.worker";
import { getMidSyncQueue } from "@/lib/queues/sync.queue";
import { generateAdjustmentNumber } from "@/utils/adjustment-number";
import { InflowStockAdjustInput, InflowStockAdjustmentLine } from "@/lib/inflow/types";
import { SyncOptions } from "@/lib/workers/types";

export class InventorySyncService {
  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async getAdjustmentReason(reason: string) {
    const adjReason = prisma.adjustmentReason.findFirst({
      where: { name: reason },
      select: { inflowId: true }
    });

    return adjReason;
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
      after: string | undefined = undefined,
    ) {
    const { onProgress, checkSignal,  batchSize, delayBetweenBatchesMs  } = options;
    const BATCH_SIZE = batchSize ?? 500;
    const INTER_BATCH_DELAY = delayBetweenBatchesMs ?? 300;

    const reason = await this.getAdjustmentReason('Integration import');
    const modifiedBy = "8ff3e71d-eb02-425d-8e0f-00a69fc8e482";

    const caches = {
      verifiedLocationIds: new Set<string>(),
      verifiedProductIds: new Map<string, string>(),
    };

    let batchNo = 0;
    let totalProcessed = 0;
    let hasMore = true;

    const allowedIds =
      !syncedAll && selectedRecords && selectedRecords.length > 0
        ? new Set(selectedRecords.map((id) => String(id)))
        : null;

    console.log(`Starting batch inventory sync map (Batch Size: ${BATCH_SIZE}, Throttle: ${INTER_BATCH_DELAY}ms)...`);

    while (hasMore) {

      // 1. Check signal before starting remote fetch
      if (checkSignal) await checkSignal();

      const rawBatch: LocalProductInventory[] = await getLocalBatchInventory(
        location.url,
        BATCH_SIZE,
        after,
      );

      if (!rawBatch || rawBatch.length === 0) break;

      after = String(rawBatch[rawBatch.length - 1].productId);
      if (rawBatch.length < BATCH_SIZE) hasMore = false;

      let batch = rawBatch;
      if (allowedIds) {
        batch = batch.filter((item) => allowedIds.has(String(item.productId)));
      }

      if (batch.length === 0) continue;

      // 2. Check signal before starting long DB transaction
      if (checkSignal) await checkSignal();

      const batchAdjustmentLines: InflowStockAdjustmentLine[] = [];

      // 2. Wrap chunk operations in database transaction
      try {
        await prisma.$transaction(
          async (tx) => {
            for (const product of batch) {
          
              let validProductId: string | null = null;

              if (product.productId) {
                const cacheKey = `${location.inflowId}_${product.productId}`;

                // 1. Check map cache first
                if (caches.verifiedProductIds.has(cacheKey)) {
                  validProductId = caches.verifiedProductIds.get(cacheKey) ?? null;
                } else {
                  // 2. Query database if not in cache
                  const mappedProduct = await tx.productLocationMap.findFirst({
                    where: {
                      locationId: location.inflowId,
                      localId: Number(product.productId),
                    },
                    select: { productId: true },
                  });

                  if (mappedProduct) {
                    validProductId = mappedProduct.productId;
                    
                    // 3. Store both cache key and resolved productId in the Map
                    caches.verifiedProductIds.set(cacheKey, validProductId);
                  }
                }
              }

              if (!validProductId) {
                console.warn(
                  `[Sync Notification] Skipping inventory line item "${product.productId}" because productId could not be resolved.`
                );
                continue;
              }

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

              if (deltaLines.length > 0) {
                batchAdjustmentLines.push(...deltaLines);
              }
        
            }

            // 3. Dispatch to midSync worker if deltas exist for this batch
            if (batchAdjustmentLines.length > 0 && reason) {
              const nowIso = new Date().toISOString();

              // Step A: Group lines by the resolved target location (linked location or base location)
              const linesByLocation = new Map<string, InflowStockAdjustmentLine[]>();

              for (const line of batchAdjustmentLines) {
                // Read the attached targetLocationId (or fallback to sublocation if stored there)
                const targetLocId = (line as any).targetLocationId || location.inflowId;
                if (!targetLocId) continue;

                const existingGroup = linesByLocation.get(targetLocId) ?? [];
                existingGroup.push(line);
                linesByLocation.set(targetLocId, existingGroup);
              }

              // Step B: Build separate jobs for each location group
              const jobsToQueue = [];

              for (const [targetLocationId, groupedLines] of linesByLocation) {
                const adjustmentNo = await generateAdjustmentNumber(tx);

                // Clean up temporary transport properties while preserving sublocation ID/Name
                const sanitizedLines: InflowStockAdjustmentLine[] = groupedLines.map((line) => {
                  const { targetLocationId: _, ...cleanLine } = line as any;
                  return {
                    ...cleanLine,
                    // Keep the sublocation ID or set empty string if no sublocation applies
                    sublocation: cleanLine.sublocation ?? "", 
                  };
                });

                const adjustmentPayload: InflowStockAdjustInput = {
                  stockAdjustmentId: crypto.randomUUID().toLowerCase(),
                  adjustmentNumber: adjustmentNo,
                  isCancelled: false,
                  lastModifiedById: modifiedBy,
                  adjustmentReasonId: reason.inflowId,
                  date: nowIso,
                  locationId: targetLocationId, // Set locationId to the linked/target location ID
                  remarks: `Batch Sync #${batchNo + 1} Inventory Adjustment`,
                  lines: sanitizedLines,
                };

                jobsToQueue.push({
                  name: `stock-adjustment-sync-batch-${batchNo + 1}-${targetLocationId}`,
                  data: {
                    source: "STOCK_ADJUST_UPSERT_CLOUD",
                    model: "StockAdjustment",
                    payload: adjustmentPayload,
                    timestamp: nowIso,
                  } satisfies MidWebhookJobData,
                });
              }

              console.log(`${jobsToQueue.length} adjustment payload(s)`);

              // Step C: Bulk enqueue all grouped jobs
              if (jobsToQueue.length > 0) {
                await getMidSyncQueue().addBulk(jobsToQueue);
                console.log(
                  `[Queue Success] Queued ${jobsToQueue.length} adjustment payload(s) across ${linesByLocation.size} location group(s) with total ${batchAdjustmentLines.length} line item(s).`
                );
              }
            }
          },
          { timeout: 40000 }
        );
      } catch (transactionError) {
        console.error(`[Batch Transaction Error] Batch ending with ID ${after}:`, transactionError);
        throw transactionError;
      }

      after = batch[batch.length - 1].productId;
      totalProcessed += batch.length;
      batchNo++;

      console.log(`Batch #${batchNo} completed. Processed ${totalProcessed} inventory lines.`);
      
      // 3. Update progress (this will throw if cancelled mid-batch)
      if (onProgress) {
        await onProgress(totalProcessed);
      }

      // Pace out requests to eliminate HTTP 429 rate limit triggers
      if (INTER_BATCH_DELAY > 0) {
        await this.sleep(INTER_BATCH_DELAY);
      }
    }

    return {
      inventoryProcessed: totalProcessed,
      syncedAt: new Date().toISOString(),
    };
  }

  async syncSingle(productId: string, locationIds?: string[]) {
    // return await syncSingleProductInventory(productId, { locationIds });
  }
}