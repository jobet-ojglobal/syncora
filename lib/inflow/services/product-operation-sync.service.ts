// services/sync/products/product-operation-sync.service.ts
import { prisma } from "@/lib/prisma";
import { getProductsInclude } from "../data/products"; // Your existing getProductsInclude fetcher
import { Prisma } from "@/generated/prisma/client";

type SyncOptions = {
  onProgress?: (processedCount: number) => Promise<void>;
  batchSize?: number;
};

export class ProductOperationSyncService {
  async sync(options?: SyncOptions) {
    const BATCH_SIZE = options?.batchSize ?? 100;
    let after: string | undefined;
    let totalProcessed = 0;

    console.log("Starting targeted Product Operations execution sync...");

    while (true) {
      // 1. Pull current products page from inFlow
      const products = await getProductsInclude(BATCH_SIZE, after, ["productOperations"]);

      if (!products || products.length === 0) {
        break;
      }

      // 2. Identify products that exist locally to prevent foreign key errors
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

      // 3. Atomically overwrite instructions inside a transaction batch
      if (productsToSync.length > 0) {
        await prisma.$transaction(
          async (tx) => {
            for (const product of productsToSync) {
              // Wipe old step configurations for this specific product record
              await tx.productOperation.deleteMany({
                where: { productId: product.productId },
              });

              if (product.productOperations?.length) {
                await tx.productOperation.createMany({
                  data: product.productOperations.map((po) => ({
                    inflowId: po.productOperationId, // Master payload unique row tracking ID
                    productId: product.productId,
                    operationTypeId: po.operationTypeId,
                    // Parse lineNum safely to an integer to preserve sort order fields
                    lineNum: typeof po.lineNum === "string" ? parseInt(po.lineNum, 10) : po.lineNum,
                    // Map numeric strings cleanly to Prisma Decimals
                    cost: new Prisma.Decimal(po.cost || 0),
                    estimatedPerHourCost: new Prisma.Decimal(po.estimatedPerHourCost || 0),
                    estimatedSeconds: new Prisma.Decimal(po.estimatedSeconds || 0),
                    instructions: po.instructions,
                    trackTime: po.trackTime ?? false,
                  })),
                  skipDuplicates: true,
                });
              }
            }
          },
          { timeout: 35000 } // Safe operation block timeout window
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