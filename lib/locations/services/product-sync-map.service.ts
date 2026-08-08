// lib/locations/services/product-sync-map.service.ts

import { prisma } from "@/lib/prisma";
import { getLocalProducts } from "../data/product-local"; // Assumed data fetcher matching your pattern
import crypto from "crypto";
import { LocalProduct, SyncOptions } from "../types";
import { InflowProduct } from "@/lib/inflow/types";
import { localProductItemType } from "@/helpers/product.helper";
import { syncProduct } from "./product-sync";

export class ProductSyncMapService {
  

  async sync(
    location: {
      inflowId: string;
      name: string;
      url: string;
    },
    options: SyncOptions,
    selectedRecords?: any[],
    syncedAll?: boolean,
  ) {
    const { onProgress } = options;

    // Fetch local products from the location endpoint
    let products: LocalProduct[] = await getLocalProducts(location.url);

    if (!syncedAll && selectedRecords && selectedRecords.length > 0) {
      const allowedIds = selectedRecords.map((item) => String(item.id ?? item.productId));
      products = products.filter((data) =>
        allowedIds.includes(String(data.productId))
      );
    }

    let processed = 0;

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
  

    const syncResults: Array<{
      productLocalId: string;
      productInflowId?: string;
      status: "synced" | "skipped_not_found";
    }> = [];

    await prisma.$transaction(
      async (tx) => {
        /**
         * Step 1: Query global availability by name (or sku), or upsert inline using transaction client
         */
        const existingProducts = await Promise.all(
          products.map(async (product) => {
            // Find global product that matches by name or barcode/sku
            let match = await tx.product.findFirst({
              where: {
                OR: [
                  { name: product.name },
                  ...(product.barcode ? [{ sku: product.barcode }] : []),
                ],
              },
              select: { inflowId: true },
            });

            if (!match) {
              const generatedInflowId = crypto.randomUUID().toLowerCase();
              const currentTimestamp = new Date().toISOString();

              const [taxingScheme, category] = await Promise.all([
                product.taxingSchemeId
                  ? tx.taxingSchemeLocationMap.findFirst({
                      where: { locationId: location.inflowId, localId: Number(product.taxingSchemeId) },
                      select: { taxingSchemeId: true }
                    })
                  : null,
                product.categoryId
                  ? tx.categoryLocationMap.findFirst({
                      where: { locationId: location.inflowId, localId: Number(product.categoryId) },
                      select: { categoryId: true }
                    })
                  : null,
              ]);
             
              const payload: InflowProduct = {
                productId: generatedInflowId,
                sku: product.barcode || `SKU-${product.productId}`,
                name: product.name,
                description: product.description ?? null,
                itemType: localProductItemType(product.itemType),
                autoAssemble: Boolean(product.autoAssemble),
                isActive: Number(product.isActive) === 1,
                isManufacturable: Boolean(product.isManufacturable),
                includeQuantityBuildable: Boolean(product.includeQuantityBuildable),
                standardUomName: product.standardUomName || null,

                trackExpiry: Boolean(product.trackExpiry),
                trackLots: Boolean(product.trackLots),
                trackSerials: Boolean(product.trackSerials),

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
                categoryId: category?.categoryId ?? null, //categoryInflowId || "",
                lastVendorId: null, //lastVendorInflowId,
                lastModifiedById: null, //lastModifiedByInflowId,
                createdDttm: currentTimestamp,
                lastModifiedDateTime: product.lastModifiedDateTime || currentTimestamp,
                timestamp: currentTimestamp,

                // Purchasing UOM mapping
                purchasingUom: product.purchasingUom
                  ? {
                      name: product.purchasingUom.poUomName || "",
                      conversionRatio: {
                        standardQuantity: product.purchasingUom.poUomRatioStd || "1.0000",
                        uomQuantity: product.purchasingUom.poUomRatio || "1.0000",
                      },
                    }
                  : null,

                // Sales UOM mapping
                salesUom: product.salesUom
                  ? {
                      name: product.salesUom.soUomName || "",
                      conversionRatio: {
                        standardQuantity: product.salesUom.soUomRatioStd || "1.0000",
                        uomQuantity: product.salesUom.soUomRatio || "1.0000",
                      },
                    }
                  : null,

                // Custom Fields mapping
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

                // Product Barcodes Array
                productBarcodes: product.barcode
                  ? [
                      {
                        productBarcodeId: crypto.randomUUID().toLowerCase(),
                        barcode: product.barcode,
                        lineNum: 1,
                        productId: generatedInflowId,
                        timestamp: currentTimestamp,
                      },
                    ]
                  : [],

                // Product Prices Array
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

                // Arrays & Optional Structural Objects
                images: [],
                inventoryLines: [],
                productVariant: undefined as any, // Assign or leave undefined as needed
                itemBoms: product.itemBoms || [],
                attachments: product.attachments || [],
                taxCodes: [],
                reorderSettings: [],
                productOperations: [],
                cost: product.cost ? {
                  productCostId: crypto.randomUUID().toLowerCase(),
                  productId: generatedInflowId,
                  cost: product.cost,
                } : undefined,
              };

              // Pass the transaction client context down to avoid connection fragmentation
              match = await syncProduct(
                tx,
                payload,
                undefined,
                undefined,
                true,
                "custom7",
                caches
              );
            }

            return { incoming: product, existing: match };
          })
        );

        // Filter down to products successfully resolved globally
        const validProducts = existingProducts.filter(
          (p) => p.existing !== null
        );

        /**
         * Step 2: Bridge connection inside ProductLocationMap
         */
        const mappingPromises = validProducts.map(
          async ({ incoming, existing }) => {
            // Check if a mapping record already exists for this location
            let locationMap = await tx.productLocationMap.findUnique({
              where: {
                productId_locationId: {
                  productId: existing!.inflowId,
                  locationId: location.inflowId,
                },
              },
              select: { localId: true },
            });

            // If mapping link doesn't exist, generate the database row
            if (!locationMap) {
              locationMap = await tx.productLocationMap.create({
                data: {
                  productId: existing!.inflowId,
                  locationId: location.inflowId,
                  localId: Number(incoming.productId),
                },
                select: { localId: true },
              });
            }

            syncResults.push({
              productLocalId: incoming.productId,
              productInflowId: existing!.inflowId,
              status: "synced",
            });
          }
        );

        await Promise.all(mappingPromises);
        processed = validProducts.length;
      },
      {
        timeout: 30000,
      }
    );

    if (onProgress) {
      await onProgress(processed);
    }

    return {
      productsProcessed: processed,
      syncedAt: new Date().toISOString(),
      results: syncResults,
    };
  }
}