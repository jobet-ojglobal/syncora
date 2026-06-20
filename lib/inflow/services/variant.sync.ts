export async function syncVariant(
  tx: any,
  productGroupId: string,
  variant: any
) {
  const optionEntries = Object.entries(
    variant.variantOption ?? {}
  );

  const signature = optionEntries
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([optionId, valueId]) => `${optionId}:${valueId}`)
    .join("|");

  const variantCount = optionEntries.length;

  await tx.productVariant.upsert({
    where: {
      inflowId: variant.productVariantId,
    },
    create: {
      inflowId: variant.productVariantId,
      productGroupId,
      productId: variant.productId,
      defaultPrice: variant.defaultPrice,
      sku: variant.sku ?? null,
      signature,
      variantCount,
    },
    update: {
      defaultPrice: variant.defaultPrice,
      sku: variant.sku ?? null,
      signature,
      variantCount,
    },
  });

  for (const [optionId, optionValueId] of optionEntries) {
    await tx.productVariantSelection.upsert({
      where: {
        variantId_optionId: {
          variantId: variant.productVariantId,
          optionId,
        },
      },
      create: {
        variantId: variant.productVariantId,
        optionId,
        optionValueId: String(optionValueId),
      },
      update: {
        optionValueId: String(optionValueId),
      },
    });
  }
}