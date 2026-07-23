// services/sync/products/product-sync.service.ts
import { prisma } from "@/lib/prisma";
import { getProducts } from "../data/products"; 
import { syncVariant } from "./variant.sync";
import { syncProduct } from "./product.sync";
import { syncProductGroup } from "./product-group-sync";

type SyncOptions = {
  onProgress?: (processedCount: number) => Promise<void>;
  batchSize?: number;
};

export class ProductSyncService {
  async sync(options?: SyncOptions, includes?: string[]) {
    const BATCH_SIZE = options?.batchSize || 10;
    
    // Track synced IDs across the entire execution to prevent duplicate DB writes
    const syncedGroupIds = new Set<string>();

    const baseIncludes = [""];
    const cleanIncludes = (includes ?? []).filter((item) => item !== "coreData");
    const hasCoreProductData = (includes ?? []).includes("coreData");
    const mergedIncludes = [...baseIncludes, ...(cleanIncludes || [])];

    let after: string | undefined = undefined;
    let totalProcessed = 0;

    const caches = {
      verifiedTeamMemberIds: new Set<string>(),
      verifiedCategoryIds: new Set<string>(),
      verifiedVendorIds: new Set<string>(),
      verifiedLocationIds: new Set<string>(),
      verifiedTaxingSchemes: new Set<string>(),
      verifiedTaxCodes: new Set<string>(),
      verifiedOperationTypes: new Set<string>(),
      verifiedPricingSchemeIds: new Set<string>(),
      verifiedProductIds: new Set<string>(),
    };
  
  
    console.log("Starting hyper-optimized product sync...");

    while (true) {
      // 1. Fetch the batch (includes deep relations)
      const batch = await getProducts(BATCH_SIZE, after, mergedIncludes);
      if (!batch || batch.length === 0) break;

      // 2. Process the batch inside a single Database Transaction
      try {
        await prisma.$transaction(
          async (tx) => {
            for (const fullProduct of batch) {
              const variantRelation = fullProduct.productVariant;
              const groupData = variantRelation?.productGroup;
              const groupDefaultProduct = variantRelation?.productGroup?.defaultProduct;

              if (
                groupData &&
                !syncedGroupIds.has(groupData.productGroupId)
              ) {
                await syncProductGroup(
                  tx,
                  groupData,
                  fullProduct,
                  true,
                  caches
                );

                syncedGroupIds.add(groupData.productGroupId);
              }

              await syncProduct(
                tx,
                fullProduct,
                groupData?.productGroupId,
                groupDefaultProduct,
                hasCoreProductData,
                caches
              );

              if (variantRelation && groupData) {
                await syncVariant(
                  tx,
                  groupData.productGroupId,
                  variantRelation
                );
              }
            }
          },
          {
            timeout: 40000, // 40-second transaction limit
          }
        );
      } catch (transactionError) {
        console.error(
          `[Batch Transaction Error] Failed for batch ending with ID ${after}:`,
          transactionError
        );
        throw transactionError;
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