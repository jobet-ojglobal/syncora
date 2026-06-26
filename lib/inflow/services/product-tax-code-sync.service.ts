// services/sync/products/product-tax-code-sync.service.ts
import { prisma } from "@/lib/prisma";
import { getProductsInclude } from "../data/products"; // Your existing getProducts fetcher

type SyncOptions = {
  onProgress?: (processedCount: number) => Promise<void>;
  batchSize?: number;
};

export class ProductTaxCodeSyncService {
  async sync(options?: SyncOptions) {
    const BATCH_SIZE = options?.batchSize ?? 100;
    let after: string | undefined;
    let totalProcessed = 0;

    console.log("Starting targeted Product Tax Code entity mapping sync...");

    while (true) {
      // 1. Fetch products from inFlow
      const products = await getProductsInclude(BATCH_SIZE, after, ["taxCodes"]);

      if (!products || products.length === 0) {
        break;
      }

      // 2. Extract inFlow product IDs and find which ones exist locally
      const inflowProductIds = products.map((p) => p.productId);
      const existingProducts = await prisma.product.findMany({
        where: {
          inflowId: { in: inflowProductIds },
        },
        select: {
          inflowId: true,
        },
      });

      const existingProductIdsSet = new Set(existingProducts.map((p) => p.inflowId));
      
      // Filter out payloads belonging to missing local products
      const productsToSync = products.filter((p) => existingProductIdsSet.has(p.productId));

      // 3. Perform the atomic deletions and inserts inside a transaction
      if (productsToSync.length > 0) {
        await prisma.$transaction(
          async (tx) => {
            for (const product of productsToSync) {
              // Wipe old mapping assignments for this specific product
              await tx.productTaxCode.deleteMany({
                where: { productId: product.productId },
              });

              if (product.taxCodes?.length) {
                await tx.productTaxCode.createMany({
                  data: product.taxCodes.map((tc) => ({
                    productTaxCodeId: tc.productTaxCodeId, // Explicit unique layout ID from payload
                    productId: product.productId,
                    taxCodeId: tc.taxCodeId,
                    taxingSchemeId: tc.taxingSchemeId,
                    timestamp: tc.timestamp,
                  })),
                  skipDuplicates: true,
                });
              }
            }
          },
          { timeout: 30000 } // Isolated 30s processing window
        );
      }

      totalProcessed += products.length;
      after = products[products.length - 1].productId;

      if (options?.onProgress) {
        await options.onProgress(totalProcessed);
      }

      if (products.length < BATCH_SIZE) {
        break;
      }
    }

    return {
      totalProductsScanned: totalProcessed,
      syncedAt: new Date().toISOString(),
    };
  }
}