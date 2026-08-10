import { prisma } from "@/lib/prisma";
import { getLocalBatchProducts } from "../data/product-local";
import crypto from "crypto";
import { LocalProduct } from "../types";
import { InflowProduct } from "@/lib/inflow/types";
import { localProductItemType } from "@/helpers/product.helper";
import { syncProduct } from "./product-sync";

/**
 * Helper to safely convert string/numeric flags or booleans
 */
function parseBooleanFlag(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") return value === "1" || value.toLowerCase() === "true";
  return false;
}

/**
 * Helper to generate URL-safe product slugs
 */
function generateSlug(name: string, fallbackId: string): string {
  const baseSlug = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return baseSlug || `product-${fallbackId}`;
}

type SyncOptions = {
  onProgress?: (processedCount: number) => Promise<void>;
  checkSignal?: () => Promise<void>;
  batchSize?: number;
  delayBetweenBatchesMs?: number;
};

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
    brandCustomName?: string,
    after: string | undefined = undefined
  ) {
    const { onProgress, checkSignal } = options;
    // higher batch size
    const BATCH_SIZE = options?.batchSize ?? 100; 
    const INTER_BATCH_DELAY = options?.delayBetweenBatchesMs ?? 300;
    const CLIENT_RETRIES = 1;

    let totalProcessed = 0;
    let hasMore = true;

    const allowedIds =
      !syncedAll && selectedRecords && selectedRecords.length > 0
        ? new Set(selectedRecords.map((item) => String(item.id ?? item.productId)))
        : null;

    const syncResults: Array<{
      productLocalId: string;
      productInflowId?: string;
      status: "synced" | "skipped_not_found";
    }> = [];

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
    };

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

            const trimmedName = product.name?.trim();
            if (!trimmedName) {
              syncResults.push({
                productLocalId: String(product.productId),
                status: "skipped_not_found",
              });
              continue;
            }

            // 1. Check existing match by name
            let match = await tx.product.findFirst({
              where: { name: trimmedName },
              select: { inflowId: true },
            });

            // 2. If no match exists, prepare payload & invoke syncProduct
            if (!match) {
              const generatedInflowId = crypto.randomUUID().toLowerCase();
              const currentTimestamp = new Date().toISOString();

              const taxingSchemeLocalId = Number(product.taxingSchemeId);
              const categoryLocalId = Number(product.categoryId);

              const [taxingScheme, category] = await Promise.all([
                !isNaN(taxingSchemeLocalId) && product.taxingSchemeId != null
                  ? tx.taxingSchemeLocationMap.findFirst({
                      where: {
                        locationId: location.inflowId,
                        localId: taxingSchemeLocalId,
                      },
                      select: { taxingSchemeId: true },
                    })
                  : null,
                !isNaN(categoryLocalId) && product.categoryId != null
                  ? tx.categoryLocationMap.findFirst({
                      where: {
                        locationId: location.inflowId,
                        localId: categoryLocalId,
                      },
                      select: { categoryId: true },
                    })
                  : null,
              ]);

              const productSku =
                product.barcode?.trim() || `SKU-${product.productId}`;
              const productSlug = `${generateSlug(trimmedName, String(product.productId))}-${generatedInflowId.slice(0, 8)}`;

              const payload: InflowProduct & { slug?: string } = {
                productId: generatedInflowId,
                sku: "",
                // slug: productSlug,
                name: trimmedName,
                description: product.description ?? null,
                itemType: localProductItemType(product.itemType),
                autoAssemble: parseBooleanFlag(product.autoAssemble),
                isActive: parseBooleanFlag(product.isActive),
                isManufacturable: parseBooleanFlag(product.isManufacturable),
                includeQuantityBuildable: parseBooleanFlag(product.includeQuantityBuildable),
                standardUomName: product.standardUomName || null,

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
                categoryId: category?.categoryId ?? null,
                lastVendorId: null,
                lastModifiedById: null,
                createdDttm: currentTimestamp,
                lastModifiedDateTime: product.lastModifiedDateTime || currentTimestamp,
                timestamp: currentTimestamp,

                purchasingUom: product.purchasingUom
                  ? {
                      name: product.purchasingUom.poUomName || "",
                      conversionRatio: {
                        standardQuantity: product.purchasingUom.poUomRatioStd || "1.0000",
                        uomQuantity: product.purchasingUom.poUomRatio || "1.0000",
                      },
                    }
                  : null,

                salesUom: product.salesUom
                  ? {
                      name: product.salesUom.soUomName || "",
                      conversionRatio: {
                        standardQuantity: product.salesUom.soUomRatioStd || "1.0000",
                        uomQuantity: product.salesUom.soUomRatio || "1.0000",
                      },
                    }
                  : null,

                customFields: {
                  custom1: product.customFields?.custom1 || undefined,
                  custom2: product.customFields?.custom2 || undefined,
                  custom3: product.customFields?.custom3 || undefined,
                  custom4: product.customFields?.custom4 || undefined,
                  custom5: product.customFields?.custom5 || undefined,
                  custom6: product.customFields?.custom6 || undefined,
                  custom7: product.customFields?.custom7 || undefined,
                  custom8: product.customFields?.custom8 || undefined,
                  custom9: product.customFields?.custom9 || undefined,
                  custom10: product.customFields?.custom10 || undefined,
                },

                productBarcodes: product.barcode?.trim()
                  ? [
                      {
                        productBarcodeId: crypto.randomUUID().toLowerCase(),
                        barcode: product.barcode.trim(),
                        lineNum: 1,
                        productId: generatedInflowId,
                        timestamp: currentTimestamp,
                      },
                    ]
                  : [],

                prices: product.prices
                  ? product.prices.map((p) => ({
                      productPriceId: crypto.randomUUID().toLowerCase(),
                      productId: generatedInflowId,
                      pricingSchemeId: String(p.pricingSchemeId),
                      priceType: p.priceType || "FixedPrice",
                      fixedMarkup: p.fixedMarkup != null ? String(p.fixedMarkup) : null,
                      unitPrice: String(p.unitPrice ?? 0),
                      timestamp: currentTimestamp,
                    }))
                  : [],

                images: [],
                inventoryLines: [],
                productVariant: undefined as any,
                itemBoms: product.itemBoms || [],
                attachments: product.attachments || [],
                taxCodes: [],
                reorderSettings: [],
                productOperations: [],
                cost: product.cost
                  ? {
                      productCostId: crypto.randomUUID().toLowerCase(),
                      productId: generatedInflowId,
                      cost: String(product.cost),
                    }
                  : undefined,
              };

              match = await syncProduct(
                tx,
                payload,
                undefined,
                undefined,
                true,
                brandCustomName,
                caches
              );
            }

            if (!match?.inflowId) {
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

//                   purchasingUom: product.purchasingUom
//                     ? {
//                         name: product.purchasingUom.poUomName || "",
//                         conversionRatio: {
//                           standardQuantity: product.purchasingUom.poUomRatioStd || "1.0000",
//                           uomQuantity: product.purchasingUom.poUomRatio || "1.0000",
//                         },
//                       }
//                     : null,

//                   salesUom: product.salesUom
//                     ? {
//                         name: product.salesUom.soUomName || "",
//                         conversionRatio: {
//                           standardQuantity: product.salesUom.soUomRatioStd || "1.0000",
//                           uomQuantity: product.salesUom.soUomRatio || "1.0000",
//                         },
//                       }
//                     : null,

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