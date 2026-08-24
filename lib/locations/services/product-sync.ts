import { Prisma, Product, ProductPriceType } from "@/generated/prisma/client";
import { genInflowUniqueSlug } from "@/helpers/genUniqueSlug";
import { InflowCustomFields, InflowProduct } from "@/lib/inflow/types";
import { 
  syncImages, 
  syncPurchasingUom, 
  syncSalesUom, 
  toJsonInput 
} from "@/lib/inflow/services/helpers";
import { reorderMethodSwitcher, productTypeSwitcher } from "@/helpers/product.helper";
import { syncBrand } from "./ensure.service";
import { saveCheckProductImage, saveProductImage } from "@/utils/saveImage";
import { checkIfImageExists } from "@/utils/checkImageExist";

type Tx = Prisma.TransactionClient;

type SyncCache = {
  verifiedTeamMemberIds?: Set<string>;
  verifiedCategoryIds?: Set<string>;
  verifiedVendorIds?: Set<string>;
  verifiedLocationIds?: Set<string>;
  verifiedTaxingSchemes?: Set<string>;
  verifiedTaxCodes?: Set<string>;
  verifiedOperationTypes?: Set<string>;
  verifiedPricingSchemeIds?: Set<string>;
  verifiedProductIds?: Set<string>;
  verifiedBrands?: Map<string, string>;
};

// Helper: Safely cast to Prisma.Decimal or null
const toDecimal = (value: string | number | null | undefined): Prisma.Decimal | null => {
  if (value === null || value === undefined || value === "") return null;
  return new Prisma.Decimal(value);
};

export async function syncProduct(
  tx: Tx,
  product: InflowProduct,
  groupId?: string,
  firstProductInGroup?: InflowProduct,
  hasCoreProductData?: boolean,
  brandCustomName?: string | null,
  caches?: SyncCache,
) {
  // 1. Initialize Runtime Cache
  const verifiedTeamMembers = caches?.verifiedTeamMemberIds ?? new Set<string>();
  const verifiedVendors = caches?.verifiedVendorIds ?? new Set<string>();
  const verifiedLocations = caches?.verifiedLocationIds ?? new Set<string>();
  const verifiedTaxingSchemes = caches?.verifiedTaxingSchemes ?? new Set<string>();
  const verifiedTaxCodes = caches?.verifiedTaxCodes ?? new Set<string>();
  const verifiedOperationTypes = caches?.verifiedOperationTypes ?? new Set<string>();
  const verifiedPricingSchemeIds = caches?.verifiedPricingSchemeIds ?? new Set<string>();
  const verifiedProductIds = caches?.verifiedProductIds ?? new Set<string>();
  const verifiedBrands = caches?.verifiedBrands ?? new Map<string, string>();

  const localProduct = await tx.product.findUnique({
    where: { inflowId: product.productId },
  });

  // 2. Brand Resolution & Verification
  let validBrandId: string | null = null;

  if (brandCustomName) {
    const customKey = brandCustomName.toLowerCase() as keyof InflowCustomFields;
    const rawBrandName =
      firstProductInGroup?.customFields?.[customKey] ||
      product.customFields?.[customKey];
    const cleanBrand = rawBrandName?.trim() || "";

    if (cleanBrand) {
      if (verifiedBrands.has(cleanBrand)) {
        validBrandId = verifiedBrands.get(cleanBrand)!;
      } else {
        const localBrand = await tx.brand.findUnique({
          where: { name: cleanBrand },
          select: { id: true, name: true },
        });

        if (localBrand) {
          validBrandId = localBrand.id;
          verifiedBrands.set(cleanBrand, localBrand.id);
          verifiedBrands.set(localBrand.name, localBrand.id);
        } else {
          console.warn(`[Sync Notification] Brand "${cleanBrand}" missing locally. Syncing JIT...`);
          const brand = await syncBrand(tx, cleanBrand);

          if (brand) {
            validBrandId = brand.id;
            verifiedBrands.set(cleanBrand, brand.id);
            verifiedBrands.set(brand.name, brand.id);
          }
        }
      }
    }
  }

  // 3. Image Preparation & Local Asset Conversion
  if (product.image && product.image.startsWith("data:image")) {
    const publicImagePath = await saveCheckProductImage(
      product.productId,
      product.name || "unnamed",
      product.image
    );

    if (publicImagePath) {
      product.images = [
        {
          imageId: crypto.randomUUID().toLowerCase(),
          originalUrl: publicImagePath,
          largeUrl: null,
          mediumUncroppedUrl: null,
          mediumUrl: null,
          smallUrl: null,
          thumbUrl: null,
        },
      ];
    } else {
      product.images = [];
    }
  } else {
    product.images = [];
  }

  // 4. Core Product Upsert logic
  let validProductData: Product | null = null;

  if (hasCoreProductData) {
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
    const baseSlug = await genInflowUniqueSlug(
      product.name || "product-variant", 
      tx.product, 
      product.productId
    );
=======
    const slugToUse = localProduct?.slug 
      ? localProduct.slug 
      : await genInflowUniqueSlug(
=======
    // const slugToUse = localProduct?.slug 
    //   ? localProduct.slug 
    //   : await genInflowUniqueSlug(
    //       product.name || "product-variant", 
    //       tx.product, 
    //       product.productId
    //     );

    const slugToUse = await genInflowUniqueSlug(
>>>>>>> 9b0281acf4667ec0825b359671271742fc0f346e
          product.name || "product-variant", 
          tx.product, 
          product.productId
        );
>>>>>>> 5b8a697f694ad91ac1815e935520b5c9374ef5c2
=======
    const slugToUse = await genInflowUniqueSlug(
      product.name || "product-variant",
      tx.product,
      product.productId
    );
>>>>>>> 2acdfa7c1786e3351748a7afe532c00b424a4948

    const productPayload = {
      sku: product.sku,
      name: product.name,
      description: product.description,
      categoryId: product.categoryId,
      brandId: validBrandId,
      itemType: productTypeSwitcher(product.itemType),
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
      lastVendorId: product.lastVendorId,
      lastModifiedById: product.lastModifiedById,
      customFields: toJsonInput(product.customFields),
    };

    validProductData = await tx.product.upsert({
      where: { inflowId: product.productId },
      create: {
        ...productPayload,
        inflowId: product.productId,
        slug: slugToUse,
      },
      update: productPayload,
    });
  } else {
    validProductData = localProduct;
  }

  if (!validProductData) return null;

  // 5. UOM & Image Syncing Helpers
  if (product.purchasingUom?.name) {
    await syncPurchasingUom(tx, product);
  }

  if (product.salesUom?.name) {
    await syncSalesUom(tx, product);
  }

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

  // 7. Product Tax Codes Sync (Batched verification)
  if (product.taxCodes !== undefined) {
    await tx.productTaxCode.deleteMany({ where: { productId: product.productId } });

    if (product.taxCodes?.length) {
      const missingSchemeIds = product.taxCodes
        .map((tc) => tc.taxingSchemeId)
        .filter((id): id is string => Boolean(id) && !verifiedTaxingSchemes.has(id));

      if (missingSchemeIds.length) {
        const foundSchemes = await tx.taxingScheme.findMany({
          where: { inflowId: { in: missingSchemeIds } },
          select: { inflowId: true },
        });
        foundSchemes.forEach((s) => verifiedTaxingSchemes.add(s.inflowId));
      }

      const missingCodeIds = product.taxCodes
        .map((tc) => tc.taxCodeId)
        .filter((id): id is string => Boolean(id) && !verifiedTaxCodes.has(id));

      if (missingCodeIds.length) {
        const foundCodes = await tx.taxCode.findMany({
          where: { inflowId: { in: missingCodeIds } },
          select: { inflowId: true },
        });
        foundCodes.forEach((c) => verifiedTaxCodes.add(c.inflowId));
      }

      const validTaxCodesToCreate = product.taxCodes
        .filter(
          (tc) =>
            tc.productTaxCodeId &&
            tc.taxingSchemeId &&
            verifiedTaxingSchemes.has(tc.taxingSchemeId) &&
            tc.taxCodeId &&
            verifiedTaxCodes.has(tc.taxCodeId)
        )
        .map((tc) => ({
          productTaxCodeId: tc.productTaxCodeId!,
          inflowId: tc.productTaxCodeId!,
          productId: product.productId,
          taxCodeId: tc.taxCodeId!,
          taxingSchemeId: tc.taxingSchemeId!,
        }));

      if (validTaxCodesToCreate.length) {
        await tx.productTaxCode.createMany({
          data: validTaxCodesToCreate,
          skipDuplicates: true,
        });
      }
    }
  }

  // 8. Reorder Settings Sync
  if (product.reorderSettings !== undefined) {
    await tx.reorderSetting.deleteMany({ where: { productId: product.productId } });

    if (product.reorderSettings?.length) {
      const validReorderSettingsToCreate = [];

      for (const rs of product.reorderSettings) {
        if (!rs.reorderSettingsId) continue;

        let validLocationId: string | null = null;
        if (rs.locationId) {
          if (verifiedLocations.has(rs.locationId)) {
            validLocationId = rs.locationId;
          } else {
            const localLoc = await tx.location.findUnique({
              where: { inflowId: rs.locationId },
              select: { inflowId: true },
            });
            if (localLoc) {
              validLocationId = localLoc.inflowId;
              verifiedLocations.add(localLoc.inflowId);
            }
          }
        }

        let validFromLocationId: string | null = null;
        if (rs.fromLocationId) {
          if (verifiedLocations.has(rs.fromLocationId)) {
            validFromLocationId = rs.fromLocationId;
          } else {
            const localFromLoc = await tx.location.findUnique({
              where: { inflowId: rs.fromLocationId },
              select: { inflowId: true },
            });
            if (localFromLoc) {
              validFromLocationId = localFromLoc.inflowId;
              verifiedLocations.add(localFromLoc.inflowId);
            }
          }
        }

        let validVendorId: string | null = null;
        if (rs.vendorId) {
          if (verifiedVendors.has(rs.vendorId)) {
            validVendorId = rs.vendorId;
          } else {
            const localVendor = await tx.vendor.findUnique({
              where: { inflowId: rs.vendorId },
              select: { inflowId: true },
            });
            if (localVendor) {
              validVendorId = localVendor.inflowId;
              verifiedVendors.add(localVendor.inflowId);
            }
          }
        }

        if (!validLocationId) {
          console.warn(
            `[Sync Notification] Skipping reorder setting "${rs.reorderSettingsId}" due to unresolved locationId.`
          );
          continue;
        }

        validReorderSettingsToCreate.push({
          inflowId: rs.reorderSettingsId,
          productId: product.productId,
          locationId: validLocationId,
          fromLocationId: validFromLocationId,
          vendorId: validVendorId,
          defaultSublocation: rs.defaultSublocation,
          enableReordering: rs.enableReordering ?? true,
          reorderMethod: reorderMethodSwitcher(rs.reorderMethod),
          reorderPoint: toDecimal(rs.reorderPoint) ?? new Prisma.Decimal(0),
          reorderQuantity: toDecimal(rs.reorderQuantity) ?? new Prisma.Decimal(0),
        });
      }

      if (validReorderSettingsToCreate.length) {
        await tx.reorderSetting.createMany({
          data: validReorderSettingsToCreate,
          skipDuplicates: true,
        });
      }
    }
  }

  // 9. Product Operations Sync
  if (product.productOperations !== undefined) {
    await tx.productOperation.deleteMany({ where: { productId: product.productId } });

    if (product.productOperations?.length) {
      const validOperationsToCreate = [];

      for (const po of product.productOperations) {
        if (!po.productOperationId) continue;

        let validOperationTypeId: string | null = null;
        if (po.operationTypeId) {
          if (verifiedOperationTypes.has(po.operationTypeId)) {
            validOperationTypeId = po.operationTypeId;
          } else {
            const localOperationType = await tx.operationType.findUnique({
              where: { inflowId: po.operationTypeId },
              select: { inflowId: true },
            });
            if (localOperationType) {
              validOperationTypeId = localOperationType.inflowId;
              verifiedOperationTypes.add(localOperationType.inflowId);
            }
          }
        }

        if (!validOperationTypeId) {
          console.warn(
            `[Sync Notification] Skipping operation item "${po.productOperationId}" due to unresolved operationTypeId.`
          );
          continue;
        }

        validOperationsToCreate.push({
          inflowId: po.productOperationId,
          productId: product.productId,
          operationTypeId: validOperationTypeId,
          lineNum: typeof po.lineNum === "string" ? parseInt(po.lineNum, 10) : po.lineNum ?? 1,
          cost: toDecimal(po.cost) ?? new Prisma.Decimal(0),
          estimatedPerHourCost: toDecimal(po.estimatedPerHourCost) ?? new Prisma.Decimal(0),
          estimatedSeconds: toDecimal(po.estimatedSeconds) ?? new Prisma.Decimal(0),
          instructions: po.instructions || null,
          trackTime: po.trackTime ?? false,
        });
      }

      if (validOperationsToCreate.length) {
        await tx.productOperation.createMany({
          data: validOperationsToCreate,
          skipDuplicates: true,
        });
      }
    }
  }

  // 10. Product Prices Sync
  if (product.prices !== undefined) {
    await tx.productPrice.deleteMany({ where: { productId: product.productId } });

    if (product.prices?.length) {
      const validPricesToCreate = [];

      for (const p of product.prices) {
        if (!p.productPriceId) continue;

        let validPricingSchemeId: string | null = null;
        if (p.pricingSchemeId) {
          if (verifiedPricingSchemeIds.has(p.pricingSchemeId)) {
            validPricingSchemeId = p.pricingSchemeId;
          } else {
            const localScheme = await tx.pricingScheme.findUnique({
              where: { inflowId: p.pricingSchemeId },
              select: { inflowId: true },
            });
            if (localScheme) {
              validPricingSchemeId = localScheme.inflowId;
              verifiedPricingSchemeIds.add(localScheme.inflowId);
            }
          }
        }

        if (!validPricingSchemeId) {
          // console.warn(
          //   `[Sync Notification] Skipping price item "${p.productPriceId}" due to unresolved pricingSchemeId.`
          // );
          continue;
        }

        const normalizedPriceType = p.priceType?.toLowerCase().includes("markup")
          ? "FixedMarkup"
          : "FixedPrice";

        validPricesToCreate.push({
          inflowId: p.productPriceId,
          pricingSchemeId: validPricingSchemeId,
          productId: product.productId,
          priceType: normalizedPriceType as ProductPriceType,
          unitPrice: toDecimal(p.unitPrice),
          fixedMarkup: toDecimal(p.fixedMarkup),
        });
      }

      if (validPricesToCreate.length) {
        await tx.productPrice.createMany({
          data: validPricesToCreate,
          skipDuplicates: true,
        });
      }
    }
  }

  // 11. Product Cost (1:1 Relation Sync)
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

  // 12. Product BOM Sync
  if (product.itemBoms !== undefined) {
    await tx.productBom.deleteMany({ where: { productId: product.productId } });

    if (product.itemBoms?.length) {
      const candidateChildIds = [
        ...new Set(
          product.itemBoms
            .map((b) => b.childProductId)
            .filter((id): id is string => Boolean(id) && !verifiedProductIds.has(id))
        ),
      ];

      if (candidateChildIds.length) {
        const existingProducts = await tx.product.findMany({
          where: { inflowId: { in: candidateChildIds } },
          select: { inflowId: true },
        });

        existingProducts.forEach((p) => verifiedProductIds.add(p.inflowId));
      }

      const validBomsToCreate = product.itemBoms
        .filter((bom) => bom.itemBomId && bom.childProductId && verifiedProductIds.has(bom.childProductId))
        .map((bom) => ({
          inflowId: bom.itemBomId!,
          productId: product.productId,
          childProductId: bom.childProductId!,
          standardQuantity: bom.quantity?.standardQuantity ?? "0",
          uomQuantity: bom.quantity?.uomQuantity ?? "0",
          uom: bom.quantity?.uom ?? null,
          serialNumbers: bom.quantity?.serialNumbers ?? [],
          ...(bom.timestamp && { timestamp: new Date(bom.timestamp) }),
        }));

      if (validBomsToCreate.length) {
        await tx.productBom.createMany({
          data: validBomsToCreate,
          skipDuplicates: true,
        });
      }
    }
  }

  // 13. Product Attachments Sync (Batched team member verification)
  if (product.attachments !== undefined) {
    await tx.productAttachment.deleteMany({ where: { productId: product.productId } });

    if (product.attachments?.length) {
      const missingMemberIds = product.attachments
        .map((att) => att.lastModifiedById)
        .filter((id): id is string => Boolean(id) && !verifiedTeamMembers.has(id));

      if (missingMemberIds.length) {
        const foundMembers = await tx.teamMember.findMany({
          where: { inflowId: { in: missingMemberIds } },
          select: { inflowId: true },
        });
        foundMembers.forEach((m) => verifiedTeamMembers.add(m.inflowId));
      }

      const validAttachmentsToCreate = product.attachments
        .filter((att) => att.attachmentId)
        .map((att) => ({
          inflowId: att.attachmentId!,
          productId: product.productId,
          attachmentUrl: att.attachmentUrl,
          fileName: att.fileName,
          lastModifiedById:
            att.lastModifiedById && verifiedTeamMembers.has(att.lastModifiedById)
              ? att.lastModifiedById
              : null,
        }));

      if (validAttachmentsToCreate.length) {
        await tx.productAttachment.createMany({
          data: validAttachmentsToCreate,
          skipDuplicates: true,
        });
      }
    }
  }

  return validProductData;
}