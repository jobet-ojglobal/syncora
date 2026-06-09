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

  for (const option of group.options ?? []) {
    await tx.productGroupOption.upsert({
      where: {
        inflowId: option.productGroupOptionId,
      },
      create: {
        inflowId: option.productGroupOptionId,
        productGroupId: group.productGroupId,
        lineNum: option.lineNum,
        name: option.name,
      },
      update: {
        lineNum: option.lineNum,
        name: option.name,
      },
    });

    for (const value of option.optionValues ?? []) {
      await tx.productGroupOptionValue.upsert({
        where: {
          inflowId:
            value.productGroupOptionValueId,
        },
        create: {
          inflowId:
            value.productGroupOptionValueId,
          optionId:
            option.productGroupOptionId,
          lineNum: value.lineNum,
          value: value.value,
        },
        update: {
          lineNum: value.lineNum,
          value: value.value,
        },
      });
    }
  }

  await syncGroupImages(tx,  group.productGroupId, group.images);
}