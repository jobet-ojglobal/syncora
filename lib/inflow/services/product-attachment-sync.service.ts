// services/sync/products/product-attachment-sync.service.ts
import { prisma } from "@/lib/prisma";
import { getProductsInclude } from "../data/products"; // Your existing getProducts fetcher

type SyncOptions = {
  onProgress?: (processedCount: number) => Promise<void>;
  batchSize?: number;
};

export class ProductAttachmentSyncService {
  async sync(options?: SyncOptions) {
    const BATCH_SIZE = options?.batchSize ?? 100;
    let after: string | undefined;
    let totalProcessed = 0;

    console.log("Starting targeted Product Attachments data sync...");

    while (true) {
      // 1. Fetch current product batch from inFlow
      const products = await getProductsInclude(BATCH_SIZE, after, ["attachments"]);

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

      // 3. Process the attachment arrays atomically inside a transaction chunk
      if (productsToSync.length > 0) {
        await prisma.$transaction(
          async (tx) => {
            for (const product of productsToSync) {
              // Wipe out previous file mappings for this explicit product context
              await tx.productAttachment.deleteMany({
                where: { productId: product.productId },
              });

              if (product.attachments?.length) {
                await tx.productAttachment.createMany({
                  data: product.attachments.map((att) => ({
                    inflowId: att.attachmentId, // Master tracking payload GUID
                    productId: product.productId,
                    attachmentUrl: att.attachmentUrl || "",
                    fileName: att.fileName || "unnamed_attachment",
                    // Safely check and convert date strings to JS Date objects
                    lastModDttm: att.lastModDttm ? new Date(att.lastModDttm) : null,
                    lastModifiedById: att.lastModifiedById || null,
                  })),
                  skipDuplicates: true,
                });
              }
            }
          },
          { timeout: 30000 } // Safe, isolated transaction execution window
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