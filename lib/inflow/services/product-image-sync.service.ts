// services/sync/products/product-image-sync.service.ts
import { prisma } from "@/lib/prisma";
import { getProductsInclude } from "../data/products"; // Your existing getProducts fetcher

type SyncOptions = {
  onProgress?: (processedCount: number) => Promise<void>;
  batchSize?: number;
};

export class ProductImageSyncService {
  async sync(options?: SyncOptions) {
    const BATCH_SIZE = options?.batchSize ?? 100;
    let after: string | undefined;
    let totalProcessed = 0;

    console.log("Starting targeted Product Image isolation asset sync...");

    while (true) {
      // 1. Pull products batching from inFlow
      const products = await getProductsInclude(BATCH_SIZE, after, ["images"]);

      if (!products || products.length === 0) {
        break;
      }

      // 2. Filter out products that don't exist locally to prevent foreign key issues
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

      // 3. Process the updates atomically inside a transaction chunk
      if (productsToSync.length > 0) {
        await prisma.$transaction(
          async (tx) => {
            for (const product of productsToSync) {
              // Wipe out the existing local images for this product before rewriting them
              await tx.productImage.deleteMany({
                where: { productId: product.productId },
              });

              if (product.images?.length) {
                await tx.productImage.createMany({
                  data: product.images.map((img, idx) => ({
                    inflowId: img.imageId,
                    groupId: null,
                    productId:  product.productId, 
                    position: idx,
                    largeUrl: img.originalUrl || img.originalUrl || null,
                    mediumUncroppedUrl: img.mediumUncroppedUrl || img.originalUrl || null,
                    mediumUrl: img.mediumUrl || img.originalUrl || null,
                    originalUrl: img.originalUrl || null,
                    smallUrl: img.smallUrl || img.originalUrl || null,
                    thumbUrl: img.thumbUrl || img.originalUrl || null,
                  })),
                  skipDuplicates: true,
                });
              }
            }
          },
          { timeout: 30000 } // Safe, isolated timeout for asset records modification
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