import { prisma } from "@/lib/prisma";
import { getInventoryLevels } from "../data/inventory";
import { syncInventoryLines } from "./inventory-lines.sync";
import { ensureProductShell } from "./ensure.service";
import { syncSingleProductInventory } from "./inventory-single.sync";

type SyncOptions = {
  onProgress?: (processedCount: number) => Promise<void>;
  checkSignal?: () => Promise<void>;
  batchSize?: number;
  delayBetweenBatchesMs?: number;
};

export class InventorySyncService {
  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  
  async sync(options?: SyncOptions, locationIds?: string[]) {
    const BATCH_SIZE = options?.batchSize ?? 100;
    const INTER_BATCH_DELAY = options?.delayBetweenBatchesMs ?? 300;
    const CLIENT_RETRIES = 1;

    const caches = {
      verifiedLocationIds: new Set<string>(),
      verifiedProductIds: new Set<string>(),
    };

    let after: string | undefined = undefined;
    let totalProcessed = 0;

    console.log(`Starting inventory sync (Batch Size: ${BATCH_SIZE})...`);
    let batchNo = 0;

    while (true) {
      // 1. Fetch the paginated batch
      // const batch = await getInventoryLevels(BATCH_SIZE, after);
      // if (!batch || batch.length === 0) break;

      // 1. Check signal before starting remote fetch
      if (options?.checkSignal) await options.checkSignal();

      const batch = await getInventoryLevels(BATCH_SIZE, after, CLIENT_RETRIES);
      if (!batch || batch.length === 0) break;

      // 2. Check signal before starting long DB transaction
      if (options?.checkSignal) await options.checkSignal();

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
        console.error(`[Batch Transaction Error] Batch ending with ID ${after}:`, transactionError);
        throw transactionError;
      }

      after = batch[batch.length - 1].productId;
      totalProcessed += batch.length;
      batchNo++;

      console.log(`Batch #${batchNo} completed. Processed ${totalProcessed} inventory lines.`);
      
      // 3. Update progress (this will throw if cancelled mid-batch)
      if (options?.onProgress) {
        await options.onProgress(totalProcessed);
      }

      // Pace out requests to eliminate HTTP 429 rate limit triggers
      if (INTER_BATCH_DELAY > 0) {
        await this.sleep(INTER_BATCH_DELAY);
      }

      // } catch (transactionError) {
      //   console.error(
      //     `Transaction failed for inventory batch ending with ID ${after}:`,
      //     transactionError
      //   );
      // }

      // // 3. Move pagination variables forward
      // after = batch[batch.length - 1].productId;
      // totalProcessed += batch.length;

      // if (options?.onProgress) {
      //   await options.onProgress(totalProcessed);
      // }
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