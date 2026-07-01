// services/sync/products/product-reorder-setting-sync.service.ts
import { prisma } from "@/lib/prisma";
import {  getProductsInclude } from "../data/products"; // Your existing getProducts fetcher
import { Prisma } from "@/generated/prisma/client";

type SyncOptions = {
  onProgress?: (processedCount: number) => Promise<void>;
  batchSize?: number;
};

export class ProductReorderSettingSyncService {
  async sync(options?: SyncOptions) {
    const BATCH_SIZE = options?.batchSize ?? 100;
    let after: string | undefined;
    let totalProcessed = 0;

    console.log("Starting targeted Product Reorder Settings data sync...");

    while (true) {
      // 1. Fetch products batch tracking from inFlow
      const products = await getProductsInclude(BATCH_SIZE, after, ["reorderSettings"]);

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

      // 3. Process the mapping arrays atomically inside a transaction chunk
      if (productsToSync.length > 0) {
        await prisma.$transaction(
          async (tx) => {
            for (const product of productsToSync) {
              // Clear previous reorder rule items for this explicit product context
              await tx.reorderSetting.deleteMany({
                where: { productId: product.productId },
              });

              if (product.reorderSettings?.length) {
                await tx.reorderSetting.createMany({
                  data: product.reorderSettings.map((rs) => ({
                    inflowId: rs.reorderSettingsId, // Payload tracking GUID
                    productId: product.productId,
                    locationId: rs.locationId,
                    fromLocationId: rs.fromLocationId,
                    vendorId: rs.vendorId,
                    defaultSublocation: rs.defaultSublocation,
                    enableReordering: rs.enableReordering ?? true,
                    reorderMethod: rs.reorderMethod || "PurchaseOrder",
                    // Safely parse numbers to Decimal mappings matching your schema (db.Decimal(12,4))
                    reorderPoint: new Prisma.Decimal(rs.reorderPoint || 0),
                    reorderQuantity: new Prisma.Decimal(rs.reorderQuantity || 0),
                  })),
                  skipDuplicates: true,
                });
              }
            }
          },
          { timeout: 35000 } // Isolated block time limit
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