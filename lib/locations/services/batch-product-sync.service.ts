import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getLocalBatchProducts } from "../data/product-local";
import { LocalProduct } from "../types";
import { InflowProduct } from "@/lib/inflow/types";
import { localProductItemType } from "@/helpers/product.helper";
import { syncProduct } from "./product-sync";
import { generateSku2Variant2V2, generateSku2Variant2V2G, generateSku2Variant2V2GNoSpace } from "@/helpers/genSKU";
import { parseBooleanFlag } from "@/helpers";

type SyncOptions = {
  onProgress?: (processedCount: number) => Promise<void>;
  checkSignal?: () => Promise<void>;
  batchSize?: number;
  delayBetweenBatchesMs?: number;
};

type SyncLocation = {
  inflowId: string;
  name: string;
  url: string;
};

type SyncResultItem = {
  productLocalId: string;
  productInflowId?: string;
  status: "synced" | "skipped_not_found";
};

export class ProductSyncMapService {
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async resolveLocationMappedId(
    localId: number | undefined,
    cache: Map<number, string>,
    fetcher: () => Promise<{ categoryId?: string; vendorId?: string; teamMemberId?: string } | null>,
    keyField: 'categoryId' | 'vendorId' | 'teamMemberId'
  ): Promise<string | null> {
    if (!localId || isNaN(localId)) return null;
    if (cache.has(localId)) return cache.get(localId)!;

    const match = await fetcher();
    const value = match?.[keyField] || null;
    if (value) cache.set(localId, value);
    return value;
  }

  async sync(
    location: SyncLocation,
    options: SyncOptions,
    selectedRecords?: (string | number)[],
    syncedAll?: boolean,
    brandCustomName?: string,
    includes?: string[],
    after?: string,
  ) {
    const { onProgress, checkSignal } = options;
    const hasImage = (includes ?? []).includes("image");
    const hasCoreProductData = (includes ?? []).includes("coreData");

    const BATCH_SIZE = options?.batchSize ?? (!hasImage ? 500 : 10);
    const INTER_BATCH_DELAY = options?.delayBetweenBatchesMs ?? 1000;
    const CLIENT_RETRIES = 1;

    let totalProcessed = 0;
    let hasMore = true;
    let currentAfter = after;

    const allowedIds =
      !syncedAll && selectedRecords && selectedRecords.length > 0
        ? new Set(selectedRecords.map(String))
        : null;

    const [defaultCategory, defaultTeamMember] = await Promise.all([
      prisma.category.findFirst({
        where: { isDefault: true },
        select: { inflowId: true },
      }),
      prisma.teamMember.findFirst({
        where: { isInternal: true },
        select: { inflowId: true },
      }),
    ]);

    const fallbackCategoryId = defaultCategory?.inflowId || null;
    const fallbackTeamMemberId = defaultTeamMember?.inflowId || null;

    const syncResults: SyncResultItem[] = [];

    const caches = {
      verifiedTeamMemberIds: new Set<string>(),
      verifiedCategoryIds: new Set<string>(),
      verifiedVendorIds: new Set<string>(),
      verifiedLocationIds: new Set<string>(),
      verifiedTaxingSchemes: new Set<string>(),
      verifiedTaxCodes: new Set<string>(),
      verifiedOperationTypes: new Set<string>(),
      verifiedPricingSchemeIds: new Set<string>(),
      verifiedProductIds: new Set<string>(),
      verifiedBrands: new Map<string, string>(),
    };

    while (hasMore) {
      if (checkSignal) await checkSignal();

      const rawBatch: LocalProduct[] = await getLocalBatchProducts(
        location.url,
        BATCH_SIZE,
        currentAfter,
        includes,
        CLIENT_RETRIES
      );

      if (!rawBatch || rawBatch.length === 0) break;

      currentAfter = String(rawBatch[rawBatch.length - 1].productId);
      if (rawBatch.length < BATCH_SIZE) hasMore = false;

      let batch = rawBatch;
      if (allowedIds) {
        batch = batch.filter((item) => allowedIds.has(String(item.productId)));
      }

      if (batch.length === 0) continue;

      if (checkSignal) await checkSignal();

      const batchProcessedCount = await prisma.$transaction(
        async (tx) => {
          let batchProcessed = 0;

          for (const product of batch) {
            if (checkSignal) await checkSignal();

            if (!parseBooleanFlag(product.isActive)) continue;

            // temporary skip no image
            // if (!product.image || !product.image.startsWith("data:image")) continue;

            const trimmedName = product.name?.trim();
            if (!trimmedName) {
              syncResults.push({
                productLocalId: String(product.productId),
                status: "skipped_not_found",
              });
              continue;
            }

            // 1. Look for existing product
            let match = await tx.product.findFirst({
              where: { name: trimmedName },
              select: { inflowId: true, isLocalSynced: true },
            });

            const targetInflowId = match?.inflowId || crypto.randomUUID().toLowerCase();
            const currentTimestamp = new Date().toISOString();

            // 2. Prepare payload dynamically based on requested sync flags
            let payload: InflowProduct & { slug?: string };

            if (!hasCoreProductData && hasImage) {
              // --- IMAGE-ONLY SYNC ---
              payload = {
                productId: targetInflowId,
                name: trimmedName,
                image: product.image,
              } as InflowProduct;
            } else {
              // --- FULL CORE DATA / UPSERT SYNC ---
              const categoryLocalId = Number(product.categoryId);
              const lastVendorId = Number(product.lastVendorId);
              const lastModifiedById = Number(product.lastModifiedById);

              const [categoryMap, vendorMap, teamMemberMap] = await Promise.all([
                product.categoryId && !isNaN(categoryLocalId)
                  ? tx.categoryLocationMap.findFirst({
                      where: { locationId: location.inflowId, localId: categoryLocalId },
                      select: { categoryId: true },
                    })
                  : null,
                product.lastVendorId && !isNaN(lastVendorId)
                  ? tx.vendorLocationMap.findFirst({
                      where: { locationId: location.inflowId, localId: lastVendorId },
                      select: { vendorId: true },
                    })
                  : null,
                product.lastModifiedById && !isNaN(lastModifiedById)
                  ? tx.teamMemberLocationMapExtended.findFirst({
                      where: { locationId: location.inflowId, localId: lastModifiedById },
                      select: { teamMemberId: true },
                    })
                  : null,
              ]);

              const brandName = product.customFields?.custom7 || "";
              const skuGenerated = generateSku2Variant2V2GNoSpace(brandName, trimmedName, []);

              // 1. Allowed UOM list definition
              const ALLOWED_UOMS = ["cases", "pcs.", "ea.", "packs"] as const;

              // 2. Safe normalization helper
              const sanitizeUom = (val?: string | null): string => {
                const clean = val?.trim().toLowerCase();
                return ALLOWED_UOMS.includes(clean as any) ? clean! : "ea.";
              };

              payload = {
                productId: targetInflowId,
                sku: skuGenerated,
                name: trimmedName,
                description: product.description ?? null,
                itemType: localProductItemType(product.itemType),
                autoAssemble: parseBooleanFlag(product.autoAssemble),
                isActive: parseBooleanFlag(product.isActive),
                isManufacturable: parseBooleanFlag(product.isManufacturable),
                includeQuantityBuildable: parseBooleanFlag(product.includeQuantityBuildable),
                // Standard UOM validated against allowed list
                standardUomName: sanitizeUom(product.standardUomName),
                
                purchasingUom: product.purchasingUom
                  ? {
                      name: sanitizeUom(product.purchasingUom.poUomName),
                      conversionRatio: {
                        standardQuantity: product.purchasingUom.poUomRatioStd || "1.0000",
                        uomQuantity: product.purchasingUom.poUomRatio || "1.0000",
                      },
                    }
                  : null,
                  
                salesUom: product.salesUom
                  ? {
                      name: sanitizeUom(product.salesUom.soUomName),
                      conversionRatio: {
                        standardQuantity: product.salesUom.soUomRatioStd || "1.0000",
                        uomQuantity: product.salesUom.soUomRatio || "1.0000",
                      },
                    }
                  : null,
                trackExpiry: parseBooleanFlag(product.trackExpiry),
                trackLots: parseBooleanFlag(product.trackLots),
                trackSerials: parseBooleanFlag(product.trackSerials),
                shelfLifeDays: product.shelfLifeDays ?? null,
                sellBeforeExpiryDays: product.sellBeforeExpiryDays ?? null,
                expiryNotificationDays: product.expiryNotificationDays ?? null,
                weight: product.weight != null ? String(product.weight) : null,
                width: product.width != null ? String(product.width) : null,
                height: product.height != null ? String(product.height) : null,
                length: product.length != null ? String(product.length) : null,
                originCountry: product.originCountry || null,
                hsTariffNumber: product.hsTariffNumber || null,
                remarks: product.remarks || null,
                categoryId: categoryMap?.categoryId || fallbackCategoryId,
                lastVendorId: vendorMap?.vendorId || null,
                lastModifiedById: teamMemberMap?.teamMemberId || fallbackTeamMemberId,
                createdDttm: currentTimestamp,
                lastModifiedDateTime: product.lastModifiedDateTime || currentTimestamp,
                timestamp: currentTimestamp,
                customFields: product.customFields,
                productBarcodes: product.barcode?.trim()
                  ? [
                      {
                        productBarcodeId: crypto.randomUUID().toLowerCase(),
                        barcode: product.barcode.trim(),
                        lineNum: 1,
                        productId: targetInflowId,
                        timestamp: currentTimestamp,
                      },
                    ]
                  : [],
                prices: (product.prices ?? []).map((p) => ({
                  productPriceId: crypto.randomUUID().toLowerCase(),
                  productId: targetInflowId,
                  pricingSchemeId: String(p.pricingSchemeId),
                  priceType: p.priceType || "FixedPrice",
                  fixedMarkup: p.fixedMarkup != null ? String(p.fixedMarkup) : null,
                  unitPrice: String(p.unitPrice ?? 0),
                  timestamp: currentTimestamp,
                })),
                itemBoms: product.itemBoms || [],
                attachments: product.attachments || [],
                image: hasImage ? product.image : undefined,
              } as InflowProduct;
            }

            // 3. Delegate Upsert logic to syncProduct
            match = await syncProduct(
              tx,
              payload,
              undefined,
              undefined,
              hasCoreProductData,
              brandCustomName,
              caches
            );

            if (!match?.inflowId || !location.inflowId) {
              syncResults.push({
                productLocalId: String(product.productId),
                status: "skipped_not_found",
              });
              continue;
            }

            // 4. Bridge local ID to location mapping table
            const localIdNum = Number(product.productId);
            const validLocalId = !isNaN(localIdNum) ? localIdNum : 0;

            await tx.productLocationMap.upsert({
              where: {
                productId_locationId: {
                  productId: match.inflowId,
                  locationId: location.inflowId,
                },
              },
              create: {
                productId: match.inflowId,
                locationId: location.inflowId,
                localId: validLocalId,
              },
              update: {
                localId: validLocalId,
              },
            });

            if (!match.isLocalSynced) {
              await tx.product.update({
                where: { inflowId: match.inflowId },
                data: { isLocalSynced: true },
              });
            }

            syncResults.push({
              productLocalId: String(product.productId),
              productInflowId: match.inflowId,
              status: "synced",
            });

            batchProcessed++;
          }

          return batchProcessed;
        },
        { timeout: 60000 }
      );

      totalProcessed += batchProcessedCount;

      if (onProgress) await onProgress(totalProcessed);
      if (checkSignal) await checkSignal();

      if (INTER_BATCH_DELAY > 0) {
        await this.sleep(INTER_BATCH_DELAY);
      }
    }

    return {
      productsProcessed: totalProcessed,
      syncedAt: new Date().toISOString(),
      results: syncResults,
    };
  }

  // async sync(
  //   location: SyncLocation,
  //   options: SyncOptions,
  //   selectedRecords?: (string | number)[],
  //   syncedAll?: boolean,
  //   brandCustomName?: string,
  //   includes?: string[],
  //   after?: string,
  // ) {
  //   const { onProgress, checkSignal } = options;
  //   let BATCH_SIZE = options?.batchSize ?? 30;
  //   const INTER_BATCH_DELAY = options?.delayBetweenBatchesMs ?? 10;
  //   const CLIENT_RETRIES = 1;

  //   let totalProcessed = 0;
  //   let hasMore = true;
  //   let currentAfter = after;

  //   const hasImage = (includes ?? []).includes("image");
  //   BATCH_SIZE = hasImage ? 10 : 500;
  //   const hasCoreProductData = (includes ?? []).includes("coreData");

  //   const allowedIds =
  //     !syncedAll && selectedRecords && selectedRecords.length > 0
  //       ? new Set(selectedRecords.map(String))
  //       : null;

  //   // Fetch fallback defaults ONCE outside the main loop
  //   const [defaultCategory, defaultTeamMember] = await Promise.all([
  //     prisma.category.findFirst({
  //       where: { isDefault: true },
  //       select: { inflowId: true },
  //     }),
  //     prisma.teamMember.findFirst({
  //       where: { isInternal: true },
  //       select: { inflowId: true },
  //     }),
  //   ]);

  //   const fallbackCategoryId = defaultCategory?.inflowId || null;
  //   const fallbackTeamMemberId = defaultTeamMember?.inflowId || null;

  //   const syncResults: SyncResultItem[] = [];

  //   const caches = {
  //     verifiedTeamMemberIds: new Set<string>(),
  //     verifiedCategoryIds: new Set<string>(),
  //     verifiedVendorIds: new Set<string>(),
  //     verifiedLocationIds: new Set<string>(),
  //     verifiedTaxingSchemes: new Set<string>(),
  //     verifiedTaxCodes: new Set<string>(),
  //     verifiedOperationTypes: new Set<string>(),
  //     verifiedPricingSchemeIds: new Set<string>(),
  //     verifiedProductIds: new Set<string>(),
  //     verifiedBrands: new Map<string, string>(),
  //   };

  //   console.log(
  //     `Starting optimized product sync map (Batch Size: ${BATCH_SIZE}, Throttle: ${INTER_BATCH_DELAY}ms)...`
  //   );
  //   let batchNo = 0;

  //   while (hasMore) {
  //     if (checkSignal) await checkSignal();

  //     const rawBatch: LocalProduct[] = await getLocalBatchProducts(
  //       location.url,
  //       BATCH_SIZE,
  //       currentAfter,
  //       includes,
  //       CLIENT_RETRIES
  //     );

  //     if (!rawBatch || rawBatch.length === 0) break;

  //     currentAfter = String(rawBatch[rawBatch.length - 1].productId);
  //     if (rawBatch.length < BATCH_SIZE) hasMore = false;

  //     let batch = rawBatch;
  //     if (allowedIds) {
  //       batch = batch.filter((item) => allowedIds.has(String(item.productId)));
  //     }

  //     if (batch.length === 0) continue;

  //     if (checkSignal) await checkSignal();

  //     // Sequential transactional processing to prevent database deadlocks
  //     const batchProcessedCount = await prisma.$transaction(
  //       async (tx) => {
  //         let batchProcessed = 0;

  //         for (const product of batch) {
  //           if (checkSignal) await checkSignal();

  //           if (!parseBooleanFlag(product.isActive)) {
  //             continue;
  //           }

  //           // Check existing mapping within this specific location
  //           const existingMappedProduct = product.productId
  //             ? await tx.productLocationMap.findFirst({
  //                 where: {
  //                   locationId: location.inflowId,
  //                   localId: Number(product.productId),
  //                 },
  //                 select: {
  //                   localId: true,
  //                   productId: true,
  //                 },
  //               })
  //             : null;

  //           // Skip record if already mapped and update flag is false
  //           if (existingMappedProduct) {
  //             continue;
  //           }

  //           const trimmedName = product.name?.trim();
  //           if (!trimmedName) {
  //             syncResults.push({
  //               productLocalId: String(product.productId),
  //               status: "skipped_not_found",
  //             });
  //             continue;
  //           }

  //           // 1. Check existing match by name
  //           let match = await tx.product.findFirst({
  //             where: { name: trimmedName },
  //             select: { inflowId: true, isLocalSynced: true },
  //           });

  //           // 2. If no match exists, map location mappings and sync product
  //           // if (!match) {
  //             console.log("Not match! Syncing...")
  //             const generatedInflowId = crypto.randomUUID().toLowerCase();
  //             const currentTimestamp = new Date().toISOString();

  //             const categoryLocalId = Number(product.categoryId);
  //             const lastVendorId = Number(product.lastVendorId);
  //             const lastModifiedById = Number(product.lastModifiedById);

  //             const [categoryMap, vendorMap, teamMemberMap] = await Promise.all([
  //               product.categoryId && !isNaN(categoryLocalId)
  //                 ? tx.categoryLocationMap.findFirst({
  //                     where: {
  //                       locationId: location.inflowId,
  //                       localId: categoryLocalId,
  //                     },
  //                     select: { categoryId: true },
  //                   })
  //                 : null,
  //               product.lastVendorId && !isNaN(lastVendorId)
  //                 ? tx.vendorLocationMap.findFirst({
  //                     where: {
  //                       locationId: location.inflowId,
  //                       localId: lastVendorId,
  //                     },
  //                     select: { vendorId: true },
  //                   })
  //                 : null,
  //               product.lastModifiedById && !isNaN(lastModifiedById)
  //                 ? tx.teamMemberLocationMapExtended.findFirst({
  //                     where: {
  //                       locationId: location.inflowId,
  //                       localId: lastModifiedById,
  //                     },
  //                     select: { teamMemberId: true },
  //                   })
  //                 : null,
  //             ]);

  //             const brandName = product.customFields?.custom7 || "";
  //             const skuGenerated = generateSku2Variant2V2(brandName, trimmedName, []);

  //             const payload: InflowProduct & { slug?: string } = {
  //               productId: generatedInflowId,
  //               sku: skuGenerated,
  //               name: trimmedName,
  //               description: product.description ?? null,
  //               itemType: localProductItemType(product.itemType),
  //               autoAssemble: parseBooleanFlag(product.autoAssemble),
  //               isActive: parseBooleanFlag(product.isActive),
  //               isManufacturable: parseBooleanFlag(product.isManufacturable),
  //               includeQuantityBuildable: parseBooleanFlag(product.includeQuantityBuildable),
  //               standardUomName: product.standardUomName || "ea.",

  //               trackExpiry: parseBooleanFlag(product.trackExpiry),
  //               trackLots: parseBooleanFlag(product.trackLots),
  //               trackSerials: parseBooleanFlag(product.trackSerials),

  //               shelfLifeDays: product.shelfLifeDays ?? null,
  //               sellBeforeExpiryDays: product.sellBeforeExpiryDays ?? null,
  //               expiryNotificationDays: product.expiryNotificationDays ?? null,

  //               weight: product.weight != null ? String(product.weight) : null,
  //               width: product.width != null ? String(product.width) : null,
  //               height: product.height != null ? String(product.height) : null,
  //               length: product.length != null ? String(product.length) : null,

  //               originCountry: product.originCountry || null,
  //               hsTariffNumber: product.hsTariffNumber || null,
  //               remarks: product.remarks || null,
  //               categoryId: categoryMap?.categoryId || fallbackCategoryId,
  //               lastVendorId: vendorMap?.vendorId || null,
  //               lastModifiedById: teamMemberMap?.teamMemberId || fallbackTeamMemberId,
  //               createdDttm: currentTimestamp,
  //               lastModifiedDateTime: product.lastModifiedDateTime || currentTimestamp,
  //               timestamp: currentTimestamp,

  //               purchasingUom: product.purchasingUom
  //                 ? {
  //                     name: product.purchasingUom.poUomName || "ea.",
  //                     conversionRatio: {
  //                       standardQuantity: product.purchasingUom.poUomRatioStd || "1.0000",
  //                       uomQuantity: product.purchasingUom.poUomRatio || "1.0000",
  //                     },
  //                   }
  //                 : null,

  //               salesUom: product.salesUom
  //                 ? {
  //                     name: product.salesUom.soUomName || "ea.",
  //                     conversionRatio: {
  //                       standardQuantity: product.salesUom.soUomRatioStd || "1.0000",
  //                       uomQuantity: product.salesUom.soUomRatio || "1.0000",
  //                     },
  //                   }
  //                 : null,

  //               customFields: {
  //                 custom1: product.customFields?.custom1 || undefined,
  //                 custom2: product.customFields?.custom2 || undefined,
  //                 custom3: product.customFields?.custom3 || undefined,
  //                 custom4: product.customFields?.custom4 || undefined,
  //                 custom5: product.customFields?.custom5 || undefined,
  //                 custom6: product.customFields?.custom6 || undefined,
  //                 custom7: product.customFields?.custom7 || undefined,
  //                 custom8: product.customFields?.custom8 || undefined,
  //                 custom9: product.customFields?.custom9 || undefined,
  //                 custom10: product.customFields?.custom10 || undefined,
  //               },

  //               productBarcodes: product.barcode?.trim()
  //                 ? [
  //                     {
  //                       productBarcodeId: crypto.randomUUID().toLowerCase(),
  //                       barcode: product.barcode.trim(),
  //                       lineNum: 1,
  //                       productId: generatedInflowId,
  //                       timestamp: currentTimestamp,
  //                     },
  //                   ]
  //                 : [],

  //               prices: product.prices
  //                 ? product.prices.map((p) => ({
  //                     productPriceId: crypto.randomUUID().toLowerCase(),
  //                     productId: generatedInflowId,
  //                     pricingSchemeId: String(p.pricingSchemeId),
  //                     priceType: p.priceType || "FixedPrice",
  //                     fixedMarkup: p.fixedMarkup != null ? String(p.fixedMarkup) : null,
  //                     unitPrice: String(p.unitPrice ?? 0),
  //                     timestamp: currentTimestamp,
  //                   }))
  //                 : [],

  //               images: [],
  //               inventoryLines: [],
  //               productVariant: undefined,
  //               itemBoms: product.itemBoms || [],
  //               attachments: product.attachments || [],
  //               taxCodes: [],
  //               reorderSettings: [],
  //               productOperations: [],
  //               cost: product.cost
  //                 ? {
  //                     productCostId: crypto.randomUUID().toLowerCase(),
  //                     productId: generatedInflowId,
  //                     cost: String(product.cost),
  //                   }
  //                 : undefined,
  //               image: product.image
  //             };

  //             match = await syncProduct(
  //               tx,
  //               payload,
  //               undefined,
  //               undefined,
  //               hasCoreProductData,
  //               brandCustomName,
  //               caches
  //             );

  //             // export async function syncProduct(
  //             //   tx: Tx,
  //             //   product: InflowProduct,
  //             //   groupId?: string,
  //             //   firstProductInGroup?: InflowProduct,
  //             //   hasCoreProductData?: boolean,
  //             //   brandCustomName?: string | null,
  //             //   caches?: SyncCache,
  //             // ) {
  //           // }

  //           if (!match?.inflowId || !location.inflowId) {
  //             syncResults.push({
  //               productLocalId: String(product.productId),
  //               status: "skipped_not_found",
  //             });
  //             continue;
  //           }

  //           // 3. Bridge mapping record upsert/check
  //           const localIdNum = Number(product.productId);
  //           const validLocalId = !isNaN(localIdNum) ? localIdNum : 0;

  //           await tx.productLocationMap.upsert({
  //             where: {
  //               productId_locationId: {
  //                 productId: match.inflowId,
  //                 locationId: location.inflowId,
  //               },
  //             },
  //             create: {
  //               productId: match.inflowId,
  //               locationId: location.inflowId,
  //               localId: validLocalId,
  //             },
  //             update: {},
  //           });

  //           if (!match.isLocalSynced) {
  //             await tx.product.update({
  //               where: { inflowId: match.inflowId },
  //               data: { isLocalSynced: true },
  //             });
  //           }

  //           syncResults.push({
  //             productLocalId: String(product.productId),
  //             productInflowId: match.inflowId,
  //             status: "synced",
  //           });

  //           batchProcessed++;
  //         }

  //         return batchProcessed;
  //       },
  //       { timeout: 60000 }
  //     );

  //     totalProcessed += batchProcessedCount;
  //     batchNo++;

  //     console.log(`Batch #${batchNo} completed. Processed ${totalProcessed} products.`);

  //     if (onProgress) await onProgress(totalProcessed);
  //     if (checkSignal) await checkSignal();

  //     if (INTER_BATCH_DELAY > 0) {
  //       await this.sleep(INTER_BATCH_DELAY);
  //     }
  //   }

  //   return {
  //     productsProcessed: totalProcessed,
  //     syncedAt: new Date().toISOString(),
  //     results: syncResults,
  //   };
  // }
}

const productService = new ProductSyncMapService();
export const localProductServiceSyncMap = productService.sync.bind(productService);