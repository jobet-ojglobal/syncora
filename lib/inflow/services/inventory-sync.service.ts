import { prisma } from "@/lib/prisma";
import { getInventoryLevels } from "../data/inventory";
import { syncInventoryLines } from "./inventory-lines.sync";
import { ensureProductShell } from "./ensure.service";
import { syncSingleProductInventory } from "./inventory-single.sync";

type SyncOptions = {
  onProgress?: (processedCount: number) => Promise<void>;
  batchSize?: number;
};

export class InventorySyncService {
  async sync(options?: SyncOptions, locationIds?: string[]) {
    const BATCH_SIZE = options?.batchSize || 50;

    const caches = {
      verifiedLocationIds: new Set<string>(),
      verifiedProductIds: new Set<string>(),
    };

    let after: string | undefined = undefined;
    let totalProcessed = 0;

    console.log("Starting hyper-optimized batched inventory sync...");

    while (true) {
      // 1. Fetch the paginated batch
      const batch = await getInventoryLevels(BATCH_SIZE, after);
      if (!batch || batch.length === 0) break;

      // 2. Wrap chunk operations in database transaction
      try {
        await prisma.$transaction(
          async (tx) => {
            for (const product of batch) {

              let validProductId: string | null = null;

              if (product.productId) {
                if (caches.verifiedProductIds.has(product.productId)) {
                  validProductId = product.productId;
                } else {
                  const localProduct = await tx.product.findUnique({
                    where: { inflowId: product.productId },
                    select: { inflowId: true },
                  });
      
                  if (localProduct) {
                    validProductId = localProduct.inflowId;
                    caches.verifiedProductIds.add(localProduct.inflowId);
                  } else if (product) {
                    console.warn(
                      `[Sync Notification] Product with inflowId "${product.productId}" missing locally. Syncing JIT...`
                    );
                    // Pass downstream caches into syncProduct to prevent infinite sync loops
                    const syncedProduct = await ensureProductShell(tx, product);
                    if (syncedProduct?.inflowId) {
                      validProductId = syncedProduct.inflowId;
                      caches.verifiedProductIds.add(syncedProduct.inflowId);
                    }
                  }
                }
              }

              if (!validProductId) {
                console.warn(
                  `[Sync Notification] Skipping inventory line item "${product.productId}" because productId could not be resolved.`
                );
                continue;
              }

              await syncInventoryLines(
                tx,
                validProductId,
                product.inventoryLines ?? [],
                caches,
                locationIds // 👈 Pass selected location filter down
              );
            }
          },
          {
            timeout: 40000,
          }
        );
      } catch (transactionError) {
        console.error(
          `Transaction failed for inventory batch ending with ID ${after}:`,
          transactionError
        );
      }

      // 3. Move pagination variables forward
      after = batch[batch.length - 1].productId;
      totalProcessed += batch.length;

      if (options?.onProgress) {
        await options.onProgress(totalProcessed);
      }
    }

    return {
      inventoryProcessed: totalProcessed,
      syncedAt: new Date().toISOString(),
    };
  }

  async syncSingle(productId: string, locationIds?: string[]) {
    return await syncSingleProductInventory(productId, { locationIds });
  }
}