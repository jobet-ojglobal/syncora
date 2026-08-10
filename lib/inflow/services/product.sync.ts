import { Prisma, Product, ProductPriceType, ProductType } from "@/generated/prisma/client";
import { genInflowUniqueSlug } from "@/helpers/genUniqueSlug";
import { InflowCustomFields, InflowLocation, InflowProduct } from "../types";
import { 
  syncBrand, 
  syncGroupFeatures, 
  syncGroupTags, 
  syncImages, 
  syncProductFeatures, 
  syncProductTags, 
  syncPurchasingUom, 
  syncSalesUom, 
  toJsonInput
} from "./helpers";
import { syncTeamMember } from "./team-member.sync";
import { syncVendor } from "./vendor.sync";
import { ensureCategoryShell, ensureLocationShell, ensureOperationTypeShell, ensurePricingSchemeShell, ensureProductShell, ensureTaxCodeShell, ensureTaxingSchemeShell, ensureVendorShell } from "./ensure.service";
import { productTypeSwitcher, reorderMethodSwitcher } from "@/helpers/product.helper";

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
  caches?: SyncCache
) {
  // Initialize caches if not passed
  const verifiedTeamMembers = caches?.verifiedTeamMemberIds ?? new Set<string>();
  const verifiedCategories = caches?.verifiedCategoryIds ?? new Set<string>();
  const verifiedVendors = caches?.verifiedVendorIds ?? new Set<string>();
  const verifiedLocations = caches?.verifiedLocationIds ?? new Set<string>();
  const verifiedTaxingSchemes = caches?.verifiedTaxingSchemes ?? new Set<string>();
  const verifiedTaxCodes = caches?.verifiedTaxCodes ?? new Set<string>();
  const verifiedOperationTypes = caches?.verifiedOperationTypes ?? new Set<string>();
  const verifiedPricingSchemeIds = caches?.verifiedPricingSchemeIds ?? new Set<string>();
  const verifiedProductIds = caches?.verifiedProductIds ?? new Set<string>();

  
  const rawFeaturesString = firstProductInGroup?.customFields?.custom2 || product.customFields?.custom2;
  const rawTagsString = firstProductInGroup?.customFields?.custom3  || product.customFields?.custom3;

  const localProduct = await tx.product.findUnique({
    where: { inflowId: product.productId }
  });

  // for initial sync only : NOT UPSERT PRODUCT DATA
  if(localProduct) {
    verifiedProductIds?.add(localProduct.inflowId);
    return localProduct;
  }

  let brandId: string | null = null;

  if (brandCustomName) {
    // Normalize key name (e.g., "Custom1" -> "custom1")
    const customKey = brandCustomName.toLowerCase() as keyof InflowCustomFields;

    const brandName =
      firstProductInGroup?.customFields?.[customKey] ||
      product.customFields?.[customKey];

    if (brandName) {
      brandId = await syncBrand(tx, brandName);
    }
  }

  let validCategoryId: string | null = null;
  if (product.categoryId) {
    if (verifiedCategories.has(product.categoryId)) {
      validCategoryId = product.categoryId;
    } else {
      const localCategory = await tx.category.findUnique({
        where: { inflowId: product.categoryId },
        select: { inflowId: true }
      });
      
      if (localCategory) {
        validCategoryId = localCategory.inflowId;
        verifiedCategories.add(localCategory.inflowId);
      } else if (product.category) {
        console.warn(
          `[Sync Notification] Category "${product.categoryId}" missing locally. Syncing JIT...`
        );
        const newCategory = await ensureCategoryShell(tx, product.category);
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
  

  // const localProduct = await tx.product.findUnique({
  //   where: { inflowId: product.productId }
  // });

  let validProductData: Product | null = null;

  if (hasCoreProductData) {
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
      lastVendorId: validLastVendorId,
      lastModifiedById: validLastModifiedById,
      customFields: toJsonInput(product.customFields)
    };

     // 5. Core Product Upsert
    const dbProduct = await tx.product.upsert({
      where: { inflowId: product.productId },
      create: {
        ...productPayload,
        inflowId: product.productId,
        slug: baseSlug,
      },
      update: productPayload,
    });

    validProductData = dbProduct
  } else {
    validProductData = localProduct
  }

  if(!validProductData) return null;

  // Base Helpers Execution
  if(product.purchasingUom?.name !== "") {
    await syncPurchasingUom(tx, product);
  }

  if(product.salesUom?.name !== "") {
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

  // Product Tax Codes Sync with Foreign Key Shell Guarantees
  if (product.taxCodes !== undefined) {
    await tx.productTaxCode.deleteMany({
      where: { productId: product.productId },
    });

    if (product.taxCodes?.length) {
      const validTaxCodesToCreate = [];

      for (const tc of product.taxCodes) {
        if (!tc.productTaxCodeId) continue;

        let validTaxingSchemeId: string | null = null;

        if (tc.taxingSchemeId) {
          // 1. Check in-memory cache first
          if (verifiedTaxingSchemes.has(tc.taxingSchemeId)) {
            validTaxingSchemeId = tc.taxingSchemeId;
          } else {
            // 2. Query database for existence
            const localScheme = await tx.taxingScheme.findUnique({
              where: { inflowId: tc.taxingSchemeId },
              select: { inflowId: true },
            });

            if (localScheme) {
              validTaxingSchemeId = localScheme.inflowId;
              verifiedTaxingSchemes.add(localScheme.inflowId);
            } else if (tc.taxingScheme) {
              // 3. JIT Shell Creation / Sync
              console.warn(
                `[Sync Notification] TaxingScheme "${tc.taxingSchemeId}" missing locally. Syncing JIT...`
              );
              const syncedScheme = await ensureTaxingSchemeShell(
                tx,
                tc.taxingScheme
              );
              if (syncedScheme?.inflowId) {
                validTaxingSchemeId = syncedScheme.inflowId;
                verifiedTaxingSchemes.add(syncedScheme.inflowId);
              }
            }
          }
        }


        let validTaxCodeId: string | null = null;
        if (tc.taxCodeId) {
          // 1. Check in-memory cache first
          if (verifiedTaxCodes.has(tc.taxCodeId)) {
            validTaxCodeId = tc.taxCodeId;
          } else {
            // 2. Query database for existence
            const localScheme = await tx.taxCode.findUnique({
              where: { inflowId: tc.taxCodeId },
              select: { inflowId: true },
            });

            if (localScheme) {
              validTaxCodeId = localScheme.inflowId;
              verifiedTaxCodes.add(localScheme.inflowId);
            } else if (tc.taxCode) {
              // 3. JIT Shell Creation / Sync
              console.warn(
                `[Sync Notification] TaxingCode "${tc.taxCodeId}" missing locally. Syncing JIT...`
              );
              const syncedTaxCode = await ensureTaxCodeShell(
                tx,
                tc.taxCode
              );
              if (syncedTaxCode?.inflowId) {
                validTaxCodeId = syncedTaxCode.inflowId;
                verifiedTaxCodes.add(syncedTaxCode.inflowId);
              }
            }
          }
        }

        if (!validTaxingSchemeId || !validTaxCodeId) {
          console.warn(
            `[Sync Notification] Skipping taxcode item "${tc.productTaxCodeId}" because taxingSchemeId and taxCodeId could not be resolved.`
          );
          continue;
        }

        validTaxCodesToCreate.push({
          productTaxCodeId: tc.productTaxCodeId,
          inflowId: tc.productTaxCodeId,
          productId: product.productId,
          taxCodeId: validTaxCodeId,
          taxingSchemeId: validTaxingSchemeId,
        });
      }

      if (validTaxCodesToCreate.length > 0) {
        await tx.productTaxCode.createMany({
          data: validTaxCodesToCreate,
          skipDuplicates: true,
        });
      }
    }
  }

  // 7. Tax Codes Sync
  // if (product.taxCodes !== undefined) {
  //   await tx.productTaxCode.deleteMany({ where: { productId: product.productId } });
  //   if (product.taxCodes?.length) {
  //     await tx.productTaxCode.createMany({
  //       data: product.taxCodes.map((tc) => ({
  //         productTaxCodeId: tc.productTaxCodeId,
  //         productId: product.productId,
  //         taxCodeId: tc.taxCodeId,
  //         taxingSchemeId: tc.taxingSchemeId,
  //       })),
  //       skipDuplicates: true,
  //     });
  //   }
  // }

  // 8. Reorder Settings Sync with Foreign Key Shell Guarantees
  if (product.reorderSettings !== undefined) {
    await tx.reorderSetting.deleteMany({ where: { productId: product.productId } });

    if (product.reorderSettings?.length) {
      const validReorderSettingsToCreate = [];

      for (const rs of product.reorderSettings) {
        if (!rs.reorderSettingsId) continue;

        // --- Location Validation & Self-Healing ---
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
            } else if (rs.location) {
              console.warn(
                `[Sync Notification] Target Location "${rs.locationId}" missing locally. Creating Location Shell JIT...`
              );
              const syncedLoc = await ensureLocationShell(tx, rs.location);
              if (syncedLoc?.inflowId) {
                validLocationId = syncedLoc.inflowId;
                verifiedLocations.add(syncedLoc.inflowId);
              }
            }
          }
        }

        // --- Source / FromLocation Validation & Self-Healing ---
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
            } else if (rs.fromLocation) {
              console.warn(
                `[Sync Notification] FromLocation "${rs.fromLocationId}" missing locally. Creating Location Shell JIT...`
              );
              const syncedFromLoc = await ensureLocationShell(tx, rs.fromLocation);
              if (syncedFromLoc?.inflowId) {
                validFromLocationId = syncedFromLoc.inflowId;
                verifiedLocations.add(syncedFromLoc.inflowId);
              }
            }
          }
        }

        // --- Vendor Validation & Self-Healing ---
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
            } else if (rs.vendor) {
              console.warn(
                `[Sync Notification] Reorder Vendor "${rs.vendorId}" missing locally. Syncing Vendor JIT...`
              );
              const syncVendorResult = await ensureVendorShell(tx, rs.vendor);
              if (syncVendorResult?.inflowId) {
                validVendorId = syncVendorResult.inflowId;
                verifiedVendors.add(syncVendorResult.inflowId);
              }
            }
          }
        }

        if (!validLocationId) {
          console.warn(
            `[Sync Notification] Skipping reorder settings item "${rs.reorderSettingsId}" because locationId could not be resolved.`
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

      if (validReorderSettingsToCreate.length > 0) {
        await tx.reorderSetting.createMany({
          data: validReorderSettingsToCreate,
          skipDuplicates: true,
        });
      }
    }
  }

  // 9. Product Operations Sync
  // Product Operations Sync with Foreign Key Shell Guarantees
  if (product.productOperations !== undefined) {
    await tx.productOperation.deleteMany({
      where: { productId: product.productId },
    });

    if (product.productOperations?.length) {
      const validOperationsToCreate = [];

      for (const po of product.productOperations) {
        if (!po.productOperationId) continue;

        let validOperationTypeId: string | null = null;

        if (po.operationTypeId) {
          // 1. Check runtime cache first
          if (verifiedOperationTypes.has(po.operationTypeId)) {
            validOperationTypeId = po.operationTypeId;
          } else {
            // 2. Query database for existence
            const localOperationType = await tx.operationType.findUnique({
              where: { inflowId: po.operationTypeId },
              select: { inflowId: true },
            });

            if (localOperationType) {
              validOperationTypeId = localOperationType.inflowId;
              verifiedOperationTypes.add(localOperationType.inflowId);
            } else if (po.operationType) {
              // 3. JIT Shell Creation / Sync fallback
              console.warn(
                `[Sync Notification] OperationType "${po.operationTypeId}" missing locally. Syncing JIT...`
              );
              const syncedOperationType = await ensureOperationTypeShell(
                tx,
                po.operationType
              );
              if (syncedOperationType?.inflowId) {
                validOperationTypeId = syncedOperationType.inflowId;
                verifiedOperationTypes.add(syncedOperationType.inflowId);
              }
            }
          }
        }

        if (!validOperationTypeId) {
          console.warn(
            `[Sync Notification] Skipping operation type item "${po.productOperationId}" because operationTypeId could not be resolved.`
          );
          continue;
        }

        validOperationsToCreate.push({
          inflowId: po.productOperationId,
          productId: product.productId,
          operationTypeId: validOperationTypeId,
          lineNum:
            typeof po.lineNum === "string"
              ? parseInt(po.lineNum, 10)
              : po.lineNum ?? 1,
          cost: toDecimal(po.cost) ?? new Prisma.Decimal(0),
          estimatedPerHourCost:
            toDecimal(po.estimatedPerHourCost) ?? new Prisma.Decimal(0),
          estimatedSeconds:
            toDecimal(po.estimatedSeconds) ?? new Prisma.Decimal(0),
          instructions: po.instructions || null,
          trackTime: po.trackTime ?? false,
        });
        
      }

      if (validOperationsToCreate.length > 0) {
        await tx.productOperation.createMany({
          data: validOperationsToCreate,
          skipDuplicates: true,
        });
      }
    }
  }
  // if (product.productOperations !== undefined) {
  //   await tx.productOperation.deleteMany({ where: { productId: product.productId } });
  //   if (product.productOperations?.length) {
  //     await tx.productOperation.createMany({
  //       data: product.productOperations.map((po) => ({
  //         inflowId: po.productOperationId,
  //         productId: product.productId,
  //         operationTypeId: po.operationTypeId,
  //         lineNum: typeof po.lineNum === "string" ? parseInt(po.lineNum, 10) : po.lineNum,
  //         cost: toDecimal(po.cost) ?? new Prisma.Decimal(0),
  //         estimatedPerHourCost: toDecimal(po.estimatedPerHourCost) ?? new Prisma.Decimal(0),
  //         estimatedSeconds: toDecimal(po.estimatedSeconds) ?? new Prisma.Decimal(0),
  //         instructions: po.instructions,
  //         trackTime: po.trackTime ?? false,
  //       })),
  //       skipDuplicates: true,
  //     });
  //   }
  // }

  // 10. Product Prices Sync
  // if (product.prices !== undefined) {
  //   await tx.productPrice.deleteMany({ where: { productId: product.productId } });
  //   if (product.prices?.length) {
  //     await tx.productPrice.createMany({
  //       data: product.prices.map((p) => {
  //         let normalizedPriceType = "fixedPrice";
  //         const incomingType = p.priceType?.toLowerCase() || "";
  //         if (incomingType.includes("markup")) normalizedPriceType = "markup";
  //         if (incomingType.includes("margin")) normalizedPriceType = "margin";

  //         return {
  //           inflowId: p.productPriceId,
  //           pricingSchemeId: p.pricingSchemeId,
  //           productId: product.productId,
  //           priceType: normalizedPriceType as any,
  //           unitPrice: toDecimal(p.unitPrice),
  //           fixedMarkup: toDecimal(p.fixedMarkup),
  //         };
  //       }),
  //       skipDuplicates: true,
  //     });
  //   }
  // }

  // Product Prices Sync with Foreign Key Shell Guarantees
  if (product.prices !== undefined) {
    await tx.productPrice.deleteMany({
      where: { productId: product.productId },
    });

    if (product.prices?.length) {
      const validPricesToCreate = [];

      for (const p of product.prices) {
        if (!p.productPriceId) continue;

        let validPricingSchemeId: string | null = null;

        if (p.pricingSchemeId) {
          // 1. Check in-memory cache first
          if (verifiedPricingSchemeIds?.has(p.pricingSchemeId)) {
            validPricingSchemeId = p.pricingSchemeId;
          } else {
            // 2. Query database for local existence
            const localScheme = await tx.pricingScheme.findUnique({
              where: { inflowId: p.pricingSchemeId },
              select: { inflowId: true },
            });

            if (localScheme) {
              validPricingSchemeId = localScheme.inflowId;
              verifiedPricingSchemeIds?.add(localScheme.inflowId);
            } else if (p.pricingScheme) {
              // 3. JIT Shell Creation / Fallback Sync
              console.warn(
                `[Sync Notification] PricingScheme "${p.pricingSchemeId}" missing locally. Syncing JIT...`
              );
              const syncedScheme = await ensurePricingSchemeShell(
                tx,
                p.pricingScheme
              );
              if (syncedScheme?.inflowId) {
                validPricingSchemeId = syncedScheme.inflowId;
                verifiedPricingSchemeIds?.add(syncedScheme.inflowId);
              }
            }
          }
        }

        if (!validPricingSchemeId) {
          console.warn(
            `[Sync Notification] Skipping prices item "${p.productPriceId}" because pricingSchemeId could not be resolved.`
          );
          continue;
        }

        // Normalize priceType enum values
        let normalizedPriceType = "FixedPrice";
        const incomingType = p.priceType?.toLowerCase() || "";
        if (incomingType.includes("markup")) normalizedPriceType = "FixedMarkup";

        validPricesToCreate.push({
          inflowId: p.productPriceId,
          pricingSchemeId: validPricingSchemeId,
          productId: product.productId,
          priceType: normalizedPriceType as ProductPriceType,
          unitPrice: toDecimal(p.unitPrice),
          fixedMarkup: toDecimal(p.fixedMarkup),
        });
      }

      if (validPricesToCreate.length > 0) {
        await tx.productPrice.createMany({
          data: validPricesToCreate,
          skipDuplicates: true,
        });
      }
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
  // if (product.itemBoms !== undefined) {
  //   await tx.productBom.deleteMany({ where: { productId: product.productId } });
  //   if (product.itemBoms?.length) {
  //     await tx.productBom.createMany({
  //       data: product.itemBoms.map((bom) => {
  //         const rawQuantity = typeof bom.quantity === "object" 
  //           ? bom.quantity?.standardQuantity 
  //           : bom.quantity;

  //         return {
  //           inflowId: bom.itemBomId,
  //           productId: product.productId,
  //           childProductId: bom.childProductId,
  //           quantity: toDecimal(rawQuantity) ?? new Prisma.Decimal(0),
  //         };
  //       }),
  //       skipDuplicates: true,
  //     });
  //   }
  // }

  // Product BOM (Bill of Materials) Sync with Foreign Key Shell Guarantees
  if (product.itemBoms !== undefined) {
    // 1. Clear existing BOM records for the product
    await tx.productBom.deleteMany({
      where: { productId: product.productId },
    });

    if (product.itemBoms?.length) {
      // Collect all unique child product IDs that aren't already verified in cache
      const candidateChildIds = [
        ...new Set(
          product.itemBoms
            .map((b) => b.childProductId)
            .filter((id): id is string => Boolean(id) && !verifiedProductIds?.has(id))
        ),
      ];

      // 2. Batch query local database for unverified candidates
      if (candidateChildIds.length > 0) {
        const existingProducts = await tx.product.findMany({
          where: { inflowId: { in: candidateChildIds } },
          select: { inflowId: true },
        });

        for (const p of existingProducts) {
          verifiedProductIds?.add(p.inflowId);
        }
      }

      // 3. Batch process JIT shell creation for remaining missing products
      const unverifiedChildIds = candidateChildIds.filter(
        (id) => !verifiedProductIds?.has(id)
      );

      if (unverifiedChildIds.length > 0) {
        // Find payload items corresponding to missing IDs that carry child product data
        const bomsToSync = product.itemBoms.filter(
          (b) => b.childProductId && unverifiedChildIds.includes(b.childProductId) && b.childProduct
        );

        // Resolve JIT shells in parallel
        await Promise.all(
          bomsToSync.map(async (bom) => {
            if (!bom.childProduct) return;
            console.warn(
              `[Sync Notification] Child Product "${bom.childProductId}" missing locally. Syncing JIT...`
            );
            const synced = await ensureProductShell(tx, bom.childProduct);
            if (synced?.inflowId) {
              verifiedProductIds?.add(synced.inflowId);
            }
          })
        );
      }

      // 4. Map valid BOM payload items to schema structure
      const validBomsToCreate = product.itemBoms
        .filter((bom) => {
          if (!bom.itemBomId || !bom.childProductId) return false;
          
          const isVerified = verifiedProductIds?.has(bom.childProductId);
          if (!isVerified) {
            console.warn(
              `[Sync Warning] Skipping BOM component "${bom.itemBomId}" due to unresolvable childProductId "${bom.childProductId}".`
            );
          }
          return isVerified;
        })
        .map((bom) => ({
          inflowId: bom.itemBomId,
          productId: product.productId,
          childProductId: bom.childProductId,
          
          // Map quantity data from payload
          standardQuantity: bom.quantity?.standardQuantity ?? "0",
          uomQuantity: bom.quantity?.uomQuantity ?? "0",
          uom: bom.quantity?.uom ?? null,
          serialNumbers: bom.quantity?.serialNumbers ?? [],
          
          ...(bom.timestamp && { timestamp: new Date(bom.timestamp) }),
        }));

      // 5. Bulk insert resolved BOM entries
      if (validBomsToCreate.length > 0) {
        await tx.productBom.createMany({
          data: validBomsToCreate,
          skipDuplicates: true,
        });
      }
    }
  }

  // 13. Product Attachments Sync
  // if (product.attachments !== undefined) {
  //   await tx.productAttachment.deleteMany({ where: { productId: product.productId } });
  //   if (product.attachments?.length) {
  //     await tx.productAttachment.createMany({
  //       data: product.attachments.map((att) => ({
  //         inflowId: att.attachmentId,
  //         productId: product.productId,
  //         attachmentUrl: att.attachmentUrl,
  //         fileName: att.fileName,
  //         lastModifiedById: att.lastModifiedById,
  //       })),
  //       skipDuplicates: true,
  //     });
  //   }
  // }

  if (product.attachments !== undefined) {
    // 1. Clear existing relations for full re-sync
    await tx.productAttachment.deleteMany({
      where: { productId: product.productId },
    });

    if (product.attachments?.length) {
      const validAttachmentsToCreate = [];

      for (const att of product.attachments) {
        // Ensure primary key / foreign identity exists
        if (!att.attachmentId) continue;

        let validLastModifiedById: string | null = null;

        if (att.lastModifiedById) {
          // 1. Check in-memory runtime cache first
          if (verifiedTeamMembers.has(att.lastModifiedById)) {
            validLastModifiedById = att.lastModifiedById;
          } else {
            // 2. Query local database for existence
            const localMember = await tx.teamMember.findUnique({
              where: { inflowId: att.lastModifiedById },
              select: { inflowId: true },
            });

            if (localMember) {
              validLastModifiedById = localMember.inflowId;
              verifiedTeamMembers.add(localMember.inflowId);
            } else if (att.lastModifiedBy) {
              // 3. JIT Full Sync if full object is attached
              console.warn(
                `[Sync Notification] TeamMember "${att.lastModifiedById}" missing locally. Syncing JIT...`
              );
              const syncMember = await syncTeamMember(tx, att.lastModifiedBy);
              if (syncMember?.inflowId) {
                validLastModifiedById = syncMember.inflowId;
                verifiedTeamMembers.add(syncMember.inflowId);
              }
            } 
          }
        }

        validAttachmentsToCreate.push({
          inflowId: att.attachmentId,
          productId: product.productId,
          attachmentUrl: att.attachmentUrl,
          fileName: att.fileName,
          lastModifiedById: validLastModifiedById,
        });
      }

      if (validAttachmentsToCreate.length > 0) {
        await tx.productAttachment.createMany({
          data: validAttachmentsToCreate,
          skipDuplicates: true,
        });
      }
    }
  }


  



  // 14. Metadata / Features / Tags Dynamic Routing
  if (groupId) {
    if (rawFeaturesString) {
      await syncGroupFeatures(tx, groupId, rawFeaturesString);
    }
    if (rawTagsString) {
      await syncGroupTags(tx, groupId, rawTagsString);
    }
  } else {
    if (rawFeaturesString) {
      await syncProductFeatures(tx, product.productId, rawFeaturesString);
    }
    if (rawTagsString) {
      await syncProductTags(tx, product.productId, rawTagsString);
    }
  }

  return validProductData;
}

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
// import { syncVendor } from "./vendor.sync";

// import { Prisma } from "@/generated/prisma/client";

// type Tx = Prisma.TransactionClient;

// export async function syncProduct(
//   tx: Tx,
//   product: InflowProduct,
//   groupId?: string
// ) {
//   const brandId = await syncBrand(tx, product.customFields?.custom1);

//   // 1. Capture target group parameters safely
//   const targetGroupId = groupId || product.productVariant?.productGroup?.productGroupId || null;
  
//   // 2. Initial attempt to grab categoryId from incoming nested stream
//   let categoryId = product.productVariant?.productGroup?.categoryId || null;

//   // Fallback gate for category if payload inclusions are missing group contexts
//   if (!categoryId) {
//     const existingLocalProduct = await tx.product.findUnique({
//       where: { inflowId: product.productId },
//       select: { categoryId: true }
//     });
//     if (existingLocalProduct?.categoryId) {
//       categoryId = existingLocalProduct.categoryId;
//     }
//   }

//   // 3. 🛡️ FOREIGN KEY GUARD: Check if the TeamMember exists before assigning lastModifiedById
//   let validLastModifiedById: string | null = null;
//   if (product.lastModifiedById) {
//     const localMember = await tx.teamMember.findUnique({
//       where: { inflowId: product.lastModifiedById },
//       select: { inflowId: true }
//     });
    
//     if (localMember) {
//       validLastModifiedById = localMember.inflowId;
//     } else {
//       console.warn(
//         `[Sync Notification] TeamMember with inflowId "${product.lastModifiedById}" not synced yet. Setting product.lastModifiedById to null to avoid constraint errors.`
//       );
//     }
//   }

//   // 3. 🛡️ SELF-HEALING FOREIGN KEY GUARD: Vendor
//   let validLastVendorId: string | null = null;
//   if (product.lastVendorId) {
//     const localVendor = await tx.vendor.findUnique({
//       where: { inflowId: product.lastVendorId },
//       select: { inflowId: true }
//     });
    
//     if (localVendor) {
//       validLastVendorId = localVendor.inflowId;
//     } else {
//       try {
//         console.log(`[JIT Sync] Vendor "${product.lastVendorId}" missing locally. Fetching from cloud...`);
//         if (product.lastVendor) {
//           // Initialize empty caches required by your modular single vendor sync component
//           const vendorCaches = {
//             verifiedPaymentTermsIds: new Set<string>(),
//             verifiedTaxingSchemeIds: new Set<string>(),
//             verifiedCurrencyIds: new Set<string>(),
//           };
//           const syncedVendor = await syncVendor(tx, product.lastVendor, vendorCaches);
//           validLastVendorId = syncedVendor.inflowId;
//         }
//       } catch (err) {
//         console.error(`[JIT Sync Error] Could not recover Vendor "${product.lastVendorId}":`, err);
//         // Fallback safely to null to preserve primary process stability if cloud asset was deleted
//       }
//     }
//   }

//   const rawFeaturesString = product?.customFields?.custom2; 
//   const rawTagsString = product?.customFields?.custom3;

//   const baseSlug = await genInflowUniqueSlug(product.name || "product-variant", tx.product, product.productId);

//   // 4. Core Product Upsert Configuration
//   const dbProduct = await tx.product.upsert({
//     where: {
//       inflowId: product.productId,
//     },
//     create: {
//       inflowId: product.productId,
//       sku: product.sku,
//       name: product.name,
//       slug: baseSlug,
//       description: product.description,
//       categoryId, // Safe from accidental null mutation wipes now!
//       brandId,
//       itemType: product.itemType,
//       autoAssemble: product.autoAssemble,
//       isActive: product.isActive,
//       isManufacturable: product.isManufacturable,
//       includeQuantityBuildable: product.includeQuantityBuildable,
//       standardUomName: product.standardUomName,
//       trackExpiry: product.trackExpiry,
//       trackLots: product.trackLots,
//       trackSerials: product.trackSerials,
//       shelfLifeDays: product.shelfLifeDays,
//       sellBeforeExpiryDays: product.sellBeforeExpiryDays,
//       expiryNotificationDays: product.expiryNotificationDays,
//       weight: product.weight ? new Prisma.Decimal(product.weight) : null,
//       width: product.width ? new Prisma.Decimal(product.width) : null,
//       height: product.height ? new Prisma.Decimal(product.height) : null,
//       length: product.length ? new Prisma.Decimal(product.length) : null,
//       originCountry: product.originCountry,
//       hsTariffNumber: product.hsTariffNumber,
//       remarks: product.remarks,
//       lastVendorId: validLastVendorId,
//       lastModifiedById: validLastModifiedById,
//       createdDttm: product.createdDttm ? new Date(product.createdDttm) : null,
//       lastModifiedDateTime: product.lastModifiedDateTime ? new Date(product.lastModifiedDateTime) : null,
//     },
//     update: {
//       sku: product.sku,
//       name: product.name,
//       description: product.description,
//       categoryId, // Kept safe during schema update routines
//       brandId,
//       itemType: product.itemType,
//       autoAssemble: product.autoAssemble,
//       isActive: product.isActive,
//       isManufacturable: product.isManufacturable,
//       includeQuantityBuildable: product.includeQuantityBuildable,
//       standardUomName: product.standardUomName,
//       trackExpiry: product.trackExpiry,
//       trackLots: product.trackLots,
//       trackSerials: product.trackSerials,
//       shelfLifeDays: product.shelfLifeDays,
//       sellBeforeExpiryDays: product.sellBeforeExpiryDays,
//       expiryNotificationDays: product.expiryNotificationDays,
//       weight: product.weight ? new Prisma.Decimal(product.weight) : null,
//       width: product.width ? new Prisma.Decimal(product.width) : null,
//       height: product.height ? new Prisma.Decimal(product.height) : null,
//       length: product.length ? new Prisma.Decimal(product.length) : null,
//       originCountry: product.originCountry,
//       hsTariffNumber: product.hsTariffNumber,
//       remarks: product.remarks,
//       lastVendorId: validLastVendorId,
//       lastModifiedById: validLastModifiedById,
//       lastModifiedDateTime: product.lastModifiedDateTime ? new Date(product.lastModifiedDateTime) : null,
//     },
//   });

//   // Base Helpers Execution (Check if fields exist in payload down inside helpers)
//   await syncPurchasingUom(tx, product);
//   await syncSalesUom(tx, product);
  
//   if (product.images) {
//     await syncImages(tx, product);
//   }

//   /**
//    * 2. Barcodes Sync (Guarded from partial check wipes)
//    */
//   if (product.productBarcodes !== undefined) {
//     await tx.productBarcode.deleteMany({ where: { productId: product.productId } });
//     if (product.productBarcodes?.length) {
//       await tx.productBarcode.createMany({
//         data: product.productBarcodes.map((bc) => ({
//           inflowId: bc.productBarcodeId,
//           productId: product.productId,
//           barcode: bc.barcode,
//           lineNum: typeof bc.lineNum === "string" ? parseInt(bc.lineNum, 10) : bc.lineNum,
//         })),
//         skipDuplicates: true,
//       });
//     }
//   }

//   /**
//    * 3. Tax Codes Sync
//    */
//   if (product.taxCodes !== undefined) {
//     await tx.productTaxCode.deleteMany({ where: { productId: product.productId } });
//     if (product.taxCodes?.length) {
//       await tx.productTaxCode.createMany({
//         data: product.taxCodes.map((tc) => ({
//           productTaxCodeId: tc.productTaxCodeId,
//           productId: product.productId,
//           taxCodeId: tc.taxCodeId,
//           taxingSchemeId: tc.taxingSchemeId,
//         })),
//         skipDuplicates: true,
//       });
//     }
//   }

//   /**
//    * 4. Reorder Settings Sync
//    */
//   if (product.reorderSettings !== undefined) {
//     await tx.reorderSetting.deleteMany({ where: { productId: product.productId } });
//     if (product.reorderSettings?.length) {
//       await tx.reorderSetting.createMany({
//         data: product.reorderSettings.map((rs) => ({
//           inflowId: rs.reorderSettingsId,
//           productId: product.productId,
//           locationId: rs.locationId,
//           fromLocationId: rs.fromLocationId,
//           vendorId: rs.vendorId,
//           defaultSublocation: rs.defaultSublocation,
//           enableReordering: rs.enableReordering ?? true,
//           reorderMethod: rs.reorderMethod || "PurchaseOrder",
//           reorderPoint: new Prisma.Decimal(rs.reorderPoint || 0),
//           reorderQuantity: new Prisma.Decimal(rs.reorderQuantity || 0),
//         })),
//         skipDuplicates: true,
//       });
//     }

    
//   }

//   /**
//      * STEP 1: Rich Foreign Key Healing (Locations & Terms)
//      */
//     // if (customer.defaultLocation?.locationId && !caches.verifiedLocationIds.has(customer.defaultLocation.locationId)) {
//     //   await ensureLocationShell(tx, {
//     //     inflowId: customer.defaultLocation.locationId,
//     //     name: customer.defaultLocation.name || "Default Warehouse",
//     //     isActive: customer.defaultLocation.isActive,
//     //     isDefault: customer.defaultLocation.isDefault,
//     //     address: customer.defaultLocation.address,
//     //   });
//     //   caches.verifiedLocationIds.add(customer.defaultLocation.locationId);
//     // }

//   /**
//    * 5. Product Operations Sync
//    */
//   if (product.productOperations !== undefined) {
//     await tx.productOperation.deleteMany({ where: { productId: product.productId } });
//     if (product.productOperations?.length) {
//       await tx.productOperation.createMany({
//         data: product.productOperations.map((po) => ({
//           inflowId: po.productOperationId,
//           productId: product.productId,
//           operationTypeId: po.operationTypeId,
//           lineNum: typeof po.lineNum === "string" ? parseInt(po.lineNum, 10) : po.lineNum,
//           cost: new Prisma.Decimal(po.cost || 0),
//           estimatedPerHourCost: new Prisma.Decimal(po.estimatedPerHourCost || 0),
//           estimatedSeconds: new Prisma.Decimal(po.estimatedSeconds || 0),
//           instructions: po.instructions,
//           trackTime: po.trackTime ?? false,
//         })),
//         skipDuplicates: true,
//       });
//     }
//   }

//   /**
//    * 6. Product Prices Sync
//    */
//   if (product.prices !== undefined) {
//     await tx.productPrice.deleteMany({ where: { productId: product.productId } });
//     if (product.prices?.length) {
//       await tx.productPrice.createMany({
//         data: product.prices.map((p) => {
//           let normalizedPriceType = "fixedPrice";
//           const incomingType = p.priceType?.toLowerCase() || "";
//           if (incomingType.includes("markup")) normalizedPriceType = "markup";
//           if (incomingType.includes("margin")) normalizedPriceType = "margin";

//           return {
//             inflowId: p.productPriceId,
//             pricingSchemeId: p.pricingSchemeId,
//             productId: product.productId,
//             priceType: normalizedPriceType as any,
//             unitPrice: p.unitPrice ? new Prisma.Decimal(p.unitPrice) : null,
//             fixedMarkup: p.fixedMarkup ? new Prisma.Decimal(p.fixedMarkup) : null,
//           };
//         }),
//         skipDuplicates: true,
//       });
//     }
//   }

//   /**
//    * 7. Product Cost (1:1 Relation Sync Setup)
//    */
//   if (product.cost !== undefined) {
//     if (product.cost) {
//       await tx.productCost.upsert({
//         where: { productId: product.productId },
//         create: {
//           inflowId: product.cost.productCostId,
//           productId: product.productId,
//           cost: new Prisma.Decimal(product.cost.cost || 0),
//         },
//         update: {
//           inflowId: product.cost.productCostId,
//           cost: new Prisma.Decimal(product.cost.cost || 0),
//         },
//       });
//     } else {
//       await tx.productCost.deleteMany({ where: { productId: product.productId } });
//     }
//   }

//   /**
//    * 8. Item BOM (Bill of Materials) Components Sync
//    */
//   if (product.itemBoms !== undefined) {
//     await tx.productBom.deleteMany({ where: { productId: product.productId } });
//     if (product.itemBoms?.length) {
//       await tx.productBom.createMany({
//         data: product.itemBoms.map((bom) => {
//           const rawQuantity = typeof bom.quantity === "object" 
//             ? bom.quantity?.standardQuantity 
//             : bom.quantity;

//           return {
//             inflowId: bom.itemBomId,
//             productId: product.productId,
//             childProductId: bom.childProductId,
//             quantity: new Prisma.Decimal(rawQuantity || "0"),
//           };
//         }),
//         skipDuplicates: true,
//       });
//     }
//   }

//   /**
//    * 9. Product Attachments Sync
//    */
//   if (product.attachments !== undefined) {
//     await tx.productAttachment.deleteMany({ where: { productId: product.productId } });
//     if (product.attachments?.length) {
//       await tx.productAttachment.createMany({
//         data: product.attachments.map((att) => ({
//           inflowId: att.attachmentId,
//           productId: product.productId,
//           attachmentUrl: att.attachmentUrl,
//           fileName: att.fileName,
//           lastModDttm: att.lastModDttm ? new Date(att.lastModDttm) : null,
//           lastModifiedById: att.lastModifiedById,
//         })),
//         skipDuplicates: true,
//       });
//     }
//   }

//   /**
//    * 10. Metadata / Features / Tags Dynamic Routing
//    */
//   if (targetGroupId) {
//     await syncGroupFeatures(tx, targetGroupId, rawFeaturesString);
//     await syncGroupTags(tx, targetGroupId, rawTagsString);
//   } else {
//     await syncProductFeatures(tx, product.productId, rawFeaturesString);
//     await syncProductTags(tx, product.productId, rawTagsString);
//   }

//   return dbProduct;
// }

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

