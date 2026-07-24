import { prisma } from "@/lib/prisma";
import { getInventoryByProduct } from "../data/inventory";
import { syncInventoryLines } from "./inventory-lines.sync";
import { ensureProductShell } from "./ensure.service";

type SingleSyncOptions = {
  /** Optional array of location IDs to restrict stock line syncing */
  locationIds?: string[];
};

/**
 * Syncs inventory levels and sublocation bins for a single product.
 *
 * @param targetProductId - The external/inFlow `productId` to sync.
 * @param options - Optional filters such as selected target location IDs.
 */
export async function syncSingleProductInventory(
  targetProductId: string,
  options?: SingleSyncOptions
) {
  console.log(`[Single Sync] Starting inventory sync for product "${targetProductId}"...`);

  // 1. Fetch raw product & inventory lines payload for the target product
  const productData = await getInventoryByProduct(targetProductId);

  if (!productData || !productData.productId) {
    throw new Error(`Product with ID "${targetProductId}" could not be found downstream.`);
  }

  // Caches local state to minimize redundant DB calls during nested child sync calls
  const caches = {
    verifiedLocationIds: new Set<string>(),
    verifiedProductIds: new Set<string>(),
  };

  // 2. Execute transactional database synchronization
  const result = await prisma.$transaction(
    async (tx) => {
      let validProductId: string | null = null;

      // Check if product exists locally in database
      const localProduct = await tx.product.findUnique({
        where: { inflowId: productData.productId },
        select: { inflowId: true },
      });

      if (localProduct) {
        validProductId = localProduct.inflowId;
        caches.verifiedProductIds.add(localProduct.inflowId);
      } else {
        console.warn(
          `[Single Sync] Product "${productData.productId}" missing locally. Syncing JIT shell...`
        );
        // Ensure product shell exists prior to processing inventory lines
        const syncedProduct = await ensureProductShell(tx, productData);
        if (syncedProduct?.inflowId) {
          validProductId = syncedProduct.inflowId;
          caches.verifiedProductIds.add(syncedProduct.inflowId);
        }
      }

      if (!validProductId) {
        throw new Error(
          `[Single Sync Failed] Unable to resolve or shell-create product "${productData.productId}".`
        );
      }

      // 3. Process inventory line updates, sublocation bins, & ledger entries
      await syncInventoryLines(
        tx,
        validProductId,
        productData.inventoryLines ?? [],
        caches,
        options?.locationIds
      );

      return {
        productId: validProductId,
        linesCount: productData.inventoryLines?.length ?? 0,
        syncedAt: new Date().toISOString(),
      };
    },
    {
      timeout: 20000, // 20s timeout for single-product scope
    }
  );

  console.log(`[Single Sync] Successfully synchronized product "${targetProductId}".`);

  return result;
}