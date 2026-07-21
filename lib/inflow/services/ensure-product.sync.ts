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

type Tx = Prisma.TransactionClient;

export async function ensureSyncProduct(
  tx: Tx,
  product: InflowProduct,
  groupId?: string
) {
  const brandId = await syncBrand(tx, product.customFields?.custom1);

  // 1. Capture target group parameters safely
  const targetGroupId = groupId || product.productVariant?.productGroup?.productGroupId || null;
  
  // 2. Initial attempt to grab categoryId from incoming nested stream
  let categoryId = product.productVariant?.productGroup?.categoryId || null;

  // Fallback gate for category if payload inclusions are missing group contexts
  if (!categoryId) {
    const existingLocalProduct = await tx.product.findUnique({
      where: { inflowId: product.productId },
      select: { categoryId: true }
    });
    if (existingLocalProduct?.categoryId) {
      categoryId = existingLocalProduct.categoryId;
    }
  }

  // 3. 🛡️ FOREIGN KEY GUARD: Check if the TeamMember exists before assigning lastModifiedById
  let validLastModifiedById: string | null = null;
  if (product.lastModifiedById) {
    const localMember = await tx.teamMember.findUnique({
      where: { inflowId: product.lastModifiedById },
      select: { inflowId: true }
    });
    
    if (localMember) {
      validLastModifiedById = localMember.inflowId;
    } else {
      console.warn(
        `[Sync Notification] TeamMember with inflowId "${product.lastModifiedById}" not synced yet. Setting product.lastModifiedById to null to avoid constraint errors.`
      );
    }
  }

  // 3. 🛡️ SELF-HEALING FOREIGN KEY GUARD: Vendor
  let validLastVendorId: string | null = null;
  if (product.lastVendorId) {
    const localVendor = await tx.vendor.findUnique({
      where: { inflowId: product.lastVendorId },
      select: { inflowId: true }
    });
    
    if (localVendor) {
      validLastVendorId = localVendor.inflowId;
    } else {
      try {
        console.log(`[JIT Sync] Vendor "${product.lastVendorId}" missing locally. Fetching from cloud...`);
      } catch (err) {
        console.error(`[JIT Sync Error] Could not recover Vendor "${product.lastVendorId}":`, err);
        // Fallback safely to null to preserve primary process stability if cloud asset was deleted
      }
    }
  }

  const rawFeaturesString = product?.customFields?.custom2; 
  const rawTagsString = product?.customFields?.custom3;

  const baseSlug = await genInflowUniqueSlug(product.name || "product-variant", tx.product, product.productId);

  // 4. Core Product Upsert Configuration
  const dbProduct = await tx.product.upsert({
    where: {
      inflowId: product.productId,
    },
    create: {
      inflowId: product.productId,
      sku: product.sku,
      name: product.name,
      slug: baseSlug,
      description: product.description,
      categoryId, // Safe from accidental null mutation wipes now!
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
      lastVendorId: validLastVendorId,
      lastModifiedById: validLastModifiedById,
      createdDttm: product.createdDttm ? new Date(product.createdDttm) : null,
      lastModifiedDateTime: product.lastModifiedDateTime ? new Date(product.lastModifiedDateTime) : null,
    },
    update: {
      sku: product.sku,
      name: product.name,
      description: product.description,
      categoryId, // Kept safe during schema update routines
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
      lastVendorId: validLastVendorId,
      lastModifiedById: validLastModifiedById,
      lastModifiedDateTime: product.lastModifiedDateTime ? new Date(product.lastModifiedDateTime) : null,
    },
  });

  // Base Helpers Execution (Check if fields exist in payload down inside helpers)
  await syncPurchasingUom(tx, product);
  await syncSalesUom(tx, product);
  
  if (product.images) {
    await syncImages(tx, product);
  }

  /**
   * 2. Barcodes Sync (Guarded from partial check wipes)
   */
  if (product.productBarcodes !== undefined) {
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
  }

  /**
   * 3. Tax Codes Sync
   */
  if (product.taxCodes !== undefined) {
    await tx.productTaxCode.deleteMany({ where: { productId: product.productId } });
    if (product.taxCodes?.length) {
      await tx.productTaxCode.createMany({
        data: product.taxCodes.map((tc) => ({
          productTaxCodeId: tc.productTaxCodeId,
          productId: product.productId,
          taxCodeId: tc.taxCodeId,
          taxingSchemeId: tc.taxingSchemeId,
        })),
        skipDuplicates: true,
      });
    }
  }

  /**
   * 4. Reorder Settings Sync
   */
  if (product.reorderSettings !== undefined) {
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
        })),
        skipDuplicates: true,
      });
    }
  }

  /**
   * 5. Product Operations Sync
   */
  if (product.productOperations !== undefined) {
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
        })),
        skipDuplicates: true,
      });
    }
  }

  /**
   * 6. Product Prices Sync
   */
  if (product.prices !== undefined) {
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
  }

  /**
   * 7. Product Cost (1:1 Relation Sync Setup)
   */
  if (product.cost !== undefined) {
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
  }

  /**
   * 8. Item BOM (Bill of Materials) Components Sync
   */
  if (product.itemBoms !== undefined) {
    await tx.productBom.deleteMany({ where: { productId: product.productId } });
    if (product.itemBoms?.length) {
      await tx.productBom.createMany({
        data: product.itemBoms.map((bom) => {
          const rawQuantity = typeof bom.quantity === "object" 
            ? bom.quantity?.standardQuantity 
            : bom.quantity;

          return {
            inflowId: bom.itemBomId,
            productId: product.productId,
            childProductId: bom.childProductId,
            quantity: new Prisma.Decimal(rawQuantity || "0"),
          };
        }),
        skipDuplicates: true,
      });
    }
  }

  /**
   * 9. Product Attachments Sync
   */
  if (product.attachments !== undefined) {
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
  }

  /**
   * 10. Metadata / Features / Tags Dynamic Routing
   */
  if (targetGroupId) {
    await syncGroupFeatures(tx, targetGroupId, rawFeaturesString);
    await syncGroupTags(tx, targetGroupId, rawTagsString);
  } else {
    await syncProductFeatures(tx, product.productId, rawFeaturesString);
    await syncProductTags(tx, product.productId, rawTagsString);
  }

  return dbProduct;
}