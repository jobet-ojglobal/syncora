// services/sync/products/product-group-sync.service.ts
import { prisma } from "@/lib/prisma";
import { getProductGroupsInclude } from "../data/product-group";
import { syncVariant } from "./variant.sync";
import { syncProduct } from "./product.sync";
import { syncProductGroup } from "./product-group-sync";

type SyncOptions = {
  onProgress?: (processedCount: number) => Promise<void>;
  batchSize?: number;
};

// export type SyncCaches = {
//   verifiedCategoryIds: Set<string>;
//   verifiedTeamMemberIds: Set<string>;
//   verifiedVendorIds: Set<string>;
// };

//  const cleanIncludes = (includes ?? []).filter((item) => item !== "coreData");
//     const hasCoreGroupData = (includes ?? []).includes("coreData");
//     const mergedIncludes = [...baseIncludes, ...(cleanIncludes || [])];

//     const baseIncludes = [""];

export class ProductGroupSyncService {
  async sync(options?: SyncOptions, includes?: string[]) {
    const BATCH_SIZE = options?.batchSize || 10;
    let brandCustomName = undefined;
    
    let after: string | undefined = undefined;
    let totalProcessed = 0;

    const baseIncludes = ["options.optionValues"];
   
    const EXCLUDED_INCLUDES = new Set(["coreData", "brand", "brandCustomName"]);
    const cleanIncludes = (includes ?? []).filter((item) => !EXCLUDED_INCLUDES.has(item));

    const hasCoreGroupData = (includes ?? []).includes("coreData");
    const hasBrand = (includes ?? []).includes("brand");
    const mergedIncludes = [...baseIncludes, ...(cleanIncludes || [])];

    if(hasBrand) {
      brandCustomName = includes?.filter(i => i === "brandCustomName")[0];
    }

    // Runtime cache across service execution
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
    
    console.log("Starting optimized product group sync pipeline...");

    while (true) {
      // 1. Fetch current paginated chunk using custom runtime selections
      
      const batch = await getProductGroupsInclude(BATCH_SIZE, after, mergedIncludes)
      if (!batch || batch.length === 0) break;

      // 2. Process the batch in a single atomic Database Transaction
      try {
        await prisma.$transaction(
          async (tx) => {
            for (const group of batch) {
              // Compute contextual fallback to grab custom fields if defaultProduct node is missing
              const fallbackProductContext =
                group.defaultProduct || group.productVariants?.[0]?.product;

              // Sync main product group configuration node along with custom fields mapping rules
              await syncProductGroup(
                tx,
                group,
                fallbackProductContext,
                hasCoreGroupData,
                caches
              );

              // 3. Process children matrix nodes
              for (const variant of group.productVariants ?? []) {
                if (variant.product) {
                  await syncProduct(
                    tx,
                    variant.product,
                    group.productGroupId,
                    fallbackProductContext,
                    true,
                    brandCustomName,
                    caches
                  );
                }
                
                await syncVariant(tx, group.productGroupId, variant);
              }
            }
          },
          {
            timeout: 40000, // Safe transaction timeout for deep nested option matrices
          }
        );
      } catch (error) {
        console.error(
          `[ProductGroupSyncError] Transaction failed for batch starting after ID "${after}":`,
          error
        );
        throw error;
      }

      // 4. Advance pagination hooks and report raw progress items downstream
      after = batch[batch.length - 1].productGroupId;
      totalProcessed += batch.length;
      
      if (options?.onProgress) {
        await options.onProgress(totalProcessed);
      }
    }

    return {
      groupsProcessed: totalProcessed,
      syncedAt: new Date().toISOString(),
    };
  }
}

// import { prisma } from "@/lib/prisma";
// import { getProductGroups } from "../data/product-group";

// import { syncCategory } from "./category-sync";
// import { syncProductGroup } from "./product-group-sync";
// import { syncProduct } from "./product.sync";
// import { syncVariant } from "./variant.sync";

// type SyncOptions = {
//   onProgress?: (progress: number) => Promise<void>;
// };

// export class ProductGroupSyncService {
//   async sync(options?: SyncOptions) {
//     const groups = await getProductGroups();

//     let processed = 0;
//     const total = groups.length;

//     for (let i = 0; i < total; i++) {
//       const group = groups[i];

//       await prisma.$transaction(async (tx) => {
//         group.category ? await syncCategory(tx, group.category) : null;
//         await syncProductGroup(tx, group, group.defaultProduct);

//         for (const variant of group.productVariants ?? []) {
//           await syncProduct(tx, variant.product, group.productGroupId);
//           await syncVariant(tx, group.productGroupId, variant);
//         }
//       });

//       const progress = Math.round(((i + 1) / total) * 100);

//       console.log("progress:", progress); // debug

//       await options?.onProgress?.(progress);

//       processed++;
//     }

//     return {
//       groupsProcessed: processed,
//       syncedAt: new Date().toISOString(),
//     };
//   }
// }