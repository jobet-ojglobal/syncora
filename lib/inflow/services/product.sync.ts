import { prisma } from "@/lib/prisma";
import { InflowProduct } from "../types";
import { 
  syncBrand, 
  syncProductFeatures, 
  syncProductTags, 
  syncGroupFeatures,
  syncGroupTags,
  syncImages,
  syncPurchasingUom,
  syncSalesUom
} from "./helpers";

import { genInflowUniqueSlug } from "@/helpers/genUniqueSlug";

export async function syncProduct(
  tx: any,
  product: InflowProduct,
  groupId?: string
) {
  const brandId = await syncBrand(tx, product.customFields?.custom1);

  const categoryId =
  product.productVariant?.productGroup?.categoryId;

  const rawFeaturesString = product?.customFields?.custom2; // e.g., "Sensor:Full Frame|Max Resolution:8K 30p"
  const rawTagsString = product?.customFields?.custom3;

  const baseSlug = await genInflowUniqueSlug(product.name || "product-variant", prisma.product, product.productId);
  const productSlug = `${baseSlug}-${product.productId.slice(0, 5)}`;

  const dbProduct = await tx.product.upsert({
    where: {
      inflowId: product.productId,
    },
    create: {
      inflowId: product.productId,
      sku: product.sku,
      name: product.name,
      slug: productSlug,
      description: product.description,
      categoryId,
      brandId,
      itemType: product.itemType,
      autoAssemble: product.autoAssemble,
      isActive: product.isActive,
      isManufacturable:
        product.isManufacturable,
      includeQuantityBuildable:
        product.includeQuantityBuildable,
      standardUomName:
        product.standardUomName,
      trackExpiry: product.trackExpiry,
      trackLots: product.trackLots,
      trackSerials: product.trackSerials,
      weight: product.weight,
      width: product.width,
      height: product.height,
      length: product.length,
      remarks: product.remarks,
      timestamp: product.timestamp,
    },
    update: {
      sku: product.sku,
      name: product.name,
      description: product.description,
      categoryId,
      brandId,
      timestamp: product.timestamp,
    },
  });

  await syncPurchasingUom(tx, product);
  await syncSalesUom(tx, product);
  await syncImages(tx, product);

  // 3. Hand off Features & Tags processing to isolated sub-functions 🚀
  if (product.productId && groupId) {
    await syncGroupFeatures(tx, groupId, rawFeaturesString);
    await syncGroupTags(tx, groupId, rawTagsString);
  } else {
    if (product.productId) {
      await syncProductFeatures(tx, product.productId, rawFeaturesString);
      await syncProductTags(tx, product.productId, rawTagsString);
    }
  }

  return dbProduct;
}

