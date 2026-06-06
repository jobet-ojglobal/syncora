// services/sync/products/helpers.ts

import { Prisma } from "@/generated/prisma/client";
import { InflowProduct, InflowProductGroupImage, InflowProductGroupResponse } from "../types";

type Tx = Prisma.TransactionClient;

export async function syncBrand(
  tx: Tx,
  brandName?: string | null
): Promise<string | null> {
  if (!brandName?.trim()) {
    return null;
  }

  const brand = await tx.brand.upsert({
    where: {
      name: brandName.trim(),
    },
    create: {
      name: brandName.trim(),
    },
    update: {},
  });

  return brand.id;
}

export async function syncFeatures(
  tx: Tx,
  inflowProductId: string,
  value?: string | null
) {
  const product = await tx.product.findUnique({
    where: {
      inflowProductId,
    },
    select: {
      id: true,
    },
  });

  if (!product) return;

  const features = (value ?? "")
    .split(";")
    .map((x) => x.trim())
    .filter(Boolean);

  await tx.productFeature.deleteMany({
    where: {
      productId: product.id,
    },
  });

  for (const featureName of features) {
    const feature = await tx.feature.upsert({
      where: {
        name: featureName,
      },
      create: {
        name: featureName,
      },
      update: {},
    });

    await tx.productFeature.create({
      data: {
        productId: product.id,
        featureId: feature.id,
      },
    });
  }
}

export async function syncTags(
  tx: Tx,
  inflowProductId: string,
  value?: string | null
) {
  const product = await tx.product.findUnique({
    where: {
      inflowProductId,
    },
    select: {
      id: true,
    },
  });

  if (!product) return;

  const tags = (value ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

  await tx.productTag.deleteMany({
    where: {
      productId: product.id,
    },
  });

  for (const tagName of tags) {
    const tag = await tx.tag.upsert({
      where: {
        name: tagName,
      },
      create: {
        name: tagName,
      },
      update: {},
    });

    await tx.productTag.create({
      data: {
        productId: product.id,
        tagId: tag.id,
      },
    });
  }
}

export async function syncPurchasingUom(
  tx: Tx,
  product: InflowProduct
) {
  if (!product.purchasingUom) {
    return;
  }

  await tx.productUom.upsert({
    where: {
      productId: product.productId,
    },
    create: {
      productId: product.productId,
      name: product.purchasingUom.name,
      standardQuantity:
        product.purchasingUom.conversionRatio
          .standardQuantity,
      uomQuantity:
        product.purchasingUom.conversionRatio
          .uomQuantity,
    },
    update: {
      name: product.purchasingUom.name,
      standardQuantity:
        product.purchasingUom.conversionRatio
          .standardQuantity,
      uomQuantity:
        product.purchasingUom.conversionRatio
          .uomQuantity,
    },
  });
}

export async function syncSalesUom(
  tx: Tx,
  product: InflowProduct
) {
  if (!product.salesUom) {
    return;
  }

  await tx.productSalesUom.upsert({
    where: {
      productId: product.productId,
    },
    create: {
      productId: product.productId,
      name: product.salesUom.name,
      standardQuantity:
        product.salesUom.conversionRatio
          .standardQuantity,
      uomQuantity:
        product.salesUom.conversionRatio
          .uomQuantity,
    },
    update: {
      name: product.salesUom.name,
      standardQuantity:
        product.salesUom.conversionRatio
          .standardQuantity,
      uomQuantity:
        product.salesUom.conversionRatio
          .uomQuantity,
    },
  });
}

export async function syncImages(
  tx: Tx,
  product: InflowProduct
) {
  for (
    let index = 0;
    index < (product.images ?? []).length;
    index++
  ) {
    const image = product.images[index];

    await tx.productImage.upsert({
      where: {
        inflowImageId: image.imageId,
      },
      create: {
        inflowImageId: image.imageId,
        productId: product.productId,
        position: index,
        largeUrl: image.largeUrl,
        mediumUncroppedUrl:
          image.mediumUncroppedUrl,
        mediumUrl: image.mediumUrl,
        originalUrl: image.originalUrl,
        smallUrl: image.smallUrl,
        thumbUrl: image.thumbUrl,
      },
      update: {
        position: index,
        largeUrl: image.largeUrl,
        mediumUncroppedUrl:
          image.mediumUncroppedUrl,
        mediumUrl: image.mediumUrl,
        originalUrl: image.originalUrl,
        smallUrl: image.smallUrl,
        thumbUrl: image.thumbUrl,
      },
    });
  }
}

export async function syncGroupImages(
  tx: any,
  groupId: string,
  images: InflowProductGroupImage[]
) {
  for (
    let index = 0;
    index < images.length;
    index++
  ) {
    const groupImage = images[index];
    const image = groupImage.image;

    await tx.productImage.upsert({
      where: {
        inflowImageId: image.imageId,
      },
      create: {
        inflowImageId: image.imageId,
        groupId,
        position: index,
        largeUrl: image.largeUrl,
        mediumUncroppedUrl:
          image.mediumUncroppedUrl,
        mediumUrl: image.mediumUrl,
        originalUrl: image.originalUrl,
        smallUrl: image.smallUrl,
        thumbUrl: image.thumbUrl,
      },
      update: {
        groupId,
        position: index,
        largeUrl: image.largeUrl,
        mediumUncroppedUrl:
          image.mediumUncroppedUrl,
        mediumUrl: image.mediumUrl,
        originalUrl: image.originalUrl,
        smallUrl: image.smallUrl,
        thumbUrl: image.thumbUrl,
      },
    });
  }
}

export function parseFeatures(
  value?: string | null
): string[] {
  return (value ?? "")
    .split(";")
    .map((x) => x.trim())
    .filter(Boolean);
}

export function parseTags(
  value?: string | null
): string[] {
  return (value ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}