import { Prisma } from "@/generated/prisma/client";
import { genInflowUniqueSlug } from "@/helpers/genUniqueSlug";
import { InflowProduct } from "../types";
import { 
  syncBrand, 
  syncGroupFeatures, 
  syncGroupTags, 
  syncImages, 
  syncProductFeatures, 
  syncProductTags, 
  syncPurchasingUom, 
  syncSalesUom 
} from "./helpers";
import { syncTeamMember } from "./team-member.sync";
import { syncVendor } from "./vendor.sync";
import { syncCategory } from "./category-sync";

type Tx = Prisma.TransactionClient;

type SyncCache = {
  verifiedTeamMemberIds?: Set<string>;
  verifiedCategoryIds?: Set<string>;
  verifiedVendorIds?: Set<string>;
};

// Helper: Safely cast to Prisma.Decimal or null
const toDecimal = (value: string | number | null | undefined): Prisma.Decimal | null => {
  if (value === null || value === undefined || value === "") return null;
  return new Prisma.Decimal(value);
};

export async function ensureSyncProduct(
  tx: Tx,
  product: InflowProduct,
  groupId?: string,
  caches?: SyncCache
) {
  // Initialize caches if not passed
  const verifiedTeamMembers = caches?.verifiedTeamMemberIds ?? new Set<string>();
  const verifiedCategories = caches?.verifiedCategoryIds ?? new Set<string>();
  const verifiedVendors = caches?.verifiedVendorIds ?? new Set<string>();

  const brandId = await syncBrand(tx, product.customFields?.custom1);

  // 1. Capture target group parameters safely
  const targetGroupId = groupId || product.productVariant?.productGroup?.productGroupId || null;
  
  // 2. Initial attempt to grab categoryId from incoming nested stream
  const categoryId = groupId ? product.productVariant?.productGroup?.categoryId : product.categoryId;

  let validCategoryId: string | null = null;
  if (categoryId) {
    if (verifiedCategories.has(categoryId)) {
      validCategoryId = categoryId;
    } else {
      const localCategory = await tx.category.findUnique({
        where: { inflowId: categoryId },
        select: { inflowId: true }
      });
      
      if (localCategory) {
        validCategoryId = localCategory.inflowId;
        verifiedCategories.add(localCategory.inflowId);
      } else if (product.category) {
        console.warn(
          `[Sync Notification] Category "${categoryId}" missing locally. Syncing JIT...`
        );
        const newCategory = await syncCategory(tx, product.category);
        if (newCategory?.inflowId) {
          validCategoryId = newCategory.inflowId;
          verifiedCategories.add(newCategory.inflowId);
        }
      }
    }
  }

  // 3. 🛡️ SELF-HEALING FOREIGN KEY GUARD: Team Member
  let validLastModifiedById: string | null = null;
  if (product.lastModifiedById) {
    if (verifiedTeamMembers.has(product.lastModifiedById)) {
      validLastModifiedById = product.lastModifiedById;
    } else {
      const localMember = await tx.teamMember.findUnique({
        where: { inflowId: product.lastModifiedById },
        select: { inflowId: true }
      });
      
      if (localMember) {
        validLastModifiedById = localMember.inflowId;
        verifiedTeamMembers.add(localMember.inflowId);
      } else if (product.lastModifiedBy) {
        console.warn(
          `[Sync Notification] TeamMember "${product.lastModifiedById}" missing locally. Syncing JIT...`
        );
        const syncMember = await syncTeamMember(tx, product.lastModifiedBy);
        if (syncMember?.inflowId) {
          validLastModifiedById = syncMember.inflowId;
          verifiedTeamMembers.add(syncMember.inflowId);
        }
      }
    }
  }

  // 4. 🛡️ SELF-HEALING FOREIGN KEY GUARD: Vendor
  let validLastVendorId: string | null = null;
  if (product.lastVendorId) {
    if (verifiedVendors.has(product.lastVendorId)) {
      validLastVendorId = product.lastVendorId;
    } else {
      const localVendor = await tx.vendor.findUnique({
        where: { inflowId: product.lastVendorId },
        select: { inflowId: true }
      });
      
      if (localVendor) {
        validLastVendorId = localVendor.inflowId;
        verifiedVendors.add(localVendor.inflowId);
      } else if (product.lastVendor) {
        try {
          console.log(`[JIT Sync] Vendor "${product.lastVendorId}" missing locally. Syncing...`);
          
          // Pass cache object as the 3rd argument
          const syncVendorResult = await syncVendor(tx, product.lastVendor, {
            verifiedPaymentTermsIds: new Set<string>(),
            verifiedCurrencyIds: new Set<string>(),
            verifiedTaxingSchemeIds: new Set<string>(),
            verifiedTeamMemberIds: verifiedTeamMembers,
            verifiedVendorIds: verifiedVendors,
          });

          if (syncVendorResult?.inflowId) {
            validLastVendorId = syncVendorResult.inflowId;
            verifiedVendors.add(syncVendorResult.inflowId);
          }
        } catch (err) {
          console.error(`[JIT Sync Error] Could not recover Vendor "${product.lastVendorId}":`, err);
        }
      }
    }
  }

  const rawFeaturesString = product?.customFields?.custom2; 
  const rawTagsString = product?.customFields?.custom3;

  const baseSlug = await genInflowUniqueSlug(
    product.name || "product-variant", 
    tx.product, 
    product.productId
  );

  // Payload structure for Upsert
  const productPayload = {
    sku: product.sku,
    name: product.name,
    description: product.description,
    categoryId: validCategoryId,
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
    weight: toDecimal(product.weight),
    width: toDecimal(product.width),
    height: toDecimal(product.height),
    length: toDecimal(product.length),
    originCountry: product.originCountry,
    hsTariffNumber: product.hsTariffNumber,
    remarks: product.remarks,
    lastVendorId: validLastVendorId,
    lastModifiedById: validLastModifiedById,
    lastModifiedDateTime: product.lastModifiedDateTime ? new Date(product.lastModifiedDateTime) : null,
  };

  // 5. Core Product Upsert
  const dbProduct = await tx.product.upsert({
    where: { inflowId: product.productId },
    create: {
      ...productPayload,
      inflowId: product.productId,
      slug: baseSlug,
      createdDttm: product.createdDttm ? new Date(product.createdDttm) : null,
    },
    update: productPayload,
  });

  // Base Helpers Execution
  await syncPurchasingUom(tx, product);
  await syncSalesUom(tx, product);
  
  if (product.images !== undefined) {
    await syncImages(tx, product);
  }

  // 6. Barcodes Sync
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

  // 7. Tax Codes Sync
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

  // 8. Reorder Settings Sync
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
          reorderPoint: toDecimal(rs.reorderPoint) ?? new Prisma.Decimal(0),
          reorderQuantity: toDecimal(rs.reorderQuantity) ?? new Prisma.Decimal(0),
        })),
        skipDuplicates: true,
      });
    }
  }

  // 9. Product Operations Sync
  if (product.productOperations !== undefined) {
    await tx.productOperation.deleteMany({ where: { productId: product.productId } });
    if (product.productOperations?.length) {
      await tx.productOperation.createMany({
        data: product.productOperations.map((po) => ({
          inflowId: po.productOperationId,
          productId: product.productId,
          operationTypeId: po.operationTypeId,
          lineNum: typeof po.lineNum === "string" ? parseInt(po.lineNum, 10) : po.lineNum,
          cost: toDecimal(po.cost) ?? new Prisma.Decimal(0),
          estimatedPerHourCost: toDecimal(po.estimatedPerHourCost) ?? new Prisma.Decimal(0),
          estimatedSeconds: toDecimal(po.estimatedSeconds) ?? new Prisma.Decimal(0),
          instructions: po.instructions,
          trackTime: po.trackTime ?? false,
        })),
        skipDuplicates: true,
      });
    }
  }

  // 10. Product Prices Sync
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
            unitPrice: toDecimal(p.unitPrice),
            fixedMarkup: toDecimal(p.fixedMarkup),
          };
        }),
        skipDuplicates: true,
      });
    }
  }

  // 11. Product Cost (1:1 Relation Sync Setup)
  if (product.cost !== undefined) {
    if (product.cost) {
      await tx.productCost.upsert({
        where: { productId: product.productId },
        create: {
          inflowId: product.cost.productCostId,
          productId: product.productId,
          cost: toDecimal(product.cost.cost) ?? new Prisma.Decimal(0),
        },
        update: {
          inflowId: product.cost.productCostId,
          cost: toDecimal(product.cost.cost) ?? new Prisma.Decimal(0),
        },
      });
    } else {
      await tx.productCost.deleteMany({ where: { productId: product.productId } });
    }
  }

  // 12. Item BOM Components Sync
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
            quantity: toDecimal(rawQuantity) ?? new Prisma.Decimal(0),
          };
        }),
        skipDuplicates: true,
      });
    }
  }

  // 13. Product Attachments Sync
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

  // 14. Metadata / Features / Tags Dynamic Routing
  if (targetGroupId) {
    await syncGroupFeatures(tx, targetGroupId, rawFeaturesString);
    await syncGroupTags(tx, targetGroupId, rawTagsString);
  } else {
    await syncProductFeatures(tx, product.productId, rawFeaturesString);
    await syncProductTags(tx, product.productId, rawTagsString);
  }

  return dbProduct;
}