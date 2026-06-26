// services/sync/products/product-sync.service.ts
import { prisma } from "@/lib/prisma";
import { getEntireCatalogs } from "../data/products"; 
import { syncCategory } from "./category-sync";
import { syncProductGroup } from "./product-group-sync";
import { syncProduct } from "./product.sync";
import { syncVariant } from "./variant.sync";

type SyncOptions = {
  onProgress?: (processedCount: number) => Promise<void>;
  batchSize?: number;
 
};

export class EntireCatalogSyncService {
  async sync(options?: SyncOptions,  includes?: string[]) {
    const BATCH_SIZE = options?.batchSize || 10;
    
    // Track synced IDs across the entire execution to prevent duplicate DB writes
    const syncedCategoryIds = new Set<string>();
    const syncedGroupIds = new Set<string>();

    let after: string | undefined = undefined;
    let totalProcessed = 0;
    
    console.log("Starting hyper-optimized product sync...");

    while (true) {
      // 1. Fetch the batch (This ALREADY includes the deep relations!)
      const batch = await getEntireCatalogs(BATCH_SIZE, after, includes);
      if (!batch || batch.length === 0) break;

      // 2. Process the batch inside a single Database Transaction
      try {
        await prisma.$transaction(async (tx) => {
          for (const fullProduct of batch) {
            const variantRelation = fullProduct.productVariant;
            const groupData = variantRelation?.productGroup;
            const categoryData = groupData?.category;

            if (
              categoryData &&
              !syncedCategoryIds.has(categoryData.categoryId)
            ) {
              await syncCategory(tx, categoryData);
              syncedCategoryIds.add(categoryData.categoryId);
            }

            if (
              groupData &&
              !syncedGroupIds.has(groupData.productGroupId)
            ) {
              await syncProductGroup(
                tx,
                groupData,
                fullProduct // <-- pass product
              );

              syncedGroupIds.add(groupData.productGroupId);
            }

            await syncProduct(
              tx,
              fullProduct,
              groupData?.productGroupId
            );

            if (variantRelation && groupData) {
              await syncVariant(
                tx,
                groupData.productGroupId,
                variantRelation
              );
            }
          }
        }, {
          timeout: 40000 // Give the batch transaction plenty of breathing room
        });
      } catch (transactionError) {
        console.error(`Transaction failed for batch ending with ID ${after}:`, transactionError);
        // Depending on requirements, you can choose to throw or break here.
      }

      // 3. Update pagination cursor and progress tracking
      after = batch[batch.length - 1].productId;
      totalProcessed += batch.length;
      
      if (options?.onProgress) {
        await options.onProgress(totalProcessed);
      }
    }

    return {
      productsProcessed: totalProcessed,
      syncedAt: new Date().toISOString(),
    };
  }
}