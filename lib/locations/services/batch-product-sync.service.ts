import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getLocalBatchProducts } from "../data/product-local";
import { LocalProduct } from "../types";
import { InflowProduct } from "@/lib/inflow/types";
import { localProductItemType } from "@/helpers/product.helper";
import { syncProduct } from "./product-sync";
import { generateSku2Variant2V2GNoSpace } from "@/helpers/genSKU";
import { parseBooleanFlag } from "@/helpers";
import { patchProductCategory, patchProductVendor, syncProductImageOnlyToLocal } from "./helper";

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

type MapContext = {
  location: SyncLocation;
  hasImage: boolean;
  hasCoreProductData: boolean;
  brandCustomName?: string;
  fallbackCategoryId: string | null;
  fallbackTeamMemberId: string | null;
  ALLOWED_UOM_SET: Set<string>;
  caches: {
    verifiedTeamMemberIds: Set<string>;
    verifiedCategoryIds: Set<string>;
    verifiedVendorIds: Set<string>;
    verifiedLocationIds: Set<string>;
    verifiedTaxingSchemes: Set<string>;
    verifiedTaxCodes: Set<string>;
    verifiedOperationTypes: Set<string>;
    verifiedPricingSchemeIds: Set<string>;
    verifiedProductIds: Set<string>;
    verifiedBrands: Map<string, string>;
  };
};

type DbClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export class ProductSyncService {
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Processes and maps a single batch of product records within a database transaction context.
   */
  async map(
    tx: DbClient,
    batch: LocalProduct[],
    ctx: MapContext,
    checkSignal?: () => Promise<void>
  ) {
    const {
      location,
      hasImage,
      hasCoreProductData,
      brandCustomName,
      fallbackCategoryId,
      fallbackTeamMemberId,
      ALLOWED_UOM_SET,
      caches,
    } = ctx;

    const results: SyncResultItem[] = [];
    let processedCount = 0;

    const sanitizeUom = (val?: string | null): string => {
      const clean = val?.trim().toLowerCase();
      return clean && ALLOWED_UOM_SET.has(clean) ? clean : "ea.";
    };

    // Extract batch entity local IDs to pre-fetch location mappings in bulk
    const categoryLocalIds = Array.from(new Set(batch.map((p) => Number(p.categoryId)).filter((id) => !isNaN(id))));
    const vendorLocalIds = Array.from(new Set(batch.map((p) => Number(p.lastVendorId)).filter((id) => !isNaN(id))));
    const teamMemberLocalIds = Array.from(new Set(batch.map((p) => Number(p.lastModifiedById)).filter((id) => !isNaN(id))));

    const [categoryMaps, vendorMaps, teamMemberMaps] = await Promise.all([
      categoryLocalIds.length
        ? tx.categoryLocationMap.findMany({
            where: { locationId: location.inflowId, localId: { in: categoryLocalIds } },
            select: { localId: true, categoryId: true },
          })
        : [],
      vendorLocalIds.length
        ? tx.vendorLocationMap.findMany({
            where: { locationId: location.inflowId, localId: { in: vendorLocalIds } },
            select: { localId: true, vendorId: true },
          })
        : [],
      teamMemberLocalIds.length
        ? tx.teamMemberLocationMapExtended.findMany({
            where: { locationId: location.inflowId, localId: { in: teamMemberLocalIds } },
            select: { localId: true, teamMemberId: true },
          })
        : [],
    ]);

    const categoryMapCache = new Map(categoryMaps.map((m) => [m.localId, m.categoryId]));
    const vendorMapCache = new Map(vendorMaps.map((m) => [m.localId, m.vendorId]));
    const teamMemberMapCache = new Map(teamMemberMaps.map((m) => [m.localId, m.teamMemberId]));

    for (const product of batch) {
      if (checkSignal) await checkSignal();

      if (!parseBooleanFlag(product.isActive)) {
        continue;
      }

      const trimmedName = product.name?.trim();
      if (!trimmedName) {
        results.push({
          productLocalId: String(product.productId),
          status: "skipped_not_found",
        });
        continue;
      }

      let match = await tx.product.findFirst({
        where: { name: trimmedName },
        select: { inflowId: true, name: true, isLocalSynced: true, categoryId: true, lastVendorId: true },
      });

      if (match) {
        const categoryLocalId = Number(product.categoryId);
        const targetCategoryId = categoryMapCache.get(categoryLocalId) || fallbackCategoryId;

        if (targetCategoryId && match.categoryId !== targetCategoryId) {
          await patchProductCategory(tx, match.inflowId, targetCategoryId);
        }

        const lastVendorLocalId = Number(product.lastVendorId);
        const targetVendorId = vendorMapCache.get(lastVendorLocalId) || null;

        if (targetVendorId && match.lastVendorId !== targetVendorId) {
          await patchProductVendor(tx, match.inflowId, targetVendorId);
        }

        const hasImageToSync = Boolean(product.image);
        if (hasImageToSync) {
          await syncProductImageOnlyToLocal(
          tx,
          product.image || "",
          {
            productId: match.inflowId, 
            name: match.name,
            images: [],
          });
        }

        const localIdNum = Number(product.productId);
        await tx.productLocationMap.upsert({
          where: {
            productId_locationId: {
              productId: match.inflowId,
              locationId: location.inflowId,
            },
          },
          update: {},
          create: {
            productId: match.inflowId,
            locationId: location.inflowId,
            localId: !isNaN(localIdNum) ? localIdNum : 0,
          },
        });

        results.push({
          productLocalId: String(product.productId),
          productInflowId: match.inflowId,
          status: "synced",
        });

        processedCount++;
        continue;
      }

      const targetInflowId = crypto.randomUUID().toLowerCase();
      const currentTimestamp = new Date().toISOString();

      let payload: InflowProduct;

      if (!hasCoreProductData && hasImage) {
        payload = {
          productId: targetInflowId,
          name: trimmedName,
          image: product.image,
        } as InflowProduct;
      } else {
        const categoryLocalId = Number(product.categoryId);
        const lastVendorId = Number(product.lastVendorId);
        const lastModifiedById = Number(product.lastModifiedById);

        const mappedCategoryId = categoryMapCache.get(categoryLocalId) || fallbackCategoryId;
        const mappedVendorId = vendorMapCache.get(lastVendorId) || null;
        const mappedTeamMemberId = teamMemberMapCache.get(lastModifiedById) || fallbackTeamMemberId;

        const brandName = product.customFields?.custom7 || "";
        const skuGenerated = generateSku2Variant2V2GNoSpace(brandName, trimmedName, []);

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
          standardUomName: product.standardUomName?.trim() ? sanitizeUom(product.standardUomName) : "",
          purchasingUom: product.purchasingUom?.poUomName?.trim()
            ? {
                name: sanitizeUom(product.purchasingUom.poUomName),
                conversionRatio: {
                  standardQuantity: product.purchasingUom.poUomRatioStd || "1.0000",
                  uomQuantity: product.purchasingUom.poUomRatio || "1.0000",
                },
              }
            : null,
          salesUom: product.salesUom?.soUomName?.trim()
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
          categoryId: mappedCategoryId,
          lastVendorId: mappedVendorId,
          lastModifiedById: mappedTeamMemberId,
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

      match = await syncProduct(
        tx,
        payload,
        hasCoreProductData,
        brandCustomName,
        caches
      );

      if (!match?.inflowId || !location.inflowId) {
        results.push({
          productLocalId: String(product.productId),
          status: "skipped_not_found",
        });
        continue;
      }

      if (!match.isLocalSynced) {
        await tx.product.update({
          where: { inflowId: match.inflowId },
          data: { isLocalSynced: true },
        });
      }

      const localIdNum = Number(product.productId);
      let locationMap = await tx.productLocationMap.findUnique({
        where: {
          productId_locationId: {
            productId: match.inflowId,
            locationId: location.inflowId,
          },
        },
        select: { localId: true },
      });

      if (!locationMap) {
        locationMap = await tx.productLocationMap.create({
          data: {
            productId: match.inflowId,
            locationId: location.inflowId,
            localId: !isNaN(localIdNum) ? localIdNum : 0,
          },
          select: { localId: true },
        });
      }

      results.push({
        productLocalId: String(product.productId),
        productInflowId: match.inflowId,
        status: "synced",
      });

      processedCount++;
    }

    return { processedCount, results };
  }

  /**
   * Main Driver Method for Paged/Iterative Product syncs.
   */
  async sync(
    location: SyncLocation,
    options: SyncOptions,
    selectedRecords?: (string | number)[],
    syncedAll?: boolean,
    brandCustomName?: string,
    includes?: string[],
    after?: string
  ) {
    const { onProgress, checkSignal } = options;

    const EXCLUDED_INCLUDES = new Set(["coreData"]);
    const cleanIncludes = (includes ?? []).filter((item) => !EXCLUDED_INCLUDES.has(item));
    const hasImage = (includes ?? []).includes("image");
    const hasCoreProductData = (includes ?? []).includes("coreData");

    const BATCH_SIZE = options?.batchSize ?? (!hasImage ? 500 : 10);
    const INTER_BATCH_DELAY = options?.delayBetweenBatchesMs ?? 1000;

    let totalProcessed = 0;
    let hasMore = true;
    let currentAfter = after;
    let batchNo = 0;

    const allowedIds =
      !syncedAll && selectedRecords && selectedRecords.length > 0
        ? new Set(selectedRecords.map(String))
        : null;

    // Fetch defaults and all UOM codes once up-front
    const [defaultCategory, defaultTeamMember, dbUomRecords] = await Promise.all([
      prisma.category.findFirst({
        where: { isDefault: true },
        select: { inflowId: true },
      }),
      prisma.teamMember.findFirst({
        where: { isInternal: true },
        select: { inflowId: true },
      }),
      prisma.unitOfMeasure.findMany({ select: { code: true } }),
    ]);

    const uomCodes = dbUomRecords.map((u) => u.code.trim().toLowerCase()).filter(Boolean);
    const ALLOWED_UOM_SET = new Set(uomCodes.length > 0 ? uomCodes : ["cases", "pcs.", "ea.", "packs"]);

    const mapContext: MapContext = {
      location,
      hasImage,
      hasCoreProductData,
      brandCustomName,
      fallbackCategoryId: defaultCategory?.inflowId || null,
      fallbackTeamMemberId: defaultTeamMember?.inflowId || null,
      ALLOWED_UOM_SET,
      caches: {
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
      },
    };

    const syncResults: SyncResultItem[] = [];
    let lastProcessedAfter: string | undefined = undefined;

    console.log(`Starting product sync map (Batch Size: ${BATCH_SIZE}, Delay: ${INTER_BATCH_DELAY}ms)...`);

    while (hasMore) {
      if (checkSignal) await checkSignal();

      const rawBatch: LocalProduct[] = await getLocalBatchProducts(
        location.url,
        BATCH_SIZE,
        currentAfter,
        cleanIncludes
      );

      if (!rawBatch || rawBatch.length === 0) break;

      const newAfter = String(rawBatch[rawBatch.length - 1].productId);

      // Prevent infinite loop if API returns the exact same page cursor
      if (newAfter === lastProcessedAfter) {
        console.warn(`[Sync Warning] Cursor '${newAfter}' did not advance. Breaking pagination loop.`);
        break;
      }
      lastProcessedAfter = newAfter;
      currentAfter = newAfter;

      if (rawBatch.length < BATCH_SIZE) hasMore = false;

      let batch = rawBatch.filter((item) => parseBooleanFlag(item.isActive));
      if (allowedIds) {
        batch = batch.filter((item) => allowedIds.has(String(item.productId)));
      }

      if (batch.length === 0) {
        if (INTER_BATCH_DELAY > 0) await this.sleep(INTER_BATCH_DELAY);
        continue;
      }

      if (checkSignal) await checkSignal();

      // Execute transaction for current batch
      const { processedCount, results } = await prisma.$transaction(
        async (tx) => {
          return await this.map(tx, batch, mapContext, checkSignal);
        },
        { timeout: 60000 }
      );

      totalProcessed += processedCount;
      syncResults.push(...results);
      batchNo++;

      console.log(`Batch #${batchNo} completed. Processed ${totalProcessed} products.`);

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
}

const productService = new ProductSyncService();
export const localProductServiceSyncMap = productService.sync.bind(productService);

// import crypto from "crypto";
// import { prisma } from "@/lib/prisma";
// import { getLocalBatchProducts } from "../data/product-local";
// import { LocalProduct } from "../types";
// import { InflowProduct } from "@/lib/inflow/types";
// import { localProductItemType } from "@/helpers/product.helper";
// import { syncProduct } from "./product-sync";
// import { generateSku2Variant2V2GNoSpace } from "@/helpers/genSKU";
// import { parseBooleanFlag } from "@/helpers";

// type SyncOptions = {
//   onProgress?: (processedCount: number) => Promise<void>;
//   checkSignal?: () => Promise<void>;
//   batchSize?: number;
//   delayBetweenBatchesMs?: number;
// };

// type SyncLocation = {
//   inflowId: string;
//   name: string;
//   url: string;
// };

// type SyncResultItem = {
//   productLocalId: string;
//   productInflowId?: string;
//   status: "synced" | "skipped_not_found";
// };

// export class ProductSyncService {
//   private sleep(ms: number): Promise<void> {
//     return new Promise((resolve) => setTimeout(resolve, ms));
//   }

//   async resolveLocationMappedId(
//     localId: number | undefined,
//     cache: Map<number, string>,
//     fetcher: () => Promise<{ categoryId?: string; vendorId?: string; teamMemberId?: string } | null>,
//     keyField: 'categoryId' | 'vendorId' | 'teamMemberId'
//   ): Promise<string | null> {
//     if (!localId || isNaN(localId)) return null;
//     if (cache.has(localId)) return cache.get(localId)!;

//     const match = await fetcher();
//     const value = match?.[keyField] || null;
//     if (value) cache.set(localId, value);
//     return value;
//   }

//   async sync(
//     location: SyncLocation,
//     options: SyncOptions,
//     selectedRecords?: (string | number)[],
//     syncedAll?: boolean,
//     brandCustomName?: string,
//     includes?: string[],
//     after?: string,
//   ) {
//     const { onProgress, checkSignal } = options;
//     const hasImage = (includes ?? []).includes("image");
//     const hasCoreProductData = (includes ?? []).includes("coreData");

//     const BATCH_SIZE = options?.batchSize ?? (!hasImage ? 500 : 10);
//     const INTER_BATCH_DELAY = options?.delayBetweenBatchesMs ?? 1000;
//     const CLIENT_RETRIES = 1;

//     let totalProcessed = 0;
//     let hasMore = true;
//     let currentAfter = after;

//     const allowedIds =
//       !syncedAll && selectedRecords && selectedRecords.length > 0
//         ? new Set(selectedRecords.map(String))
//         : null;

//     // 1. Fetch defaults and all UOM codes from Database
//     const [defaultCategory, defaultTeamMember, dbUomRecords] = await Promise.all([
//       prisma.category.findFirst({
//         where: { isDefault: true },
//         select: { inflowId: true },
//       }),
//       prisma.teamMember.findFirst({
//         where: { isInternal: true },
//         select: { inflowId: true },
//       }),
//       prisma.unitOfMeasure.findMany({
//         select: { code: true },
//       }),
//     ]);

//     // 2. Map allowed UOM codes into a Set
//     const uomCodes = dbUomRecords.map((u) => u.code.trim().toLowerCase()).filter(Boolean);
//     const ALLOWED_UOM_SET = new Set(uomCodes.length > 0 ? uomCodes : ["cases", "pcs.", "ea.", "packs"]);

//     // 3. Helper function to validate & fallback UOM name
//     const sanitizeUom = (val?: string | null): string => {
//       const clean = val?.trim().toLowerCase();
//       return clean && ALLOWED_UOM_SET.has(clean) ? clean : "ea.";
//     };

//     const fallbackCategoryId = defaultCategory?.inflowId || null;
//     const fallbackTeamMemberId = defaultTeamMember?.inflowId || null;

//     const syncResults: SyncResultItem[] = [];

//     const caches = {
//       verifiedTeamMemberIds: new Set<string>(),
//       verifiedCategoryIds: new Set<string>(),
//       verifiedVendorIds: new Set<string>(),
//       verifiedLocationIds: new Set<string>(),
//       verifiedTaxingSchemes: new Set<string>(),
//       verifiedTaxCodes: new Set<string>(),
//       verifiedOperationTypes: new Set<string>(),
//       verifiedPricingSchemeIds: new Set<string>(),
//       verifiedProductIds: new Set<string>(),
//       verifiedBrands: new Map<string, string>(),
//     };

//     while (hasMore) {
//       if (checkSignal) await checkSignal();

//       const rawBatch: LocalProduct[] = await getLocalBatchProducts(
//         location.url,
//         BATCH_SIZE,
//         currentAfter,
//         includes,
//         CLIENT_RETRIES
//       );

//       if (!rawBatch || rawBatch.length === 0) break;

//       currentAfter = String(rawBatch[rawBatch.length - 1].productId);
//       if (rawBatch.length < BATCH_SIZE) hasMore = false;

//       let batch = rawBatch;
//       if (allowedIds) {
//         batch = batch.filter((item) => allowedIds.has(String(item.productId)));
//       }

//       if (batch.length === 0) continue;

//       if (checkSignal) await checkSignal();

//       const batchProcessedCount = await prisma.$transaction(
//         async (tx) => {
//           let batchProcessed = 0;

//           for (const product of batch) {
//             if (checkSignal) await checkSignal();

//             if (!parseBooleanFlag(product.isActive)) continue;

//             const trimmedName = product.name?.trim();
//             if (!trimmedName) {
//               syncResults.push({
//                 productLocalId: String(product.productId),
//                 status: "skipped_not_found",
//               });
//               continue;
//             }

//             let match = await tx.product.findFirst({
//               where: { name: trimmedName },
//               select: { inflowId: true, isLocalSynced: true },
//             });

//             const targetInflowId = match?.inflowId || crypto.randomUUID().toLowerCase();
//             const currentTimestamp = new Date().toISOString();

//             let payload: InflowProduct & { slug?: string };

//             if (!hasCoreProductData && hasImage) {
//               payload = {
//                 productId: targetInflowId,
//                 name: trimmedName,
//                 image: product.image,
//               } as InflowProduct;
//             } else {
//               const categoryLocalId = Number(product.categoryId);
//               const lastVendorId = Number(product.lastVendorId);
//               const lastModifiedById = Number(product.lastModifiedById);

//               const [categoryMap, vendorMap, teamMemberMap] = await Promise.all([
//                 product.categoryId && !isNaN(categoryLocalId)
//                   ? tx.categoryLocationMap.findFirst({
//                       where: { locationId: location.inflowId, localId: categoryLocalId },
//                       select: { categoryId: true },
//                     })
//                   : null,
//                 product.lastVendorId && !isNaN(lastVendorId)
//                   ? tx.vendorLocationMap.findFirst({
//                       where: { locationId: location.inflowId, localId: lastVendorId },
//                       select: { vendorId: true },
//                     })
//                   : null,
//                 product.lastModifiedById && !isNaN(lastModifiedById)
//                   ? tx.teamMemberLocationMapExtended.findFirst({
//                       where: { locationId: location.inflowId, localId: lastModifiedById },
//                       select: { teamMemberId: true },
//                     })
//                   : null,
//               ]);

//               const brandName = product.customFields?.custom7 || "";
//               const skuGenerated = generateSku2Variant2V2GNoSpace(brandName, trimmedName, []);

//               payload = {
//                 productId: targetInflowId,
//                 sku: skuGenerated,
//                 name: trimmedName,
//                 description: product.description ?? null,
//                 itemType: localProductItemType(product.itemType),
//                 autoAssemble: parseBooleanFlag(product.autoAssemble),
//                 isActive: parseBooleanFlag(product.isActive),
//                 isManufacturable: parseBooleanFlag(product.isManufacturable),
//                 includeQuantityBuildable: parseBooleanFlag(product.includeQuantityBuildable),
//                 standardUomName: product.standardUomName && product.standardUomName.trim() !== "" ? sanitizeUom(product.standardUomName) : "",
//                 purchasingUom: product.purchasingUom && product.purchasingUom.poUomName.trim()  !== ""
//                   ? {
//                       name: sanitizeUom(product.purchasingUom.poUomName),
//                       conversionRatio: {
//                         standardQuantity: product.purchasingUom.poUomRatioStd || "1.0000",
//                         uomQuantity: product.purchasingUom.poUomRatio || "1.0000",
//                       },
//                     }
//                   : null,
//                 salesUom: product.salesUom && product.salesUom.soUomName.trim() !== ""
//                   ? {
//                       name: sanitizeUom(product.salesUom.soUomName),
//                       conversionRatio: {
//                         standardQuantity: product.salesUom.soUomRatioStd || "1.0000",
//                         uomQuantity: product.salesUom.soUomRatio || "1.0000",
//                       },
//                     }
//                   : null,
//                 trackExpiry: parseBooleanFlag(product.trackExpiry),
//                 trackLots: parseBooleanFlag(product.trackLots),
//                 trackSerials: parseBooleanFlag(product.trackSerials),
//                 shelfLifeDays: product.shelfLifeDays ?? null,
//                 sellBeforeExpiryDays: product.sellBeforeExpiryDays ?? null,
//                 expiryNotificationDays: product.expiryNotificationDays ?? null,
//                 weight: product.weight != null ? String(product.weight) : null,
//                 width: product.width != null ? String(product.width) : null,
//                 height: product.height != null ? String(product.height) : null,
//                 length: product.length != null ? String(product.length) : null,
//                 originCountry: product.originCountry || null,
//                 hsTariffNumber: product.hsTariffNumber || null,
//                 remarks: product.remarks || null,
//                 categoryId: categoryMap?.categoryId || fallbackCategoryId,
//                 lastVendorId: vendorMap?.vendorId || null,
//                 lastModifiedById: teamMemberMap?.teamMemberId || fallbackTeamMemberId,
//                 createdDttm: currentTimestamp,
//                 lastModifiedDateTime: product.lastModifiedDateTime || currentTimestamp,
//                 timestamp: currentTimestamp,
//                 customFields: product.customFields,
//                 productBarcodes: product.barcode?.trim()
//                   ? [
//                       {
//                         productBarcodeId: crypto.randomUUID().toLowerCase(),
//                         barcode: product.barcode.trim(),
//                         lineNum: 1,
//                         productId: targetInflowId,
//                         timestamp: currentTimestamp,
//                       },
//                     ]
//                   : [],
//                 prices: (product.prices ?? []).map((p) => ({
//                   productPriceId: crypto.randomUUID().toLowerCase(),
//                   productId: targetInflowId,
//                   pricingSchemeId: String(p.pricingSchemeId),
//                   priceType: p.priceType || "FixedPrice",
//                   fixedMarkup: p.fixedMarkup != null ? String(p.fixedMarkup) : null,
//                   unitPrice: String(p.unitPrice ?? 0),
//                   timestamp: currentTimestamp,
//                 })),
//                 itemBoms: product.itemBoms || [],
//                 attachments: product.attachments || [],
//                 image: hasImage ? product.image : undefined,
//               } as InflowProduct;
//             }

//             match = await syncProduct(
//               tx,
//               payload,
//               undefined,
//               undefined,
//               hasCoreProductData,
//               brandCustomName,
//               caches
//             );

//             if (!match?.inflowId || !location.inflowId) {
//               syncResults.push({
//                 productLocalId: String(product.productId),
//                 status: "skipped_not_found",
//               });
//               continue;
//             }

//             const localIdNum = Number(product.productId);
//             const validLocalId = !isNaN(localIdNum) ? localIdNum : 0;

//             await tx.productLocationMap.upsert({
//               where: {
//                 productId_locationId: {
//                   productId: match.inflowId,
//                   locationId: location.inflowId,
//                 },
//               },
//               create: {
//                 productId: match.inflowId,
//                 locationId: location.inflowId,
//                 localId: validLocalId,
//               },
//               update: {
//                 localId: validLocalId,
//               },
//             });

//             if (!match.isLocalSynced) {
//               await tx.product.update({
//                 where: { inflowId: match.inflowId },
//                 data: { isLocalSynced: true },
//               });
//             }

//             syncResults.push({
//               productLocalId: String(product.productId),
//               productInflowId: match.inflowId,
//               status: "synced",
//             });

//             batchProcessed++;
//           }

//           return batchProcessed;
//         },
//         { timeout: 60000 }
//       );

//       totalProcessed += batchProcessedCount;

//       if (onProgress) await onProgress(totalProcessed);
//       if (checkSignal) await checkSignal();

//       if (INTER_BATCH_DELAY > 0) {
//         await this.sleep(INTER_BATCH_DELAY);
//       }
//     }

//     return {
//       productsProcessed: totalProcessed,
//       syncedAt: new Date().toISOString(),
//       results: syncResults,
//     };
//   }

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
// }

