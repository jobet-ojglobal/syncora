// services/sync/products/product-group.sync.ts
import { Prisma, ProductGroup } from "@/generated/prisma/client";
import { genInflowUniqueSlug } from "@/helpers/genUniqueSlug";
import { InflowProduct, InflowProductGroup } from "../types";
import { syncBrand, syncGroupFeatures, syncGroupImages, syncGroupTags } from "./helpers";
import { ensureCategoryShell } from "./ensure.service";

type Tx = Prisma.TransactionClient;

type SyncCache = {
  verifiedTeamMemberIds?: Set<string>;
  verifiedCategoryIds?: Set<string>;
  verifiedVendorIds?: Set<string>;
};

export async function syncProductGroup(
  tx: Tx,
  group: InflowProductGroup,
  firstProductInGroup?: InflowProduct,
  hasCoreGroupData?: boolean,
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
          const newCategory = await ensureCategoryShell(tx, categoryPayload);
          if (newCategory?.inflowId) {
            validCategoryId = newCategory.inflowId;
            verifiedCategories.add(newCategory.inflowId);
          }
        }
      }
    }
  }

  const localProductGroup = await tx.productGroup.findUnique({
    where: { inflowId: group.productGroupId }
  });

  let validGroupData: ProductGroup | null = null;

  if(hasCoreGroupData) {
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

    validGroupData = upsertedGroup
  } else {
    validGroupData = localProductGroup
  }

  if(!validGroupData) return null;

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

  return validGroupData;
}

// // services/sync/products/product-group-sync.ts
// import { InflowProduct, InflowProductGroup } from "../types";
// import { syncBrand, syncGroupFeatures, syncGroupImages, syncGroupTags } from "./helpers";
// import { genInflowUniqueSlug } from "@/helpers/genUniqueSlug";
// import { Prisma } from "@/generated/prisma/client";
// import { prisma } from "@/lib/prisma";

// type Tx = Prisma.TransactionClient;

// export async function syncProductGroup(
//   tx: typeof prisma | Tx,
//   group: InflowProductGroup,
//   firstProductInGroup?: InflowProduct 
// ) {
//   // 1. Extract values safely from inFlow product custom fields schema metadata layout references
//   const brandName = firstProductInGroup?.customFields?.custom1;
//   const rawFeaturesString = firstProductInGroup?.customFields?.custom2; 
//   const rawTagsString = firstProductInGroup?.customFields?.custom3;     

//   let brandId: string | null = null;
//   if (brandName) {
//     brandId = await syncBrand(tx, brandName);
//   }

//   const baseSlug = await genInflowUniqueSlug(group.name || "product-group", tx.productGroup, group.productGroupId);

//   // 2. Upsert the master ProductGroup record node
//   const upsertedGroup = await tx.productGroup.upsert({
//     where: {
//       inflowId: group.productGroupId,
//     },
//     create: {
//       inflowId: group.productGroupId,
//       categoryId: group.categoryId || null, 
//       name: group.name,
//       slug: baseSlug,
//       brandId,
//       isActive: group.isActive ?? true,
//     },
//     update: {
//       categoryId: group.categoryId || null,
//       name: group.name,
//       brandId,
//       isActive: group.isActive ?? true,
//     },
//   });

//   // 3. Run explicit feature and metadata parsing parameters conditionally
//   if (rawFeaturesString) {
//     await syncGroupFeatures(tx, group.productGroupId, rawFeaturesString);
//   }
//   if (rawTagsString) {
//     await syncGroupTags(tx, group.productGroupId, rawTagsString);
//   }

//   // 4. Loop through Option matrix layout structures (e.g., "Color", "Size")
//   for (const option of group.options ?? []) {
//     if (!option.name) continue;
//     const trimmedOptionName = option.name.trim();

//     const globalAttribute = await tx.attribute.upsert({
//       where: { name: trimmedOptionName },
//       create: { name: trimmedOptionName },
//       update: {},
//     });

//     await tx.productGroupOption.upsert({
//       where: {
//         inflowId: option.productGroupOptionId,
//       },
//       create: {
//         inflowId: option.productGroupOptionId,
//         productGroupId: group.productGroupId,
//         lineNum: option.lineNum ?? 1,
//         attributeId: globalAttribute.id,
//       },
//       update: {
//         lineNum: option.lineNum ?? 1,
//         attributeId: globalAttribute.id,
//       },
//     });

//     // 5. Loop through matching configuration values for this Option Node element
//     for (const value of option.optionValues ?? []) {
//       if (!value.value) continue;
//       const trimmedValue = value.value.trim();

//       const globalAttributeValue = await tx.attributeValue.upsert({
//         where: {
//           attributeId_value: {
//             attributeId: globalAttribute.id,
//             value: trimmedValue,
//           },
//         },
//         create: {
//           attributeId: globalAttribute.id,
//           value: trimmedValue,
//         },
//         update: {},
//       });

//       await tx.productGroupOptionValue.upsert({
//         where: {
//           inflowId: value.productGroupOptionValueId,
//         },
//         create: {
//           inflowId: value.productGroupOptionValueId,
//           optionId: option.productGroupOptionId,
//           lineNum: value.lineNum ?? 1,
//           attributeValueId: globalAttributeValue.id,
//         },
//         update: {
//           lineNum: value.lineNum ?? 1,
//           attributeValueId: globalAttributeValue.id,
//         },
//       });
//     }
//   }

//   // 6. Synchronize group images safely only if included in the execution payload context
//   if (group.images) {
//     await syncGroupImages(tx, group.productGroupId, group.images);
//   }

//   return upsertedGroup;
// }

// import { Prisma } from "@/generated/prisma/client";
// import { InflowProduct, InflowProductGroup } from "../types";
// import { syncBrand, syncGroupFeatures, syncGroupImages, syncGroupTags } from "./helpers";
// import { genInflowUniqueSlug } from "@/helpers/genUniqueSlug";

// type Tx = Prisma.TransactionClient;

// export async function syncProductGroup(
//   tx: Tx,
//   group: InflowProductGroup,
//   firstProductInGroup?: InflowProduct // Pass the base product object to grab its customFields brand name
// ) {

//   // 1. Extract values from your inFlow product custom fields
//   const brandName = firstProductInGroup?.customFields?.custom1;
//   const rawFeaturesString = firstProductInGroup?.customFields?.custom2; // e.g., "Sensor:Full Frame|Max Resolution:8K 30p"
//   const rawTagsString = firstProductInGroup?.customFields?.custom3;     // e.g., "hot-swap, wireless"

//   let brandId: string | null = null;
//   if (brandName) {
//     brandId = await syncBrand(tx, brandName);
//   }

//   const baseSlug = await genInflowUniqueSlug(group.name || "product-group", tx.productGroup, group.productGroupId);

//   // 3. Upsert the master ProductGroup record
//   const upsertedGroup = await tx.productGroup.upsert({
//     where: {
//       inflowId: group.productGroupId,
//     },
//     create: {
//       inflowId: group.productGroupId,
//       categoryId: group.categoryId, // Category.inflowId
//       name: group.name,
//       slug: baseSlug,
//       brandId,
//       isActive: group.isActive,
//     },
//     update: {
//       categoryId: group.categoryId,
//       name: group.name,
//       brandId,
//       isActive: group.isActive,
//     },
//   });

//   // 3. Hand off Features & Tags processing to isolated sub-functions 🚀
//   if (group.defaultProductId) {
//     await syncGroupFeatures(tx, group.productGroupId, rawFeaturesString);
//     await syncGroupTags(tx, group.productGroupId, rawTagsString);
//   }

//   // 3. Loop Through Options (e.g., "Color", "Size")
//   for (const option of group.options ?? []) {
//     const trimmedOptionName = option.name.trim();

//     const globalAttribute = await tx.attribute.upsert({
//       where: { name: trimmedOptionName },
//       create: { name: trimmedOptionName },
//       update: {},
//     });

//     await tx.productGroupOption.upsert({
//       where: {
//         inflowId: option.productGroupOptionId,
//       },
//       create: {
//         inflowId: option.productGroupOptionId,
//         productGroupId: group.productGroupId,
//         lineNum: option.lineNum,
//         attributeId: globalAttribute.id,
//       },
//       update: {
//         lineNum: option.lineNum,
//         attributeId: globalAttribute.id,
//       },
//     });

//     // 4. Loop Through Values for this Option
//     for (const value of option.optionValues ?? []) {
//       const trimmedValue = value.value.trim();

//       const globalAttributeValue = await tx.attributeValue.upsert({
//         where: {
//           attributeId_value: {
//             attributeId: globalAttribute.id,
//             value: trimmedValue,
//           },
//         },
//         create: {
//           attributeId: globalAttribute.id,
//           value: trimmedValue,
//         },
//         update: {},
//       });

//       await tx.productGroupOptionValue.upsert({
//         where: {
//           inflowId: value.productGroupOptionValueId,
//         },
//         create: {
//           inflowId: value.productGroupOptionValueId,
//           optionId: option.productGroupOptionId,
//           lineNum: value.lineNum,
//           attributeValueId: globalAttributeValue.id,
//         },
//         update: {
//           lineNum: value.lineNum,
//           attributeValueId: globalAttributeValue.id,
//         },
//       });
//     }
//   }

//   await syncGroupImages(tx, group.productGroupId, group.images);
//   return upsertedGroup;
// }


  // Parse structured features array: [{ key: "Sensor", value: "Full Frame" }]
  // const parsedFeatures = (rawFeaturesString ?? "")
  //   .split("|")
  //   .map((item) => {
  //     const parts = item.split(":");
  //     if (parts.length < 2) return null;
  //     return {
  //       key: parts[0].trim(),
  //       value: parts.slice(1).join(":").trim(), // Handle nested colons safely
  //     };
  //   })
  //   .filter((f): f is { key: string; value: string } => f !== null && f.key !== "");

  // // Parse structured tags array: ["hot-swap", "wireless"]
  // const parsedTags = (rawTagsString ?? "")
  //   .split(",")
  //   .map((t) => t.trim())
  //   .filter(Boolean);

  // const baseSlug = await genUniqueSlug(group.name || "product-group", prisma.productGroup);
  // // Fallback random string appending logic can go here if your source data allows duplicate names
  // // const groupSlug = `${baseSlug}-${group.productGroupId.slice(0, 5)}`;

  // // 2. Perform Group Upsert
  // // Since we wipe and rebuild features/tags to avoid duplicates, we look up the internal ID first
  // const existingGroup = await tx.productGroup.findUnique({
  //   where: { inflowProdGroupId: group.productGroupId },
  //   select: { id: true },
  // });

  // if (existingGroup) {
  //   // Clean up existing relations for this group id before re-syncing
  //   await tx.productFeature.deleteMany({ where: { productGroupId: existingGroup.id } });
  //   await tx.productTag.deleteMany({ where: { productGroupId: existingGroup.id } });
  // }

  // const upsertedGroup = await tx.productGroup.upsert({
  //   where: {
  //     inflowProdGroupId: group.productGroupId,
  //   },
  //   create: {
  //     inflowProdGroupId: group.productGroupId,
  //     categoryId: group.categoryId,
  //     defaultProductId: group.defaultProductId,
  //     defaultImageId: group.defaultImageId,
  //     name: group.name,
  //     slug: baseSlug,
  //     brandId,
  //     isActive: group.isActive,
  //     timestamp: group.timestamp,
  //     // Create fresh feature connections nested
  //     productFeatures: {
  //       create: parsedFeatures.map((f) => ({
  //         key: f.key,
  //         value: f.value,
  //       })),
  //     },
  //     // Create fresh tag connections nested
  //     productTags: {
  //       create: parsedTags.map((tag) => ({
  //         name: tag,
  //       })),
  //     },
  //   },
  //   update: {
  //     categoryId: group.categoryId,
  //     defaultProductId: group.defaultProductId,
  //     defaultImageId: group.defaultImageId,
  //     name: group.name,
  //     brandId,
  //     isActive: group.isActive,
  //     timestamp: group.timestamp,
  //     features: {
  //       create: parsedFeatures.map((f) => ({
  //         key: f.key,
  //         value: f.value,
  //       })),
  //     },
  //     tags: {
  //       create: parsedTags.map((tag) => ({
  //         name: tag,
  //       })),
  //     },
  //   },
  // });


  // await tx.productGroup.upsert({
  //   where: {
  //     inflowProdGroupId: group.productGroupId,
  //   },
  //   create: {
  //     inflowProdGroupId: group.productGroupId,
  //     categoryId: group.categoryId,
  //     defaultProductId: group.defaultProductId,
  //     defaultImageId: group.defaultImageId,
  //     name: group.name,
  //     slug: baseSlug, // Required unique constraint satisfied
  //     brandId,         // Maps the parent brand relationship
  //     features: 
  //     tags: 
  //     isActive: group.isActive,
  //     timestamp: group.timestamp,
  //   },
  //   update: {
  //     categoryId: group.categoryId,
  //     defaultProductId: group.defaultProductId,
  //     defaultImageId: group.defaultImageId,
  //     name: group.name,
  //     brandId, // Update if brand changed on the source product
  //     features: 
  //     tags: 
  //     isActive: group.isActive,
  //     timestamp: group.timestamp,
  //   },
  // });

  // // 2. Loop Through Options (e.g., "Color", "Size")
  // for (const option of group.options ?? []) {
  //   const trimmedOptionName = option.name.trim();

  //   // STEP A: Global Attribute Normalization
  //   // Create or find the global attribute bucket for this variant type
  //   const globalAttribute = await tx.attribute.upsert({
  //     where: { name: trimmedOptionName },
  //     create: { name: trimmedOptionName },
  //     update: {}, // No updates needed if it already exists globally
  //   });

  //   // STEP B: Local Option Assignment
  //   // Link the incoming inFlow group option instance to our global attribute ID
  //   await tx.productGroupOption.upsert({
  //     where: {
  //       inflowId: option.productGroupOptionId,
  //     },
  //     create: {
  //       inflowId: option.productGroupOptionId,
  //       productGroupId: group.productGroupId,
  //       lineNum: option.lineNum,
  //       name: option.name,
  //       attributeId: globalAttribute.id, // Linking our normalized model
  //     },
  //     update: {
  //       lineNum: option.lineNum,
  //       name: option.name,
  //       attributeId: globalAttribute.id, // Ensure connection stays unified
  //     },
  //   });

  //   // 3. Loop Through Values for this Option (e.g., "Red", "Blue", "Large")
  //   for (const value of option.optionValues ?? []) {
  //     const trimmedValue = value.value.trim();

  //     // STEP C: Global Attribute Value Normalization
  //     // Ensure this specific value variant is captured under our parent attribute collection
  //     const globalAttributeValue = await tx.attributeValue.upsert({
  //       where: {
  //         attributeId_value: {
  //           attributeId: globalAttribute.id,
  //           value: trimmedValue,
  //         },
  //       },
  //       create: {
  //         attributeId: globalAttribute.id,
  //         value: trimmedValue,
  //       },
  //       update: {}, // Retain custom overrides like hexCodes if they were set manually
  //     });

  //     // STEP D: Local Option Value Assignment
  //     // Complete the lookup configuration link for the schema variants
  //     await tx.productGroupOptionValue.upsert({
  //       where: {
  //         inflowId: value.productGroupOptionValueId,
  //       },
  //       create: {
  //         inflowId: value.productGroupOptionValueId,
  //         optionId: option.productGroupOptionId,
  //         lineNum: value.lineNum,
  //         value: value.value,
  //         attributeValueId: globalAttributeValue.id, // Connects back to global reference
  //       },
  //       update: {
  //         lineNum: value.lineNum,
  //         value: value.value,
  //         attributeValueId: globalAttributeValue.id,
  //       },
  //     });
  //   }
  // }

  // await syncGroupImages(tx,  group.productGroupId, group.images);
  
// }

// inside app/api/admin/product-groups/route.ts
// const incomingPayload = await request.json();

// // ✨ Convert the key-value array into the required string pipe format:
// // "Sensor:Full Frame|Max Resolution:8K 30p|Weather Sealing:Yes"
// const flattenedFeaturesString = incomingPayload.features
//   ?.map((f: { key: string; value: string }) => `${f.key.trim()}:${f.value.trim()}`)
//   .join("|") || "";

// // Proceed with your Prisma connection write block
// const newGroup = await prisma.productGroup.create({
//   data: {
//     inflowProdGroupId: crypto.randomUUID(),
//     name: incomingPayload.name,
//     slug: incomingPayload.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
//     isActive: incomingPayload.isActive,
//     categoryId: incomingPayload.categoryId,
//     brandId: incomingPayload.brandId,
    
//     // Pass the calculated string map down smoothly
//     description: flattenedFeaturesString, 
    
//     tags: {
//       createMany: { data: incomingPayload.tags.map((t: string) => ({ name: t })) }
//     }
//   }
// });


  // for (const option of group.options ?? []) {
  //   await tx.productGroupOption.upsert({
  //     where: {
  //       inflowId: option.productGroupOptionId,
  //     },
  //     create: {
  //       inflowId: option.productGroupOptionId,
  //       productGroupId: group.productGroupId,
  //       lineNum: option.lineNum,
  //       name: option.name,
  //     },
  //     update: {
  //       lineNum: option.lineNum,
  //       name: option.name,
  //     },
  //   });

  //   for (const value of option.optionValues ?? []) {
  //     await tx.productGroupOptionValue.upsert({
  //       where: {
  //         inflowId:
  //           value.productGroupOptionValueId,
  //       },
  //       create: {
  //         inflowId:
  //           value.productGroupOptionValueId,
  //         optionId:
  //           option.productGroupOptionId,
  //         lineNum: value.lineNum,
  //         value: value.value,
  //       },
  //       update: {
  //         lineNum: value.lineNum,
  //         value: value.value,
  //       },
  //     });
  //   }
  // }