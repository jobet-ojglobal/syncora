import { prisma } from "@/lib/prisma";
import { getCategories } from "../data/categories";
import { InflowCategory } from "../types";
import { genInflowUniqueSlug } from "@/helpers/genUniqueSlug";
import { Prisma } from "@/generated/prisma/client";
import { SyncOptions } from "@/lib/workers/sync.worker";

type DbClient = Prisma.TransactionClient;

/**
 * Shared Caches state across batch sync operations
 */
export type SyncCache = {
  verifiedCategoryIds: Set<string>;
};

export function createSyncCache(): SyncCache {
  return {
    verifiedCategoryIds: new Set<string>(),
  };
}

export class CategorySyncService {
  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async syncCategory(
    tx: DbClient,
    payload: InflowCategory,
    caches?: SyncCache
  ) {
    if (!payload.categoryId) return null;

    const verifiedCategories = caches?.verifiedCategoryIds ?? new Set<string>();

    const isExist = await tx.category.findFirst({
      where: {
        name: payload.name,
        NOT: {
          inflowId: payload.categoryId,
        },
      },
    });

    if (isExist) {
      verifiedCategories.add(isExist.inflowId);
      return isExist;
    }

    const slug = await genInflowUniqueSlug(
      payload.name || "category",
      tx.category,
      payload.categoryId
    );

    const syncedCategory = await tx.category.upsert({
      where: {
        inflowId: payload.categoryId,
      },
      create: {
        inflowId: payload.categoryId,
        name: payload.name,
        slug,
      },
      update: {},
    });

    verifiedCategories.add(syncedCategory.inflowId);

    return syncedCategory;
  }

  async syncCategoryWParent(
    tx: DbClient,
    payload: InflowCategory,
    caches?: SyncCache
  ) {
    if (!payload.categoryId) return null;

    const verifiedCategories = caches?.verifiedCategoryIds ?? new Set<string>();

    // 1. Resolve parentCategory recursively if present
    let parentId: string | null = payload.parentCategoryId ?? null;

    if (payload.parentCategory) {
      const syncedParent = await this.syncCategory(tx, payload.parentCategory, caches);
      if (syncedParent) {
        parentId = syncedParent.inflowId;
      }
    }

    // Prevent self-referential parent assignment
    if (parentId === payload.categoryId) {
      parentId = null;
    }

    // 2. Check if a category with the same name exists under a different inflowId
    const isExist = await tx.category.findFirst({
      where: {
        name: payload.name,
        NOT: {
          inflowId: payload.categoryId,
        },
      },
    });

    const slug = await genInflowUniqueSlug(
      payload.name || "category",
      tx.category,
      payload.categoryId
    );

    // 3. Update existing category (migrating inflowId + parentId)
    if (isExist) {
      const updatedCategory = await tx.category.update({
        where: {
          id: isExist.id,
        },
        data: {
          inflowId: payload.categoryId,
          name: payload.name,
          slug,
          parentId, // Assign parentId
        },
      });

      verifiedCategories.add(updatedCategory.inflowId);
      return updatedCategory;
    }

    // 4. Upsert category with parentId
    const syncedCategory = await tx.category.upsert({
      where: {
        inflowId: payload.categoryId,
      },
      create: {
        inflowId: payload.categoryId,
        name: payload.name,
        slug,
        parentId, // Assign parentId on creation
      },
      update: {
        name: payload.name,
        slug,
        parentId, // Update parentId if parent modified
      },
    });

    verifiedCategories.add(syncedCategory.inflowId);

    return syncedCategory;
  }

  /**
   * Universal Reusable Sub-Batch Transaction Processor.
   * Processes a concrete set of local categories within a transaction context.
   */
  async syncBatch(
    tx: DbClient,
    records: InflowCategory[],
    caches: SyncCache,
    checkSignal?: () => Promise<void>
  ) {
    const results: Array<{
      payloadId?: string
      dataInflowId?: string;
      status: "synced" | "skipped_not_sync";
    }> = [];

    let processedCount = 0;

    for (const data of records) {
      if (checkSignal) await checkSignal();

      const trimmedName = data.name?.trim();
      if (!trimmedName) {
        results.push({
          payloadId: data.categoryId,
          status: "skipped_not_sync",
        });
        continue;
      }

      // 1. Check existing match by name
      let match = await tx.category.findFirst({
        where: { name: trimmedName },
        select: { inflowId: true },
      });

      // 2. Resolve or sync the category record
      if (!match) {
        match = await this.syncCategoryWParent(
          tx,
          data,
          caches
        );
      }

      if (!match?.inflowId) {
        results.push({
          payloadId: data.categoryId,
          status: "skipped_not_sync",
        });
        continue;
      }

      results.push({
        dataInflowId: match.inflowId,
        status: "synced",
      });

      processedCount++;
    }

    return { processedCount, results };
  }

  /**
   * Main Driver Method for Paged/Iterative Inflow API or DB category syncs.
   */
  async sync(
    options: SyncOptions,
    after: string | undefined = undefined,
    selectedRecords?: any[],
    syncedAll?: boolean,
  ) {
    const { onProgress, checkSignal } = options;
    const BATCH_SIZE = options?.batchSize ?? 30;
    const INTER_BATCH_DELAY = options?.delayBetweenBatchesMs ?? 300;

    let totalProcessed = 0;
    let hasMore = true;

    const allowedIds =
      !syncedAll && selectedRecords && selectedRecords.length > 0
        ? new Set(selectedRecords.map((item) => String(item.id ?? item.categoryId)))
        : null;

    const syncResults: Array<{
      payloadId?: string;
      dataInflowId?: string;
      status: "synced" | "skipped_not_sync";
    }> = [];

    const caches = createSyncCache();

    console.log(`Starting category sync map (Batch Size: ${BATCH_SIZE}, Delay: ${INTER_BATCH_DELAY}ms)...`);
    let batchNo = 0;

    while (hasMore) {
      if (checkSignal) await checkSignal();

      const rawBatch: InflowCategory[] = await getCategories(
        BATCH_SIZE,
        after
      );

      if (!rawBatch || rawBatch.length === 0) break;

      after = String(rawBatch[rawBatch.length - 1].categoryId);
      if (rawBatch.length < BATCH_SIZE) hasMore = false;

      let batch = rawBatch;
      if (allowedIds) {
        batch = batch.filter((item) => allowedIds.has(String(item.categoryId)));
      }

      if (batch.length === 0) continue;

      if (checkSignal) await checkSignal();

      // Execute transaction for current batch
      const { processedCount, results } = await prisma.$transaction(
        async (tx) => {
          return await this.syncBatch(
            tx,
            batch,
            caches,
            checkSignal
          );
        },
        { timeout: 60000 }
      );

      totalProcessed += processedCount;
      syncResults.push(...results);
      batchNo++;

      console.log(`Batch #${batchNo} completed. Processed ${totalProcessed} categories.`);

      if (onProgress) await onProgress(totalProcessed);

      if (checkSignal) await checkSignal();

      if (INTER_BATCH_DELAY > 0) {
        await this.sleep(INTER_BATCH_DELAY);
      }
    }

    return {
      categoriesProcessed: totalProcessed,
      syncedAt: new Date().toISOString(),
      results: syncResults,
    };
  }
}

/**
 * Topologically sorts categories so parents ALWAYS process before their children,
 * regardless of tree depth.
 */
// function sortCategoriesTopologically(categories: InflowCategory[]): InflowCategory[] {
//   const map = new Map<string, InflowCategory>();
//   categories.forEach((cat) => map.set(cat.categoryId, cat));

//   const visited = new Set<string>();
//   const sorted: InflowCategory[] = [];

//   function visit(cat: InflowCategory) {
//     if (visited.has(cat.categoryId)) return;
//     visited.add(cat.categoryId);

//     // If there is a parent in the dataset, visit parent first
//     if (cat.parentCategoryId && map.has(cat.parentCategoryId)) {
//       visit(map.get(cat.parentCategoryId)!);
//     }

//     sorted.push(cat);
//   }

//   categories.forEach(visit);
//   return sorted;
// }

// export class CategorySyncService {
//   async syncCategory(
//     tx: DbClient,
//     payload: InflowCategory,
//     caches?: SyncCache
//   ) {
//     if (!payload.categoryId) return null;

//     const verifiedCategories = caches?.verifiedCategoryIds ?? new Set<string>();

//     // 1. Check if a category with the same name exists under a different inflowId
//     const isExist = await tx.category.findFirst({
//       where: {
//         name: payload.name,
//         NOT: {
//           inflowId: payload.categoryId,
//         },
//       },
//     });

//     if (isExist) {
//       const slug = await genInflowUniqueSlug(
//         payload.name || "category",
//         tx.category,
//         payload.categoryId
//       );

//       // Update inflowId using the primary key `id`. 
//       // ON UPDATE CASCADE will update child parentId & CategoryLocationMap.categoryId automatically.
//       const updatedCategory = await tx.category.update({
//         where: {
//           id: isExist.id,
//         },
//         data: {
//           inflowId: payload.categoryId,
//           name: payload.name,
//           slug,
//         },
//       });

//       verifiedCategories.add(updatedCategory.inflowId);
//       return updatedCategory;
//     }

//     // 2. If no name collision, generate slug and upsert by incoming inflowId
//     const slug = await genInflowUniqueSlug(
//       payload.name || "category",
//       tx.category,
//       payload.categoryId
//     );

//     const syncedCategory = await tx.category.upsert({
//       where: {
//         inflowId: payload.categoryId,
//       },
//       create: {
//         inflowId: payload.categoryId,
//         name: payload.name,
//         slug,
//       },
//       update: {
//         name: payload.name,
//         slug,
//       },
//     });

//     verifiedCategories.add(syncedCategory.inflowId);

//     return syncedCategory;
//   }

//   async sync(options?: SyncOptions) {
//     const rawCategories = await getCategories();
//     const total = rawCategories.length;

//     if (!total) {
//       return {
//         categoriesProcessed: 0,
//         syncedAt: new Date().toISOString(),
//       };
//     }

//     // Sort categories from Root -> Leaf nodes
//     const sortedCategories = sortCategoriesTopologically(rawCategories);

//     const batchSize = options?.batchSize ?? 20;
//     const caches = createSyncCache();
//     let processed = 0;

//     // Process in controlled sequential batches within single transactions
//     for (let i = 0; i < total; i += batchSize) {
//       const chunk = sortedCategories.slice(i, i + batchSize);

//       await prisma.$transaction(
//         async (tx) => {
//           for (const category of chunk) {
//             await syncCategory(tx, category, caches);
//           }
//         },
//         { timeout: 30000 } // Extended timeout for batch operations
//       );

//       processed += chunk.length;

//       if (options?.onProgress) {
//         const progressPercentage = Math.round((processed / total) * 100);
//         await options.onProgress(progressPercentage);
//       }
//     }

//     return {
//       categoriesProcessed: processed,
//       syncedAt: new Date().toISOString(),
//     };
//   }
// }

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