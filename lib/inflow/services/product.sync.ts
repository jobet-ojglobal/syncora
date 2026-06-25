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
import { Prisma } from "@/generated/prisma/client";

export async function syncProduct(
  tx: any,
  product: InflowProduct,
  groupId?: string
) {
  const brandId = await syncBrand(tx, product.customFields?.custom1);

  const categoryId = product.productVariant?.productGroup?.categoryId;

  const rawFeaturesString = product?.customFields?.custom2; 
  const rawTagsString = product?.customFields?.custom3;

  const baseSlug = await genInflowUniqueSlug(product.name || "product-variant", prisma.product, product.productId);
  const productSlug = `${baseSlug}-${product.productId.slice(0, 5)}`;

  // 1. Core Product Upsert
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
      isManufacturable: product.isManufacturable,
      includeQuantityBuildable: product.includeQuantityBuildable,
      standardUomName: product.standardUomName,
      trackExpiry: product.trackExpiry,
      trackLots: product.trackLots,
      trackSerials: product.trackSerials,
      shelfLifeDays: product.shelfLifeDays,
      sellBeforeExpiryDays: product.sellBeforeExpiryDays,
      expiryNotificationDays: product.expiryNotificationDays,
      weight: product.weight ? new Prisma.Decimal(product.weight) : null,
      width: product.width ? new Prisma.Decimal(product.width) : null,
      height: product.height ? new Prisma.Decimal(product.height) : null,
      length: product.length ? new Prisma.Decimal(product.length) : null,
      originCountry: product.originCountry,
      hsTariffNumber: product.hsTariffNumber,
      remarks: product.remarks,
      lastVendorId: product.lastVendorId,
      lastModifiedById: product.lastModifiedById,
      createdDttm: product.createdDttm ? new Date(product.createdDttm) : null,
      lastModifiedDateTime: product.lastModifiedDateTime ? new Date(product.lastModifiedDateTime) : null,
    },
    update: {
      sku: product.sku,
      name: product.name,
      description: product.description,
      categoryId,
      brandId,
      itemType: product.itemType,
      autoAssemble: product.autoAssemble,
      isActive: product.isActive,
      isManufacturable: product.isManufacturable,
      includeQuantityBuildable: product.includeQuantityBuildable,
      standardUomName: product.standardUomName,
      trackExpiry: product.trackExpiry,
      trackLots: product.trackLots,
      trackSerials: product.trackSerials,
      shelfLifeDays: product.shelfLifeDays,
      sellBeforeExpiryDays: product.sellBeforeExpiryDays,
      expiryNotificationDays: product.expiryNotificationDays,
      weight: product.weight ? new Prisma.Decimal(product.weight) : null,
      width: product.width ? new Prisma.Decimal(product.width) : null,
      height: product.height ? new Prisma.Decimal(product.height) : null,
      length: product.length ? new Prisma.Decimal(product.length) : null,
      originCountry: product.originCountry,
      hsTariffNumber: product.hsTariffNumber,
      remarks: product.remarks,
      lastVendorId: product.lastVendorId,
      lastModifiedById: product.lastModifiedById,
      lastModifiedDateTime: product.lastModifiedDateTime ? new Date(product.lastModifiedDateTime) : null,
    },
  });

  // Base Helpers Sync Handling
  await syncPurchasingUom(tx, product);
  await syncSalesUom(tx, product);
  await syncImages(tx, product);

  /**
   * 2. Barcodes Sync
   */
  await tx.productBarcode.deleteMany({ where: { productId: product.productId } });
  if (product.productBarcodes?.length) {
    await tx.productBarcode.createMany({
      data: product.productBarcodes.map((bc) => ({
        inflowId: bc.productBarcodeId,
        productId: product.productId,
        barcode: bc.barcode,
        lineNum: typeof bc.lineNum === "string" ? parseInt(bc.lineNum, 10) : bc.lineNum,
      })),
      skipDuplicates: true,
    });
  }

  /**
   * 3. Tax Codes Sync
   */
  await tx.productTaxCode.deleteMany({ where: { productId: product.productId } });
  if (product.taxCodes?.length) {
    await tx.productTaxCode.createMany({
      data: product.taxCodes.map((tc) => ({
        productTaxCodeId: tc.productTaxCodeId,
        productId: product.productId,
        taxCodeId: tc.taxCodeId,
        taxingSchemeId: tc.taxingSchemeId,
        timestamp: tc.timestamp,
      })),
      skipDuplicates: true,
    });
  }

  /**
   * 4. Reorder Settings Sync
   */
  await tx.reorderSetting.deleteMany({ where: { productId: product.productId } });
  if (product.reorderSettings?.length) {
    await tx.reorderSetting.createMany({
      data: product.reorderSettings.map((rs) => ({
        inflowId: rs.reorderSettingsId,
        productId: product.productId,
        locationId: rs.locationId,
        fromLocationId: rs.fromLocationId,
        vendorId: rs.vendorId,
        defaultSublocation: rs.defaultSublocation,
        enableReordering: rs.enableReordering ?? true,
        reorderMethod: rs.reorderMethod || "PurchaseOrder",
        reorderPoint: new Prisma.Decimal(rs.reorderPoint || 0),
        reorderQuantity: new Prisma.Decimal(rs.reorderQuantity || 0),
        timestamp: rs.timestamp,
      })),
      skipDuplicates: true,
    });
  }

  /**
   * 5. Product Operations Sync
   */
  await tx.productOperation.deleteMany({ where: { productId: product.productId } });
  if (product.productOperations?.length) {
    await tx.productOperation.createMany({
      data: product.productOperations.map((po) => ({
        inflowId: po.productOperationId,
        productId: product.productId,
        operationTypeId: po.operationTypeId,
        lineNum: typeof po.lineNum === "string" ? parseInt(po.lineNum, 10) : po.lineNum,
        cost: new Prisma.Decimal(po.cost || 0),
        estimatedPerHourCost: new Prisma.Decimal(po.estimatedPerHourCost || 0),
        estimatedSeconds: new Prisma.Decimal(po.estimatedSeconds || 0),
        instructions: po.instructions,
        trackTime: po.trackTime ?? false,
        timestamp: po.timestamp,
      })),
      skipDuplicates: true,
    });
  }

  /**
   * 6. Product Prices Sync
   */
  await tx.productPrice.deleteMany({ where: { productId: product.productId } });
  if (product.prices?.length) {
    await tx.productPrice.createMany({
      data: product.prices.map((p) => {
        let normalizedPriceType = "fixedPrice";
        const incomingType = p.priceType?.toLowerCase() || "";
        if (incomingType.includes("markup")) normalizedPriceType = "markup";
        if (incomingType.includes("margin")) normalizedPriceType = "margin";

        return {
          inflowId: p.productPriceId,
          pricingSchemeId: p.pricingSchemeId,
          productId: product.productId,
          priceType: normalizedPriceType as any,
          unitPrice: p.unitPrice ? new Prisma.Decimal(p.unitPrice) : null,
          fixedMarkup: p.fixedMarkup ? new Prisma.Decimal(p.fixedMarkup) : null,
        };
      }),
      skipDuplicates: true,
    });
  }

  /**
   * 7. Product Cost (1:1 Relation Upsert)
   */
  if (product.cost) {
    await tx.productCost.upsert({
      where: { productId: product.productId },
      create: {
        inflowId: product.cost.productCostId,
        productId: product.productId,
        cost: new Prisma.Decimal(product.cost.cost || 0),
      },
      update: {
        inflowId: product.cost.productCostId,
        cost: new Prisma.Decimal(product.cost.cost || 0),
      },
    });
  } else {
    await tx.productCost.deleteMany({ where: { productId: product.productId } });
  }

  /**
   * 8. Item BOM (Bill of Materials) Components Sync
   */
  await tx.productBom.deleteMany({ where: { productId: product.productId } });
  if (product.itemBoms?.length) {
    await tx.productBom.createMany({
      data: product.itemBoms.map((bom) => {
        // 1. Resolve the value safely. If bom.quantity is an object, get standardQuantity.
        // If it's a string, use it directly. Otherwise, fall back to "0".
        const rawQuantity = typeof bom.quantity === "object" 
          ? bom.quantity?.standardQuantity 
          : bom.quantity;

        return {
          inflowId: bom.itemBomId,
          productId: product.productId,
          childProductId: bom.childProductId,
          // 2. Ensure Prisma.Decimal receives a clear scalar string/number
          quantity: new Prisma.Decimal(rawQuantity || "0"),
          timestamp: bom.timestamp,
        };
      }),
      skipDuplicates: true,
    });
  }

  /**
   * 9. Product Attachments Sync
   */
  await tx.productAttachment.deleteMany({ where: { productId: product.productId } });
  if (product.attachments?.length) {
    await tx.productAttachment.createMany({
      data: product.attachments.map((att) => ({
        inflowId: att.attachmentId,
        productId: product.productId,
        attachmentUrl: att.attachmentUrl,
        fileName: att.fileName,
        lastModDttm: att.lastModDttm ? new Date(att.lastModDttm) : null,
        lastModifiedById: att.lastModifiedById,
      })),
      skipDuplicates: true,
    });
  }

  // 10. Hand off Features & Tags processing to isolated sub-functions
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

// import { prisma } from "@/lib/prisma";
// import { InflowProduct } from "../types";
// import { 
//   syncBrand, 
//   syncProductFeatures, 
//   syncProductTags, 
//   syncGroupFeatures,
//   syncGroupTags,
//   syncImages,
//   syncPurchasingUom,
//   syncSalesUom
// } from "./helpers";

// import { genInflowUniqueSlug } from "@/helpers/genUniqueSlug";

// export async function syncProduct(
//   tx: any,
//   product: InflowProduct,
//   groupId?: string
// ) {
//   const brandId = await syncBrand(tx, product.customFields?.custom1);

//   const categoryId =
//   product.productVariant?.productGroup?.categoryId;

//   const rawFeaturesString = product?.customFields?.custom2; // e.g., "Sensor:Full Frame|Max Resolution:8K 30p"
//   const rawTagsString = product?.customFields?.custom3;

//   const baseSlug = await genInflowUniqueSlug(product.name || "product-variant", prisma.product, product.productId);
//   const productSlug = `${baseSlug}-${product.productId.slice(0, 5)}`;

//   const dbProduct = await tx.product.upsert({
//     where: {
//       inflowId: product.productId,
//     },
//     create: {
//       inflowId: product.productId,
//       sku: product.sku,
//       name: product.name,
//       slug: productSlug,
//       description: product.description,
//       categoryId,
//       brandId,
//       itemType: product.itemType,
//       autoAssemble: product.autoAssemble,
//       isActive: product.isActive,
//       isManufacturable:
//         product.isManufacturable,
//       includeQuantityBuildable:
//         product.includeQuantityBuildable,
//       standardUomName:
//         product.standardUomName,
//       trackExpiry: product.trackExpiry,
//       trackLots: product.trackLots,
//       trackSerials: product.trackSerials,
//       weight: product.weight,
//       width: product.width,
//       height: product.height,
//       length: product.length,
//       remarks: product.remarks,
//       // timestamp: product.timestamp,
//     },
//     update: {
//       sku: product.sku,
//       name: product.name,
//       description: product.description,
//       categoryId,
//       brandId,
//       // timestamp: product.timestamp,
//     },
//   });

//   await syncPurchasingUom(tx, product);
//   await syncSalesUom(tx, product);
//   await syncImages(tx, product);

//   // 3. Hand off Features & Tags processing to isolated sub-functions 🚀
//   if (product.productId && groupId) {
//     await syncGroupFeatures(tx, groupId, rawFeaturesString);
//     await syncGroupTags(tx, groupId, rawTagsString);
//   } else {
//     if (product.productId) {
//       await syncProductFeatures(tx, product.productId, rawFeaturesString);
//       await syncProductTags(tx, product.productId, rawTagsString);
//     }
//   }

//   return dbProduct;
// }

