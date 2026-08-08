import { prisma } from "@/lib/prisma";
import { getLocalInventoryLines } from "../data/product-local";
import { syncInventoryLines } from "./inventory-line-sync";
import { LocalProduct } from "../types";

type SyncOptions = {
  onProgress?: (processedCount: number) => Promise<void>;
  batchSize?: number;
};

export class InventorySyncService {
  async sync(
    location: {
      inflowId: string;
      name: string;
      url: string;
    },
    options: SyncOptions,
    selectedRecords?: any[],
    syncedAll?: boolean
  ) {
    const { onProgress, batchSize = 50 } = options;

    // 1. Fetch remote inventory lines
    let inventoryLines: LocalProduct[] = await getLocalInventoryLines(location.url);

    // 2. Filter records if selectedRecords is provided
    if (!syncedAll && selectedRecords && selectedRecords.length > 0) {
      const allowedIds = new Set(selectedRecords.map((item) => String(item.id)));
      inventoryLines = inventoryLines.filter((data) =>
        allowedIds.has(String(data.productId))
      );
    }

    let processed = 0;
    const syncResults: Array<{ productId: string }> = [];

    // Memory cache mapping localId -> resolved productId across batches
    const caches = {
      productMapCache: new Map<string, string>(), // Key: `${location.inflowId}_${localId}` -> Value: global productId
      verifiedLocationIds: new Set<string>(),
    };

    // 3. Process records in controlled batches
    for (let i = 0; i < inventoryLines.length; i += batchSize) {
      const batch = inventoryLines.slice(i, i + batchSize);

      try {
        await prisma.$transaction(
          async (tx) => {
            for (const product of batch) {
              const localProductId =product.productId;
            //   if (isNaN(localProductIdNum)) {
            //     console.warn(`[Sync Warning] Invalid local product ID: ${product.productId}`);
            //     continue;
            //   }

              const cacheKey = `${location.inflowId}_${localProductId}`;
              let validProductId: string | null = caches.productMapCache.get(cacheKey) ?? null;

              // If not cached, attempt mapping via ProductLocationMap first, then fallback to direct Product check
              if (!validProductId) {
                const mappedProduct = await tx.productLocationMap.findFirst({
                  where: {
                    locationId: location.inflowId,
                    localId: Number(localProductId),
                  },
                  select: { productId: true },
                });

                if (mappedProduct) {
                  validProductId = mappedProduct.productId;
                } 
              }

              if (!validProductId) {
                console.warn(
                  `[Sync Notification] Skipping item "${product.productId}" because ProductLocationMap entry could not be found for location "${location.inflowId}".`
                );
                continue;
              }

              const lines = product.inventoryLines
                ? Array.isArray(product.inventoryLines)
                  ? product.inventoryLines
                  : [product.inventoryLines]
                : [];

              await syncInventoryLines(
                tx,
                validProductId,
                lines,
                caches,
                [location.inflowId]
              );

              syncResults.push({ productId: validProductId });
              processed++;
            }
          },
          { timeout: 40000 }
        );

        if (onProgress) {
          await onProgress(processed);
        }
      } catch (transactionError) {
        console.error(
          `Transaction failed for batch starting at index ${i}:`,
          transactionError
        );
      }
    }

    return {
      itemProcessed: processed,
      syncedAt: new Date().toISOString(),
      results: syncResults,
    };
  }
}