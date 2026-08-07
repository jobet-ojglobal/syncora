// services/sync/products/product-sync.service.ts
import { prisma } from "@/lib/prisma";
import { getProducts } from "../data/products"; 
import { syncVariant } from "./variant.sync";
import { syncProduct } from "./product.sync";
import { syncProductGroup } from "./product-group-sync";

type SyncOptions = {
  onProgress?: (processedCount: number) => Promise<void>;
  /** 
   * Function to check for abort/cancellation signals.
   * Should throw an error (e.g. SyncCancelledError) if the job was cancelled.
   */
  checkSignal?: () => Promise<void>;
  /** 
   * Number of items per API call. 
   * Recommended max: 20-30 when using heavy `includes` to avoid HTTP 429 Rate Limits.
   * Default: 30
   */
  batchSize?: number;
  /**
   * Pause time in milliseconds between API batch fetches to prevent rate limit spikes.
   * Default: 300ms
   */
  delayBetweenBatchesMs?: number;
};

export class ProductSyncService {
  // Utility delay method for rate-limiting loop iterations
  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async sync(options?: SyncOptions, includes?: string[], brandCustomName?: string, after: string | undefined = undefined) {
    // 1. Reduced default batch size from 100 -> 30 to lower API payload weight & burst load
    const BATCH_SIZE = options?.batchSize ?? 30;
    
    // 2. Configurable inter-batch delay (300ms default) to space out requests
    const INTER_BATCH_DELAY = options?.delayBetweenBatchesMs ?? 300;
    
    // Track synced IDs across the entire execution to prevent duplicate DB writes
    const syncedGroupIds = new Set<string>();

    const EXCLUDED_INCLUDES = new Set(["coreData", "brand"]);
    const cleanIncludes = (includes ?? []).filter((item) => !EXCLUDED_INCLUDES.has(item));

    const hasCoreProductData = (includes ?? []).includes("coreData");
    const mergedIncludes = [...cleanIncludes];

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

    console.log(`Starting optimized product sync (Batch Size: ${BATCH_SIZE}, Throttle: ${INTER_BATCH_DELAY}ms)...`);
    let batchNo = 0;

    while (true) {
      // Check for cancellation before calling remote API
      if (options?.checkSignal) {
        await options.checkSignal();
      }

      // Fetch the batch (includes deep relations)
      const batch = await getProducts(BATCH_SIZE, after, mergedIncludes);
      if (!batch || batch.length === 0) break;

      // Check for cancellation before executing database transaction
      if (options?.checkSignal) {
        await options.checkSignal();
      }

      // Process batch in database transaction
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
                brandCustomName,
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

      // Update pagination cursor and progress tracking
      after = batch[batch.length - 1].productId;
      totalProcessed += batch.length;
      batchNo++;

      console.log(`Batch #${batchNo} completed. Processed ${totalProcessed} products.`);
      
      if (options?.onProgress) {
        await options.onProgress(totalProcessed);
      }

      // Pace out requests to eliminate HTTP 429 rate limit triggers
      if (INTER_BATCH_DELAY > 0) {
        await this.sleep(INTER_BATCH_DELAY);
      }
    }

    return {
      productsProcessed: totalProcessed,
      syncedAt: new Date().toISOString(),
    };
  }
}

// // services/sync/products/product-sync.service.ts
// import { prisma } from "@/lib/prisma";
// import { getProducts } from "../data/products"; 
// import { syncVariant } from "./variant.sync";
// import { syncProduct } from "./product.sync";
// import { syncProductGroup } from "./product-group-sync";

// type SyncOptions = {
//   onProgress?: (processedCount: number) => Promise<void>;
//   batchSize?: number;
// };

// export class ProductSyncService {
//   async sync(options?: SyncOptions, includes?: string[]) {
//     const BATCH_SIZE = options?.batchSize || 30;
//     let brandCustomName = undefined;
    
//     // Track synced IDs across the entire execution to prevent duplicate DB writes
//     const syncedGroupIds = new Set<string>();

//     const baseIncludes = [""];
//     const EXCLUDED_INCLUDES = new Set(["coreData", "brand", "brandCustomName"]);
//     const cleanIncludes = (includes ?? []).filter((item) => !EXCLUDED_INCLUDES.has(item));

//     const hasCoreProductData = (includes ?? []).includes("coreData");
//     const hasBrand = (includes ?? []).includes("brand");
//     const mergedIncludes = [...baseIncludes, ...(cleanIncludes || [])];

//     if(hasBrand) {
//       brandCustomName = includes?.filter(i => i === "brandCustomName")[0];
//     }

//     let after: string | undefined = undefined;
//     let totalProcessed = 0;

//     const caches = {
//       verifiedTeamMemberIds: new Set<string>(),
//       verifiedCategoryIds: new Set<string>(),
//       verifiedVendorIds: new Set<string>(),
//       verifiedLocationIds: new Set<string>(),
//       verifiedTaxingSchemes: new Set<string>(),
//       verifiedTaxCodes: new Set<string>(),
//       verifiedOperationTypes: new Set<string>(),
//       verifiedPricingSchemeIds: new Set<string>(),
//       verifiedProductIds: new Set<string>(),
//     };
  
  
//     console.log("Starting hyper-optimized product sync...");
//     let batchNo = 0;

//     while (true) {
//       // 1. Fetch the batch (includes deep relations)
//       const batch = await getProducts(BATCH_SIZE, after, mergedIncludes);
//       if (!batch || batch.length === 0) break;

//       // 2. Process the batch inside a single Database Transaction
//       try {
//         await prisma.$transaction(
//           async (tx) => {
//             for (const fullProduct of batch) {
//               const variantRelation = fullProduct.productVariant;
//               const groupData = variantRelation?.productGroup;
//               const groupDefaultProduct = variantRelation?.productGroup?.defaultProduct;

//               if (
//                 groupData &&
//                 !syncedGroupIds.has(groupData.productGroupId)
//               ) {
//                 await syncProductGroup(
//                   tx,
//                   groupData,
//                   fullProduct,
//                   true,
//                   caches
//                 );

//                 syncedGroupIds.add(groupData.productGroupId);
//               }

//               await syncProduct(
//                 tx,
//                 fullProduct,
//                 groupData?.productGroupId,
//                 groupDefaultProduct,
//                 hasCoreProductData,
//                 brandCustomName,
//                 caches
//               );

//               if (variantRelation && groupData) {
//                 await syncVariant(
//                   tx,
//                   groupData.productGroupId,
//                   variantRelation
//                 );
//               }
//             }
//           },
//           {
//             timeout: 40000, // 40-second transaction limit
//           }
//         );
//       } catch (transactionError) {
//         console.error(
//           `[Batch Transaction Error] Failed for batch ending with ID ${after}:`,
//           transactionError
//         );
//         throw transactionError;
//       }

//       // 3. Update pagination cursor and progress tracking
//       after = batch[batch.length - 1].productId;
//       totalProcessed += batch.length;
//       batchNo++;

//       console.log("BatchNo: ",batchNo)
      
//       if (options?.onProgress) {
//         await options.onProgress(totalProcessed);
//       }
//     }

//     return {
//       productsProcessed: totalProcessed,
//       syncedAt: new Date().toISOString(),
//     };
//   }
// }