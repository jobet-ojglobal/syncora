import { generateSlug } from "@/helpers/genUniqueSlug";
import { InflowCategory } from "../types";

export async function syncCategory(
  tx: any,
  category: InflowCategory
) {
  if (!category) return;

  let parentId: string | null = null;
  const slug = generateSlug(category.name);

  if (category.parentCategoryId) {
    const parent = await tx.category.findUnique({
      where: {
        inflowId: category.parentCategoryId,
      },
    });

    parentId = parent
      ? category.parentCategoryId
      : null;
  }

  await tx.category.upsert({
    where: {
      inflowId: category.categoryId,
    },
    create: {
      inflowId: category.categoryId,
      name: category.name,
      slug,
      // isDefault: category.isDefault,
      // timestamp: category.timestamp,
      parentId,
    },
    update: {
      name: category.name,
      slug,
      // isDefault: category.isDefault,
      // timestamp: category.timestamp,
      parentId,
    },
  });
}

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