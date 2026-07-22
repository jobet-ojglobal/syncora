// services/sync/products/product-price-sync.service.ts
import { prisma } from "@/lib/prisma";
import { getProductsInclude } from "../data/products"; // Your existing getProducts fetcher
import { Prisma } from "@/generated/prisma/client";

type SyncOptions = {
  onProgress?: (processedCount: number) => Promise<void>;
  batchSize?: number;
};

export class ProductPriceSyncService {
  async sync(options?: SyncOptions) {
    const BATCH_SIZE = options?.batchSize ?? 100;
    let after: string | undefined;
    let totalProcessed = 0;

    console.log("Starting targeted Product Prices calculation tier sync...");

    while (true) {
      // 1. Pull the current product chunk from inFlow
      const products = await getProductsInclude(BATCH_SIZE, after, ["prices.pricingScheme.currency"]);

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

      // 3. Atomically overwrite price logs inside a transaction batch
      if (productsToSync.length > 0) {
        await prisma.$transaction(
          async (tx) => {
            for (const product of productsToSync) {
              // Wipe out previous pricing scheme records for this explicit product to prevent duplicates
              await tx.productPrice.deleteMany({
                where: { productId: product.productId },
              });

              if (product.prices?.length) {
                await tx.productPrice.createMany({
                  data: product.prices.map((p) => {
                    // Normalize the incoming priceType string to match your strict ProductPriceType enum structure
                    let normalizedPriceType = "fixedPrice";
                    const incomingType = p.priceType?.toLowerCase() || "";
                    if (incomingType.includes("markup")) normalizedPriceType = "markup";
                    if (incomingType.includes("margin")) normalizedPriceType = "margin";

                    return {
                      inflowId: p.productPriceId, // Master unique record ID from payload
                      pricingSchemeId: p.pricingSchemeId,
                      productId: product.productId,
                      priceType: normalizedPriceType as any,
                      // Map numbers safely to Decimals to ensure full precision compliance
                      unitPrice: p.unitPrice ? new Prisma.Decimal(p.unitPrice) : null,
                      fixedMarkup: p.fixedMarkup ? new Prisma.Decimal(p.fixedMarkup) : null,
                    };
                  }),
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