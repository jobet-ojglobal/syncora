// services/sync/products/product-sync.service.ts
import { prisma } from "@/lib/prisma";
import { getProducts } from "../data/products"; 
import { syncCategory } from "./category.sync";
import { syncProductGroup } from "./product-group-sync";
import { syncProduct } from "./product.sync";
import { syncVariant } from "./variant.sync";

type SyncOptions = {
  onProgress?: (processedCount: number) => Promise<void>;
  batchSize?: number;
};

export class ProductSyncService {
  async sync(options?: SyncOptions) {
    const BATCH_SIZE = options?.batchSize || 10;
    
    // Track synced IDs across the entire execution to prevent duplicate DB writes
    const syncedCategoryIds = new Set<string>();
    const syncedGroupIds = new Set<string>();

    let after: string | undefined = undefined;
    let totalProcessed = 0;
    
    console.log("Starting hyper-optimized product sync...");

    while (true) {
      // 1. Fetch the batch (This ALREADY includes the deep relations!)
      const batch = await getProducts(BATCH_SIZE, after);
      if (!batch || batch.length === 0) break;

      // 2. Process the batch inside a single Database Transaction
      try {
        await prisma.$transaction(async (tx) => {
          for (const fullProduct of batch) {
            const variantRelation = fullProduct.productVariant;
            const groupData = variantRelation?.productGroup;
            const categoryData = groupData?.category;

            // A. Sync Category (Only if never seen before in this entire sync run)
            if (categoryData && !syncedCategoryIds.has(categoryData.categoryId)) {
              await syncCategory(tx, categoryData);
              syncedCategoryIds.add(categoryData.categoryId);
            }

            // B. Sync Product Group (Only if never seen before in this entire sync run)
            if (groupData && !syncedGroupIds.has(groupData.productGroupId)) {
              await syncProductGroup(tx, groupData);
              syncedGroupIds.add(groupData.productGroupId);
            }

            // C. Always sync the Product itself
            await syncProduct(tx, fullProduct);

            // D. Sync the Variant relation if it exists
            if (variantRelation && groupData) {
              await syncVariant(tx, groupData.productGroupId, variantRelation);
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