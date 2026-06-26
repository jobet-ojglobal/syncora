// services/sync/products/product-variant-sync.service.ts
import { prisma } from "@/lib/prisma";
import { syncVariant } from "./variant.sync";
import { getProductGroupsInclude } from "../data/product-group";

type SyncOptions = {
  onProgress?: (processedCount: number) => Promise<void>;
  batchSize?: number;
};

export class ProductVariantSyncService {
  async sync(options?: SyncOptions, includes: string[] = []) {
    // Keep batchSize reasonable since each group contains multiple variants
    const BATCH_SIZE = options?.batchSize || 20; 
    
    let after: string | undefined = undefined;
    let totalVariantsProcessed = 0;
    let skippedCount = 0;
    
    console.log("Starting nested Variant extraction from Product Groups...");

    while (true) {
      // 1. Fetch current chunk of Product Groups containing variants
      const groupBatch = await getProductGroupsInclude(BATCH_SIZE, after, ["options.optionValues", "productVariants"]);
      if (!groupBatch || groupBatch.length === 0) break;

      await prisma.$transaction(async (tx) => {
        for (const group of groupBatch) {
          
          // Verify the parent Product Group record exists locally in your DB
          const localGroupExists = await tx.productGroup.findUnique({
            where: { inflowId: group.productGroupId },
            select: { inflowId: true }
          });

          if (!localGroupExists) {
            console.warn(`Skipping group variants: Parent Group (${group.productGroupId}) missing locally.`);
            skippedCount += group.productVariants?.length || 0;
            continue;
          }

          // 2. Loop through all variants nested inside this single group payload
          for (const remoteVariant of group.productVariants ?? []) {
            
            // Verify that the individual product item SKU reference exists locally
            const localProductExists = await tx.product.findUnique({
              where: { inflowId: remoteVariant.productId },
              select: { inflowId: true }
            });

            if (!localProductExists) {
              console.warn(`Skipping variant ${remoteVariant.productVariantId}: Core Product record (${remoteVariant.productId}) missing locally.`);
              skippedCount++;
              continue;
            }

            // 3. Hand off the data to your standardized syncVariant worker function
            await syncVariant(tx, group.productGroupId, remoteVariant);
            totalVariantsProcessed++;
          }
        }
      }, {
        timeout: 35000 // Provide padding for larger nested variant matrix processing arrays
      });

      // 4. Advance the pagination cursor using the Product Group's ID
      after = groupBatch[groupBatch.length - 1].productGroupId;
      
      if (options?.onProgress) {
        await options.onProgress(totalVariantsProcessed);
      }
    }

    return {
      variantsProcessed: totalVariantsProcessed,
      variantsSkipped: skippedCount,
      syncedAt: new Date().toISOString(),
    };
  }
}