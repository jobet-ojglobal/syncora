// services/sync/products/product-item-bom-sync.service.ts
import { prisma } from "@/lib/prisma";
import { getProductsInclude } from "../data/products"; // Your existing getProducts fetcher
import { Prisma } from "@/generated/prisma/client";

type SyncOptions = {
  onProgress?: (processedCount: number) => Promise<void>;
  batchSize?: number;
};

export class ProductItemBomSyncService {
  async sync(options?: SyncOptions) {
    const BATCH_SIZE = options?.batchSize ?? 100;
    let after: string | undefined;
    let totalProcessed = 0;

    console.log("Starting targeted Product Bill of Materials (BOM) dependency sync...");

    while (true) {
      // 1. Fetch current product batch from inFlow
      const products = await getProductsInclude(BATCH_SIZE, after, ["itemBoms"]);

      if (!products || products.length === 0) {
        break;
      }

      // 2. Filter out products that don't exist locally to prevent foreign key errors
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
      const productsToSync = products.filter((p) => existingProductIdsSet.has(p.productId));

      // 3. Process the nested sub-component lists atomically inside a transaction
      if (productsToSync.length > 0) {
        await prisma.$transaction(
          async (tx) => {
            for (const product of productsToSync) {
              // Wipe old sub-component allocations for this specific assembly parent
              await tx.productBom.deleteMany({
                where: { productId: product.productId },
              });

              if (product.itemBoms?.length) {
                await tx.productBom.createMany({
                  data: product.itemBoms.map((bom) => {
                    // Extract the raw value safely whether the payload presents an object or string fallback
                    const rawQuantity = typeof bom.quantity === "object"
                      ? bom.quantity?.standardQuantity
                      : bom.quantity;

                    return {
                      inflowId: bom.itemBomId, // Master correlation row key string from payload
                      productId: product.productId, // Parent Assembly item ID
                      childProductId: bom.childProductId, // Component item ID
                      quantity: new Prisma.Decimal(rawQuantity || "0"),
                      timestamp: bom.timestamp,
                    };
                  }),
                  skipDuplicates: true,
                });
              }
            }
          },
          { timeout: 40000 } // Extended 40s timeout window to safely process multi-row dependency trees
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