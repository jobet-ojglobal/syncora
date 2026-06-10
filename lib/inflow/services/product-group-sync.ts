import { Prisma } from "@/generated/prisma/client";
import { InflowProductGroupResponse } from "../types";
import { syncGroupImages } from "./helpers";

type Tx = Prisma.TransactionClient;

export async function syncProductGroup(
  tx: Tx,
  group: InflowProductGroupResponse
) {
  await tx.productGroup.upsert({
    where: {
      inflowProdGroupId: group.productGroupId,
    },
    create: {
      inflowProdGroupId: group.productGroupId,
      categoryId: group.categoryId,
      defaultProductId: group.defaultProductId,
      defaultImageId: group.defaultImageId,
      name: group.name,
      isActive: group.isActive,
      timestamp: group.timestamp,
    },
    update: {
      categoryId: group.categoryId,
      defaultProductId: group.defaultProductId,
      defaultImageId: group.defaultImageId,
      name: group.name,
      isActive: group.isActive,
      timestamp: group.timestamp,
    },
  });

  // 2. Loop Through Options (e.g., "Color", "Size")
  for (const option of group.options ?? []) {
    const trimmedOptionName = option.name.trim();

    // STEP A: Global Attribute Normalization
    // Create or find the global attribute bucket for this variant type
    const globalAttribute = await tx.attribute.upsert({
      where: { name: trimmedOptionName },
      create: { name: trimmedOptionName },
      update: {}, // No updates needed if it already exists globally
    });

    // STEP B: Local Option Assignment
    // Link the incoming inFlow group option instance to our global attribute ID
    await tx.productGroupOption.upsert({
      where: {
        inflowId: option.productGroupOptionId,
      },
      create: {
        inflowId: option.productGroupOptionId,
        productGroupId: group.productGroupId,
        lineNum: option.lineNum,
        name: option.name,
        attributeId: globalAttribute.id, // Linking our normalized model
      },
      update: {
        lineNum: option.lineNum,
        name: option.name,
        attributeId: globalAttribute.id, // Ensure connection stays unified
      },
    });

    // 3. Loop Through Values for this Option (e.g., "Red", "Blue", "Large")
    for (const value of option.optionValues ?? []) {
      const trimmedValue = value.value.trim();

      // STEP C: Global Attribute Value Normalization
      // Ensure this specific value variant is captured under our parent attribute collection
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
        update: {}, // Retain custom overrides like hexCodes if they were set manually
      });

      // STEP D: Local Option Value Assignment
      // Complete the lookup configuration link for the schema variants
      await tx.productGroupOptionValue.upsert({
        where: {
          inflowId: value.productGroupOptionValueId,
        },
        create: {
          inflowId: value.productGroupOptionValueId,
          optionId: option.productGroupOptionId,
          lineNum: value.lineNum,
          value: value.value,
          attributeValueId: globalAttributeValue.id, // Connects back to global reference
        },
        update: {
          lineNum: value.lineNum,
          value: value.value,
          attributeValueId: globalAttributeValue.id,
        },
      });
    }
  }


  await syncGroupImages(tx,  group.productGroupId, group.images);
}


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