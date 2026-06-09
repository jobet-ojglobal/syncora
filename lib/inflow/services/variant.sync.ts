export async function syncVariant(
  tx: any,
  productGroupId: string,
  variant: any
) {


  await tx.productVariant.upsert({
    where: {
      inflowVariantId:
        variant.productVariantId,
    },
    create: {
      inflowVariantId:
        variant.productVariantId,
      productGroupId,
      productId: variant.productId,
      defaultPrice:
        variant.defaultPrice,
    },
    update: {
      defaultPrice:
        variant.defaultPrice,
    },
  });

  for (const [optionId, optionValueId] of Object.entries(
    variant.variantOption ?? {}
  )) {
    await tx.productVariantSelection.upsert({
      where: {
        variantId_optionId: {
          variantId:
            variant.productVariantId,
          optionId,
        },
      },
      create: {
        variantId:
          variant.productVariantId,
        optionId,
        optionValueId: String(
          optionValueId
        ),
      },
      update: {
        optionValueId: String(
          optionValueId
        ),
      },
    });
  }
}