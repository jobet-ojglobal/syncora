// services/sync/products/product-group-sync.service.ts
import { prisma } from "@/lib/prisma";
import { getProductGroups } from "../data/product-group";
import { syncCategory } from "./category-sync";
import { syncProductGroup } from "./product-group-sync";
import { syncProduct } from "./product.sync";
import { syncVariant } from "./variant.sync";

type SyncOptions = {
  onProgress?: (processedCount: number) => Promise<void>;
  batchSize?: number;
};

export class ProductGroupSyncService {
  async sync(options?: SyncOptions, includes?: string[]) {
    const BATCH_SIZE = options?.batchSize || 10;
    
    let after: string | undefined = undefined;
    let totalProcessed = 0;
    
    console.log("Starting optimized product group sync pipeline...");

    while (true) {
      // 1. Fetch current paginated chunk using custom runtime selections
      const batch = await getProductGroups(BATCH_SIZE, after, includes);
      if (!batch || batch.length === 0) break;

      // 2. Loop through each group in the current batch
      for (const group of batch) {
        await prisma.$transaction(async (tx) => {
          // Sync category context if provided by the upstream engine
          if (group.category) {
            await syncCategory(tx, group.category);
          }

          // Compute contextual fallback to grab custom fields if defaultProduct node is missing
          const fallbackProductContext = group.defaultProduct || group.productVariants?.[0]?.product;

          // Sync main product group configuration node along with custom fields mapping rules
          await syncProductGroup(tx, group, fallbackProductContext);

          // 3. Process children matrix nodes
          for (const variant of group.productVariants ?? []) {
            if (variant.product) {
              await syncProduct(tx, variant.product, group.productGroupId);
            }
            await syncVariant(tx, group.productGroupId, variant);
          }
        }, {
          timeout: 30000 // Ensure heavy nested batches don't trigger query engine timeout errors
        });
      }

      // 3. Advance pagination hooks and report raw progress items downstream
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