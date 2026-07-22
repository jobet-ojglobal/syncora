import { prisma } from "@/lib/prisma";
import { getCategories } from "../data/categories";
import { syncCategory, CategorySyncCache } from "./category-sync";
import { InflowCategory } from "../types";

type SyncOptions = {
  batchSize?: number;
  onProgress?: (progressPercentage: number) => Promise<void>;
};

/**
 * Topologically sorts categories so parents ALWAYS process before their children,
 * regardless of tree depth.
 */
function sortCategoriesTopologically(categories: InflowCategory[]): InflowCategory[] {
  const map = new Map<string, InflowCategory>();
  categories.forEach((cat) => map.set(cat.categoryId, cat));

  const visited = new Set<string>();
  const sorted: InflowCategory[] = [];

  function visit(cat: InflowCategory) {
    if (visited.has(cat.categoryId)) return;
    visited.add(cat.categoryId);

    // If there is a parent in the dataset, visit parent first
    if (cat.parentCategoryId && map.has(cat.parentCategoryId)) {
      visit(map.get(cat.parentCategoryId)!);
    }

    sorted.push(cat);
  }

  categories.forEach(visit);
  return sorted;
}

export class CategorySyncService {
  async sync(options?: SyncOptions) {
    const rawCategories = await getCategories();
    const total = rawCategories.length;

    if (!total) {
      return {
        categoriesProcessed: 0,
        syncedAt: new Date().toISOString(),
      };
    }

    // Sort categories from Root -> Leaf nodes
    const sortedCategories = sortCategoriesTopologically(rawCategories);

    const batchSize = options?.batchSize ?? 20;
    const cache: CategorySyncCache = { verifiedCategoryIds: new Set<string>() };
    let processed = 0;

    // Process in controlled sequential batches within single transactions
    for (let i = 0; i < total; i += batchSize) {
      const chunk = sortedCategories.slice(i, i + batchSize);

      await prisma.$transaction(
        async (tx) => {
          for (const category of chunk) {
            await syncCategory(tx, category, cache);
          }
        },
        { timeout: 30000 } // Extended timeout for batch operations
      );

      processed += chunk.length;

      if (options?.onProgress) {
        const progressPercentage = Math.round((processed / total) * 100);
        await options.onProgress(progressPercentage);
      }
    }

    return {
      categoriesProcessed: processed,
      syncedAt: new Date().toISOString(),
    };
  }
}

// import { prisma } from "@/lib/prisma";
// import { getCategories } from "../data/categories";
// import { syncCategory } from "./category-sync";

// type SyncOptions = {
//   onProgress?: (progress: number) => Promise<void>;
// };

// export class CategorySyncService {
//   async sync(options?: SyncOptions) {
//     const categories = await getCategories();

//     let processed = 0;
//     const total = categories.length;

//     for (let i = 0; i < total; i++) {
//       const category = categories[i];
//       await prisma.$transaction(async (tx) => {
//         await syncCategory(tx, category);
//       });

//       processed++;

//       await options?.onProgress?.(
//         Math.round((processed / total) * 100)
//       );
//     }

//     return {
//       categoriesProcessed: processed,
//       syncedAt: new Date().toISOString(),
//     };
//   }
// }