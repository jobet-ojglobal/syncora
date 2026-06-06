
export async function syncCategory(
  tx: any,
  category: any
) {
  if (!category) return;

  let parentId: string | null = null;

  if (category.parentCategoryId) {
    const parent = await tx.category.findUnique({
      where: {
        inflowCategoryId: category.parentCategoryId,
      },
    });

    parentId = parent
      ? category.parentCategoryId
      : null;
  }

  await tx.category.upsert({
    where: {
      inflowCategoryId: category.categoryId,
    },
    create: {
      inflowCategoryId: category.categoryId,
      name: category.name,
      isDefault: category.isDefault,
      timestamp: category.timestamp,
      parentId,
    },
    update: {
      name: category.name,
      isDefault: category.isDefault,
      timestamp: category.timestamp,
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
//       inflowCategoryId: category.categoryId,
//     },
//     create: {
//       inflowCategoryId: category.categoryId,
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