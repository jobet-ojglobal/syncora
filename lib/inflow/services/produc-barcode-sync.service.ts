// services/sync/products/product-barcode-sync.service.ts
import { prisma } from "@/lib/prisma";
import { getProductsInclude } from "../data/products"; // Your existing getProducts fetcher

type SyncOptions = {
  onProgress?: (processedCount: number) => Promise<void>;
  batchSize?: number;
};

export class ProductBarcodeSyncService {
  async sync(options?: SyncOptions) {
    const BATCH_SIZE = options?.batchSize ?? 100;
    let after: string | undefined;
    let totalProcessed = 0;

    console.log("Starting targeted Product Barcode isolation sync...");

    while (true) {
      // 1. Fetch products from inFlow with include string focusing on barcodes
      const products = await getProductsInclude(BATCH_SIZE, after, ["productBarcodes"]);

      if (!products || products.length === 0) {
        break;
      }

      // 2. Extract inFlow product IDs from this chunk to cross-reference our database
      const inflowProductIds = products.map((p) => p.productId);

      // 3. Query local database to identify ONLY products that already exist
      const existingProducts = await prisma.product.findMany({
        where: {
          inflowId: { in: inflowProductIds },
        },
        select: {
          inflowId: true,
        },
      });

      // Turn into a Set for $O(1)$ lookup performance
      const existingProductIdsSet = new Set(existingProducts.map((p) => p.inflowId));

      // Filter inFlow payload to process items present locally
      const productsToSync = products.filter((p) => existingProductIdsSet.has(p.productId));

      if (productsToSync.length > 0) {
        await prisma.$transaction(
          async (tx) => {
            for (const product of productsToSync) {
              // Clear previous barcode profiles for this specific isolated entity to prevent duplicates
              await tx.productBarcode.deleteMany({
                where: { productId: product.productId },
              });

              if (product.productBarcodes?.length) {
                await tx.productBarcode.createMany({
                  data: product.productBarcodes.map((bc) => ({
                    inflowId: bc.productBarcodeId,
                    productId: product.productId,
                    barcode: bc.barcode,
                    lineNum: typeof bc.lineNum === "string" ? parseInt(bc.lineNum, 10) : bc.lineNum,
                  })),
                  skipDuplicates: true,
                });
              }
            }
          },
          { timeout: 30000 } // Shorter 30s timeout since we're only modifying barcode rows
        );
      }

      totalProcessed += products.length;
      after = products[products.length - 1].productId;

      if (options?.onProgress) {
        await options.onProgress(totalProcessed);
      }

      // If the API returns fewer records than the requested page size, we've reached the end
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