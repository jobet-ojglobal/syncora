import { InflowProduct } from "../types";
import { syncBrand } from "./helpers";
import { syncFeatures } from "./helpers";
import { syncTags } from "./helpers";
import { syncImages } from "./helpers";
import { syncPurchasingUom } from "./helpers";
import { syncSalesUom } from "./helpers";

export async function syncProduct(
  tx: any,
  product: InflowProduct
) {
  const brandId = await syncBrand(
    tx,
    product.customFields?.custom1
  );

  const dbProduct = await tx.product.upsert({
    where: {
      inflowProductId: product.productId,
    },
    create: {
      inflowProductId: product.productId,
      sku: product.sku,
      name: product.name,
      description: product.description,
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
      brandId,
      timestamp: product.timestamp,
    },
    update: {
      sku: product.sku,
      name: product.name,
      description: product.description,
      isActive: product.isActive,
      brandId,
      timestamp: product.timestamp,
    },
  });

  await syncPurchasingUom(tx, product);
  await syncSalesUom(tx, product);
  await syncImages(tx, product);

  await syncFeatures(
    tx,
    dbProduct.id,
    product.customFields?.custom2
  );

  await syncTags(
    tx,
    dbProduct.id,
    product.customFields?.custom3
  );
}

