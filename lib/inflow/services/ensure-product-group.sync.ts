// services/sync/products/product-group-sync.ts
import { Prisma } from "@/generated/prisma/client";
import { genInflowUniqueSlug } from "@/helpers/genUniqueSlug";
import { InflowProduct, InflowProductGroup } from "../types";
import { syncCategory } from "./category-sync";
import { syncBrand, syncGroupFeatures, syncGroupImages, syncGroupTags } from "./helpers";

type Tx = Prisma.TransactionClient;

type SyncCache = {
  verifiedTeamMemberIds?: Set<string>;
  verifiedCategoryIds?: Set<string>;
  verifiedVendorIds?: Set<string>;
};

export async function ensureSyncProductGroup(
  tx: Tx,
  group: InflowProductGroup,
  firstProductInGroup?: InflowProduct,
  caches?: SyncCache
) {
  // Initialize cache
  const verifiedCategories = caches?.verifiedCategoryIds ?? new Set<string>();

  // 1. Extract values safely from inFlow product custom fields schema metadata layout references
  const brandName = firstProductInGroup?.customFields?.custom1;
  const rawFeaturesString = firstProductInGroup?.customFields?.custom2;
  const rawTagsString = firstProductInGroup?.customFields?.custom3;

  let brandId: string | null = null;
  if (brandName) {
    brandId = await syncBrand(tx, brandName);
  }

  // 2. 🛡️ SELF-HEALING FOREIGN KEY GUARD: Category
  const rawCategoryId = group.categoryId || firstProductInGroup?.categoryId;
  let validCategoryId: string | null = null;

  if (rawCategoryId) {
    if (verifiedCategories.has(rawCategoryId)) {
      validCategoryId = rawCategoryId;
    } else {
      const localCategory = await tx.category.findUnique({
        where: { inflowId: rawCategoryId },
        select: { inflowId: true },
      });

      if (localCategory) {
        validCategoryId = localCategory.inflowId;
        verifiedCategories.add(localCategory.inflowId);
      } else {
        const categoryPayload = group.category || firstProductInGroup?.category;
        if (categoryPayload) {
          console.warn(
            `[Sync Notification] Group Category "${rawCategoryId}" missing locally. Syncing JIT...`
          );
          const newCategory = await syncCategory(tx, categoryPayload);
          if (newCategory?.inflowId) {
            validCategoryId = newCategory.inflowId;
            verifiedCategories.add(newCategory.inflowId);
          }
        }
      }
    }
  }

  const baseSlug = await genInflowUniqueSlug(
    group.name || "product-group",
    tx.productGroup,
    group.productGroupId
  );

  // 3. Upsert the master ProductGroup record node
  const upsertedGroup = await tx.productGroup.upsert({
    where: {
      inflowId: group.productGroupId,
    },
    create: {
      inflowId: group.productGroupId,
      categoryId: validCategoryId,
      name: group.name,
      slug: baseSlug,
      brandId,
      isActive: group.isActive ?? true,
    },
    update: {
      categoryId: validCategoryId,
      name: group.name,
      brandId,
      isActive: group.isActive ?? true,
    },
  });

  // 4. Run explicit feature and metadata parsing parameters conditionally
  if (rawFeaturesString) {
    await syncGroupFeatures(tx, group.productGroupId, rawFeaturesString);
  }
  if (rawTagsString) {
    await syncGroupTags(tx, group.productGroupId, rawTagsString);
  }

  // 5. Loop through Option matrix layout structures (e.g., "Color", "Size")
  for (const option of group.options ?? []) {
    if (!option.name) continue;
    const trimmedOptionName = option.name.trim();

    const globalAttribute = await tx.attribute.upsert({
      where: { name: trimmedOptionName },
      create: { name: trimmedOptionName },
      update: {},
    });

    await tx.productGroupOption.upsert({
      where: {
        inflowId: option.productGroupOptionId,
      },
      create: {
        inflowId: option.productGroupOptionId,
        productGroupId: group.productGroupId,
        lineNum: option.lineNum ?? 1,
        attributeId: globalAttribute.id,
      },
      update: {
        lineNum: option.lineNum ?? 1,
        attributeId: globalAttribute.id,
      },
    });

    // 6. Loop through matching configuration values for this Option Node element
    for (const value of option.optionValues ?? []) {
      if (!value.value) continue;
      const trimmedValue = value.value.trim();

      const globalAttributeValue = await tx.attributeValue.upsert({
        where: {
          attributeId_value: {
            attributeId: globalAttribute.id,
            value: trimmedValue,
          },
        },
        create: {
          attributeId: globalAttribute.id,
          value: trimmedValue,
        },
        update: {},
      });

      await tx.productGroupOptionValue.upsert({
        where: {
          inflowId: value.productGroupOptionValueId,
        },
        create: {
          inflowId: value.productGroupOptionValueId,
          optionId: option.productGroupOptionId,
          lineNum: value.lineNum ?? 1,
          attributeValueId: globalAttributeValue.id,
        },
        update: {
          lineNum: value.lineNum ?? 1,
          attributeValueId: globalAttributeValue.id,
        },
      });
    }
  }

  // 7. Synchronize group images safely only if included in the execution payload context
  if (group.images) {
    await syncGroupImages(tx, group.productGroupId, group.images);
  }

  return upsertedGroup;
}