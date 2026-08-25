import { prisma } from "@/lib/prisma";
import { getLocalBatchProducts } from "../data/product-local";
import { LocalProduct } from "../types";
import { InflowCustomFields, InflowProduct } from "@/lib/inflow/types";
import { Prisma } from "@/generated/prisma/client";
import { SyncOptions } from "@/lib/workers/types";
import { parseBooleanFlag } from "@/helpers";

type LocalProductWithRelations = Prisma.ProductGetPayload<{
  include: {
    brand: true;
    category: true;
    prices: true;
    salesUom: { 
      include: { uom: true }
    };
    purchasingUom:  { 
      include: { uom: true }
    };
  };
}>;

/**
 * Core Payload Transformer
 * Converts a raw local product record (with Prisma relations) to the structured InflowProduct payload.
 * Map bin sublocation linkedLocationId to inventoryLines.locationId.
 */
export async function mapLocalToInflowPayload(
  product: LocalProductWithRelations,
  brandCustomName?: string,
  currentTimestamp: string = new Date().toISOString(),
  lastModifiedById: string = "8ff3e71d-eb02-425d-8e0f-00a69fc8e482",
): Promise<InflowProduct & { isCloudSynced: boolean }> {
  const trimmedName = product.name?.trim() || "";

  // 1. Build Custom Fields (Brand dynamics)
  const existingCustomFields = (product.customFields as Record<string, string>) || {};
  const customFields: InflowCustomFields = { ...existingCustomFields };

  const brandName = product.brand?.name;
  if (brandName) {
    if (brandCustomName) {
      customFields[brandCustomName as keyof InflowCustomFields] = brandName;
    } else {
      customFields.custom7 = brandName;
    }
  }

  let setCategoryId: string | null = product.categoryId;

  if (!product.categoryId) {
    const defaultCategory = await prisma.category.findFirst({
      where: { isDefault: true },
    });
    setCategoryId = defaultCategory?.inflowId || null;
  }

  // 3. Map final payload
  return {
    productId: product.inflowId,
    isCloudSynced: product.isCloudSynced,
    sku: product.sku,
    name: trimmedName,
    description: product.description,
    itemType: product.itemType || "stockedProduct",
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

    weight: product.weight?.toString() || null,
    width: product.width?.toString() || null,
    height: product.height?.toString() || null,
    length: product.length?.toString() || null,

    originCountry: product.originCountry,
    hsTariffNumber: product.hsTariffNumber,
    remarks: product.remarks,
    categoryId: setCategoryId,
    lastVendorId: product.lastVendorId,
    lastModifiedById,
    createdDttm: product.createdAt.toISOString(),
    lastModifiedDateTime: product.updatedAt.toISOString(),
    purchasingUom: product.purchasingUom?.uom.name
      ? {
          name: product.purchasingUom.uom.name || "",
          conversionRatio: {
            standardQuantity: String(product.purchasingUom.standardQuantity) || "1.0000",
            uomQuantity: String(product.purchasingUom.uomQuantity) || "1.0000",
          },
        }
      : null,
    salesUom: product.salesUom?.uom.name
      ? {
          name: product.salesUom.uom.name || "",
          conversionRatio: {
            standardQuantity: String(product.salesUom.standardQuantity) || "1.0000",
            uomQuantity: String(product.salesUom.uomQuantity) || "1.0000",
          },
        }
      : null,
    customFields,
    images: [],
    inventoryLines: [],
    prices: product.prices.map((p) => ({
      productPriceId: p.inflowId,
      pricingSchemeId: p.pricingSchemeId,
      productId: p.productId,
      priceType: p.priceType,
      unitPrice: p.unitPrice?.toString() || "0",
      fixedMarkup: p.fixedMarkup?.toString() || "0",
    })),
  };
}

export class ProductSyncMapService {
  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async sync(
    location: {
      inflowId: string;
      name: string;
      url: string;
    },
    options: SyncOptions,
    selectedRecords?: any[],
    syncedAll?: boolean,
    after: string | undefined = undefined
  ) {
    const { onProgress, checkSignal } = options;
    // higher batch size
    const BATCH_SIZE = options?.batchSize ?? 500; 
    const INTER_BATCH_DELAY = options?.delayBetweenBatchesMs ?? 300;
    const CLIENT_RETRIES = 1;

    let totalProcessed = 0;
    let hasMore = true;

    const allowedIds =
      !syncedAll && selectedRecords && selectedRecords.length > 0
        ? new Set(selectedRecords.map((id) => String(id)))
        : null;

    const syncResults: Array<{
      productLocalId: string;
      productInflowId?: string;
      status: "synced" | "skipped_not_found";
    }> = [];

    console.log(`Starting optimized product sync map (Batch Size: ${BATCH_SIZE}, Throttle: ${INTER_BATCH_DELAY}ms)...`);
    let batchNo = 0;

    while (hasMore) {
      if (checkSignal) await checkSignal();

      const rawBatch: LocalProduct[] = await getLocalBatchProducts(
        location.url,
        BATCH_SIZE,
        after,
        [],
        CLIENT_RETRIES
      );

      if (!rawBatch || rawBatch.length === 0) break;

      after = String(rawBatch[rawBatch.length - 1].productId);
      if (rawBatch.length < BATCH_SIZE) hasMore = false;

      let batch = rawBatch;
      if (allowedIds) {
        batch = batch.filter((item) => allowedIds.has(String(item.productId)));
      }

      if (batch.length === 0) continue;

      if (checkSignal) await checkSignal();

      // Execute transactional batch process sequentially to avoid deadlocks
      const batchProcessedCount = await prisma.$transaction(
        async (tx) => {
          let batchProcessed = 0;

          for (const product of batch) {
            if (checkSignal) await checkSignal();

            // skip inactive products
            if (!parseBooleanFlag(product.isActive)) {
              continue;
            }

            const trimmedName = product.name?.trim();
            if (!trimmedName) {
              syncResults.push({
                productLocalId: String(product.productId),
                status: "skipped_not_found",
              });
              continue;
            }

            const match = await tx.product.findFirst({
              where: { name: trimmedName },
              select: { inflowId: true, isLocalSynced: true },
            });

            if (!match?.inflowId || !location.inflowId) {
              syncResults.push({
                productLocalId: String(product.productId),
                status: "skipped_not_found",
              });
              continue;
            }

            // 3. Bridge mapping record
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

            syncResults.push({
              productLocalId: String(product.productId),
              productInflowId: match.inflowId,
              status: "synced",
            });
            
            console.log(`Product mapped: #${match.inflowId} completed.`);
            batchProcessed++;
          }

          return batchProcessed;
        },
        { timeout: 60000 }
      );

      totalProcessed += batchProcessedCount;
      batchNo++;

      console.log(`Batch #${batchNo} completed. Processed ${totalProcessed} products. `);

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

const productService = new ProductSyncMapService();
export const localProductServiceMap = productService.sync.bind(productService);

// import { prisma } from "@/lib/prisma";
// import { getLocalBatchProducts } from "../data/product-local";
// import crypto from "crypto";
// import { LocalProduct, SyncOptions } from "../types";
// import { InflowProduct } from "@/lib/inflow/types";
// import { localProductItemType } from "@/helpers/product.helper";
// import { syncProduct } from "./product-sync";

// export class ProductSyncMapService {
//   // Utility delay method for rate-limiting loop iterations
//   private sleep(ms: number) {
//     return new Promise((resolve) => setTimeout(resolve, ms));
//   }

//   async sync(
//     location: {
//       inflowId: string;
//       name: string;
//       url: string;
//     },
//     options: SyncOptions,
//     selectedRecords?: any[],
//     syncedAll?: boolean,
//     brandCustomName?: string, 
//     after: string | undefined = undefined
//   ) {
//     const { onProgress, checkSignal } = options;
//     const BATCH_SIZE = options?.batchSize ?? 30;
//     const INTER_BATCH_DELAY = options?.delayBetweenBatchesMs ?? 300;

//     let totalProcessed = 0;
//     let hasMore = true;

//     // Build the filtering Set ONLY if syncedAll is NOT true and selectedRecords exist
//     const allowedIds =
//       !syncedAll && selectedRecords && selectedRecords.length > 0
//         ? new Set(selectedRecords.map((item) => String(item.id ?? item.productId)))
//         : null;

//     const syncResults: Array<{
//       productLocalId: string;
//       productInflowId?: string;
//       status: "synced" | "skipped_not_found";
//     }> = [];

//     // Shared verification cache across batches to avoid redundant lookups
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
//     };

//     console.log(`Starting optimized product sync map (Batch Size: ${BATCH_SIZE}, Throttle: ${INTER_BATCH_DELAY}ms)...`);
//     let batchNo = 0;

//     while (hasMore) {
//       // 1. Check for cancellation before calling local endpoint API
//       if (checkSignal) {
//         await checkSignal();
//       }

//       // Fetch current batch from local endpoint
//       const rawBatch: LocalProduct[] = await getLocalBatchProducts(
//         location.url,
//         BATCH_SIZE,
//         after
//       );

//       if (!rawBatch || rawBatch.length === 0) {
//         break;
//       }

//       // Track cursor for pagination
//       after = String(rawBatch[rawBatch.length - 1].productId);
//       if (rawBatch.length < BATCH_SIZE) {
//         hasMore = false;
//       }

//       // Filter by selected records unless syncedAll is true
//       let batch = rawBatch;
//       if (allowedIds) {
//         batch = batch.filter((item) => allowedIds.has(String(item.productId)));
//       }

//       if (batch.length === 0) {
//         continue;
//       }

//       // 2. Check for cancellation before starting heavy database transaction
//       if (checkSignal) {
//         await checkSignal();
//       }

//       // 3. Execute transactional batch process
//       const batchProcessedCount = await prisma.$transaction(
//         async (tx) => {
//           let batchProcessed = 0;

//           // Step 1: Query global availability & sync missing products
//           const existingProducts = await Promise.all(
//             batch.map(async (product) => {
//               // Check cancellation inside parallel item iterations
//               if (checkSignal) {
//                 await checkSignal();
//               }

//               let match = await tx.product.findFirst({
//                 where: {
//                   name: product.name.trim()
//                 },
//                 select: { inflowId: true },
//               });

//               if (!match) {
//                 const generatedInflowId = crypto.randomUUID().toLowerCase();
//                 const currentTimestamp = new Date().toISOString();

//                 const [taxingScheme, category] = await Promise.all([
//                   product.taxingSchemeId
//                     ? tx.taxingSchemeLocationMap.findFirst({
//                         where: {
//                           locationId: location.inflowId,
//                           localId: Number(product.taxingSchemeId),
//                         },
//                         select: { taxingSchemeId: true },
//                       })
//                     : null,
//                   product.categoryId
//                     ? tx.categoryLocationMap.findFirst({
//                         where: {
//                           locationId: location.inflowId,
//                           localId: Number(product.categoryId),
//                         },
//                         select: { categoryId: true },
//                       })
//                     : null,
//                 ]);

//                 const payload: InflowProduct = {
//                   productId: generatedInflowId,
//                   sku: null,
//                   name: product.name,
//                   description: product.description ?? null,
//                   itemType: localProductItemType(product.itemType),
//                   autoAssemble: Boolean(product.autoAssemble),
//                   isActive: Number(product.isActive) === 1,
//                   isManufacturable: Boolean(product.isManufacturable),
//                   includeQuantityBuildable: Boolean(product.includeQuantityBuildable),
//                   standardUomName: product.standardUomName || null,

//                   trackExpiry: Boolean(product.trackExpiry),
//                   trackLots: Boolean(product.trackLots),
//                   trackSerials: product.trackSerials === true || Number(product.trackSerials) === 1,

//                   shelfLifeDays: product.shelfLifeDays ?? null,
//                   sellBeforeExpiryDays: product.sellBeforeExpiryDays ?? null,
//                   expiryNotificationDays: product.expiryNotificationDays ?? null,

//                   weight: product.weight != null ? String(product.weight) : null,
//                   width: product.width != null ? String(product.width) : null,
//                   height: product.height != null ? String(product.height) : null,
//                   length: product.length != null ? String(product.length) : null,

//                   originCountry: product.originCountry || null,
//                   hsTariffNumber: product.hsTariffNumber || null,
//                   remarks: product.remarks || null,
//                   categoryId: category?.categoryId ?? null,
//                   lastVendorId: null,
//                   lastModifiedById: null,
//                   createdDttm: currentTimestamp,
//                   lastModifiedDateTime: product.lastModifiedDateTime || currentTimestamp,
//                   timestamp: currentTimestamp,

                  // purchasingUom: product.purchasingUom
                  //   ? {
                  //       name: product.purchasingUom.poUomName || "",
                  //       conversionRatio: {
                  //         standardQuantity: product.purchasingUom.poUomRatioStd || "1.0000",
                  //         uomQuantity: product.purchasingUom.poUomRatio || "1.0000",
                  //       },
                  //     }
                  //   : null,

                  // salesUom: product.salesUom
                  //   ? {
                  //       name: product.salesUom.soUomName || "",
                  //       conversionRatio: {
                  //         standardQuantity: product.salesUom.soUomRatioStd || "1.0000",
                  //         uomQuantity: product.salesUom.soUomRatio || "1.0000",
                  //       },
                  //     }
                  //   : null,

//                   customFields: {
//                     custom1: product.customFields?.custom1 || undefined,
//                     custom2: product.customFields?.custom2 || undefined,
//                     custom3: product.customFields?.custom3 || undefined,
//                     custom4: product.customFields?.custom4 || undefined,
//                     custom5: product.customFields?.custom5 || undefined,
//                     custom6: product.customFields?.custom6 || undefined,
//                     custom7: product.customFields?.custom7 || undefined,
//                     custom8: product.customFields?.custom8 || undefined,
//                     custom9: product.customFields?.custom9 || undefined,
//                     custom10: product.customFields?.custom10 || undefined,
//                   },

//                   productBarcodes: product.barcode
//                     ? [
//                         {
//                           productBarcodeId: crypto.randomUUID().toLowerCase(),
//                           barcode: product.barcode,
//                           lineNum: 1,
//                           productId: generatedInflowId,
//                           timestamp: currentTimestamp,
//                         },
//                       ]
//                     : [],

//                   prices: product.prices
//                     ? product.prices.map((p) => ({
//                         productPriceId: crypto.randomUUID().toLowerCase(),
//                         productId: generatedInflowId,
//                         pricingSchemeId: String(p.pricingSchemeId),
//                         priceType: p.priceType || "FixedPrice",
//                         fixedMarkup: p.fixedMarkup != null ? String(p.fixedMarkup) : null,
//                         unitPrice: String(p.unitPrice ?? 0),
//                         timestamp: currentTimestamp,
//                       }))
//                     : [],

//                   images: [],
//                   inventoryLines: [],
//                   productVariant: undefined as any,
//                   itemBoms: product.itemBoms || [],
//                   attachments: product.attachments || [],
//                   taxCodes: [],
//                   reorderSettings: [],
//                   productOperations: [],
//                   cost: product.cost
//                     ? {
//                         productCostId: crypto.randomUUID().toLowerCase(),
//                         productId: generatedInflowId,
//                         cost: product.cost,
//                       }
//                     : undefined,
//                 };

//                 match = await syncProduct(
//                   tx,
//                   payload,
//                   undefined,
//                   undefined,
//                   true,
//                   caches
//                 );
//               }

//               return { incoming: product, existing: match };
//             })
//           );

//           const validProducts = existingProducts.filter(
//             (p) => p.existing !== null
//           );

//           // Step 2: Bridge connection inside ProductLocationMap
//           await Promise.all(
//             validProducts.map(async ({ incoming, existing }) => {
//               let locationMap = await tx.productLocationMap.findUnique({
//                 where: {
//                   productId_locationId: {
//                     productId: existing!.inflowId,
//                     locationId: location.inflowId,
//                   },
//                 },
//                 select: { localId: true },
//               });

//               if (!locationMap) {
//                 locationMap = await tx.productLocationMap.create({
//                   data: {
//                     productId: existing!.inflowId,
//                     locationId: location.inflowId,
//                     localId: Number(incoming.productId),
//                   },
//                   select: { localId: true },
//                 });
//               }

//               syncResults.push({
//                 productLocalId: String(incoming.productId),
//                 productInflowId: existing!.inflowId,
//                 status: "synced",
//               });
//             })
//           );

//           batchProcessed = validProducts.length;
//           return batchProcessed;
//         },
//         { timeout: 40000 }
//       );

//       // Update progress metrics
//       totalProcessed += batchProcessedCount;
//       batchNo++;

//       console.log(`Batch #${batchNo} completed. Processed ${totalProcessed} products.`);
      
//       if (onProgress) {
//         await onProgress(totalProcessed);
//       }

//       // 4. Check for cancellation before pacing delay
//       if (checkSignal) {
//         await checkSignal();
//       }

//       // Pace out requests to eliminate rate limit issues
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
// }