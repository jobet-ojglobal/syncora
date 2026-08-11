import { prisma } from "@/lib/prisma";
import { syncInventoryLines } from "./inventory-line-sync";
import { LocalProductInventory, SyncOptions } from "../types";
import { getLocalInventoryLines } from "../data/product-local";
import { getMidSyncQueue } from "@/lib/queues/sync.queue";
import { 
  AdjustmentService
} from "@/services/stock-adjustment.service";
import { StockAdjustmentLineInput } from "@/schemas/stock-adjustment.schema";

export class InventorySyncService {
  private adjustmentService: AdjustmentService;

  constructor() {
    // Inject queue provider into AdjustmentService
    const queueProvider = {
      addJob: async (jobName: string, payload: any) => {
        const queue = getMidSyncQueue();
        await queue.add(jobName, payload);
      },
    };

    this.adjustmentService = new AdjustmentService(prisma, queueProvider);
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
    const { onProgress, checkSignal, batchSize, delayBetweenBatchesMs } = options;
    const BATCH_SIZE = batchSize ?? 500;
    const INTER_BATCH_DELAY = delayBetweenBatchesMs ?? 300;
    const CLIENT_RETRIES = 1;

    const reason = await this.getAdjustmentReason("Integration import");
    const modifiedBy = "56bfcf3b-3e98-4098-ae8f-2adcb657cb57";

    const caches = {
      verifiedLocationIds: new Set<string>(),
      verifiedProductIds: new Map<string, string>(),
    };

    let batchNo = 0;
    let totalProcessed = 0;
    let hasMore = true;

    const allowedIds =
      !syncedAll && selectedRecords && selectedRecords.length > 0
        ? new Set(selectedRecords.map((item) => String(item.id ?? item.productId)))
        : null;

    console.log(
      `Starting batch inventory sync map (Batch Size: ${BATCH_SIZE}, Throttle: ${INTER_BATCH_DELAY}ms)...`
    );

    while (hasMore) {
      // 1. Check signal before starting remote fetch
      if (checkSignal) await checkSignal();

      const rawBatch: LocalProductInventory[] = await getLocalInventoryLines(
        location.url,
        BATCH_SIZE,
        after,
        CLIENT_RETRIES
      );

      if (!rawBatch || rawBatch.length === 0) break;

      after = String(rawBatch[rawBatch.length - 1].productId);
      if (rawBatch.length < BATCH_SIZE) hasMore = false;

      let batch = rawBatch;
      if (allowedIds) {
        batch = batch.filter((item) => allowedIds.has(String(item.productId)));
      }

      if (batch.length === 0) continue;

      // 2. Check signal before DB processing
      if (checkSignal) await checkSignal();

      try {
        // Collect adjustments per target location during calculation
        const locationAdjustmentMap = new Map<string, StockAdjustmentLineInput[]>();

        // Phase A: Calculate changes per product line inside transaction context if needed
        await prisma.$transaction(
          async (tx) => {
            for (const product of batch) {
              let validProductId: string | null = null;

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

              // Map internal delta lines back to AdjustmentService payloads
              for (const line of deltaLines) {
                const targetLocId = (line as any).targetLocationId;
                if (!targetLocId) continue;

                const adjustmentInput: StockAdjustmentLineInput & { description?: string } = {
                  productId: line.productId,
                  trackSerials: line.trackSerials,
                  quantityAdjusted: line.quantityAdjusted,
                  quantityOnHand: line.quantityOnHand,
                  quantityReserved: line.quantityReserved,
                  quantityAvailable: line.quantityAvailable,
                  serials: line.serials,
                  bins: line.bins,
                  description: line.description
                };

                const existingGroup = locationAdjustmentMap.get(targetLocId) ?? [];
                existingGroup.push(adjustmentInput);
                locationAdjustmentMap.set(targetLocId, existingGroup);
              }
            }
          },
          { timeout: 40000 }
        );

        // Phase B: Post location adjustments through AdjustmentService
        for (const [targetLocationId, adjustmentLines] of locationAdjustmentMap) {
          if (adjustmentLines.length === 0) continue;

          await this.adjustmentService.postAdjustment({
            locationId: targetLocationId,
            reasonId: reason?.inflowId || undefined,
            remarks: `Batch Sync #${batchNo + 1} Inventory Adjustment`,
            performedById: modifiedBy,
            lines: adjustmentLines,
          });

          console.log(
            `[Service Sync] Processed ${adjustmentLines.length} lines for location: ${targetLocationId}`
          );
        }
      } catch (transactionError) {
        console.error(
          `[Batch Sync Error] Batch ending with ID ${after}:`,
          transactionError
        );
        throw transactionError;
      }

      after = batch[batch.length - 1].productId;
      totalProcessed += batch.length;
      batchNo++;

      console.log(`Batch #${batchNo} completed. Processed ${totalProcessed} lines.`);

      if (onProgress) {
        await onProgress(totalProcessed);
      }

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
    // Single product implementation
  }
}