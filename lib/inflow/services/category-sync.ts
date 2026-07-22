import { Prisma, PrismaClient, Category } from "@/generated/prisma/client";
import { genInflowUniqueSlug } from "@/helpers/genUniqueSlug";
import { InflowCategory } from "../types";

type DbClient = Prisma.TransactionClient | PrismaClient;

export type CategorySyncCache = {
  verifiedCategoryIds: Set<string>;
};

export async function syncCategory(
  tx: DbClient,
  category: InflowCategory,
  caches?: CategorySyncCache
): Promise<Category | null> {
  if (!category?.categoryId) return null;

  // Mutate or leverage the passed cache object
  const verifiedCategories = caches?.verifiedCategoryIds ?? new Set<string>();

  // 1. Resolve Parent Category Foreign Key with JIT self-healing
  let parentId: string | null = null;

  if (category.parentCategoryId) {
    if (verifiedCategories.has(category.parentCategoryId)) {
      parentId = category.parentCategoryId;
    } else {
      const parentExists = await tx.category.findUnique({
        where: { inflowId: category.parentCategoryId },
        select: { inflowId: true },
      });

      if (parentExists) {
        parentId = parentExists.inflowId;
        verifiedCategories.add(parentExists.inflowId);
      } else if (category.parentCategory) {
        console.warn(
          `[Sync] Parent category "${category.parentCategoryId}" missing locally. Syncing JIT...`
        );
        const syncedParent = await syncCategory(
          tx,
          category.parentCategory,
          caches ? { verifiedCategoryIds: verifiedCategories } : undefined
        );
        if (syncedParent?.inflowId) {
          parentId = syncedParent.inflowId;
          verifiedCategories.add(syncedParent.inflowId);
        }
      }
    }
  }

  // 2. Reuse slug if name hasn't changed to avoid unnecessary queries
  const existingCategory = await tx.category.findUnique({
    where: { inflowId: category.categoryId },
    select: { name: true, slug: true },
  });

  let slug: string;
  if (existingCategory && existingCategory.name === category.name) {
    slug = existingCategory.slug;
  } else {
    slug = await genInflowUniqueSlug(
      category.name || "category",
      tx.category,
      category.categoryId
    );
  }

  // 3. Upsert Category
  const syncedCategory = await tx.category.upsert({
    where: { inflowId: category.categoryId },
    create: {
      inflowId: category.categoryId,
      name: category.name,
      slug,
      parentId,
    },
    update: {
      name: category.name,
      slug,
      parentId,
    },
  });

  // Track in memory cache
  verifiedCategories.add(syncedCategory.inflowId);

  return syncedCategory;
}


// import { genInflowUniqueSlug } from "@/helpers/genUniqueSlug";
// import { InflowCategory } from "../types";
// import { Prisma, PrismaClient } from "@/generated/prisma/client";

// type DbClient = Prisma.TransactionClient | PrismaClient;

// export async function syncCategory(
//   tx: DbClient,
//   category: InflowCategory
// ) {
//   if (!category) return;

//   let parentId: string | null = null;
//   const slug = await genInflowUniqueSlug(
//     category.name, 
//     tx.category,
//     category.categoryId
//   );

//   if (category.parentCategoryId) {
//     const parent = await tx.category.findUnique({
//       where: {
//         inflowId: category.parentCategoryId,
//       },
//     });

//     parentId = parent
//       ? category.parentCategoryId
//       : null;
//   }

//   return await tx.category.upsert({
//     where: {
//       inflowId: category.categoryId,
//     },
//     create: {
//       inflowId: category.categoryId,
//       name: category.name,
//       slug,
//       parentId,
//     },
//     update: {
//       name: category.name,
//       slug,
//       parentId,
//     },
//   });
// }

// export async function syncCategory(
//   tx: any,
//   category: any
// ) {
//   if (!category) return;

//   await tx.category.upsert({
//     where: {
//       inflowId: category.categoryId,
//     },
//     create: {
//       inflowId: category.categoryId,
//       name: category.name,
//       isDefault: category.isDefault,
//       timestamp: category.timestamp,
//       parentId: category.parentCategoryId,
//     },
//     update: {
//       name: category.name,
//       isDefault: category.isDefault,
//       timestamp: category.timestamp,
//       parentId: category.parentCategoryId,
//     },
//   });
// }