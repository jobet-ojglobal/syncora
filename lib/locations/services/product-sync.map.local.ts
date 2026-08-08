import { prisma } from "@/lib/prisma";
import { getLocalBatchProducts } from "../data/product-local";
import crypto from "crypto";
import { LocalProduct, SyncOptions } from "../types";
import { InflowProduct } from "@/lib/inflow/types";
import { localProductItemType } from "@/helpers/product.helper";
import { syncProduct } from "./product-sync";
import { Prisma } from "@/generated/prisma/client";

type DbClient = Prisma.TransactionClient;

/**
 * Shared Caches state across batch sync operations
 */
export type ProductSyncCache = {
  verifiedTeamMemberIds: Set<string>;
  verifiedCategoryIds: Set<string>;
  verifiedVendorIds: Set<string>;
  verifiedLocationIds: Set<string>;
  verifiedTaxingSchemes: Set<string>;
  verifiedTaxCodes: Set<string>;
  verifiedOperationTypes: Set<string>;
  verifiedPricingSchemeIds: Set<string>;
  verifiedProductIds: Set<string>;
};

export function createProductSyncCache(): ProductSyncCache {
  return {
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
}

/**
 * Utility: Safe boolean conversion
 */
function parseBooleanFlag(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") return value === "1" || value.toLowerCase() === "true";
  return false;
}

/**
 * Utility: URL-safe slug generation
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

/**
 * Core Payload Transformer
 * Converts a raw local product record to the structured InflowProduct payload.
 */
export function mapLocalToInflowPayload(
  product: LocalProduct,
  generatedInflowId: string,
  categoryId: string | null = null,
  currentTimestamp: string = new Date().toISOString()
): InflowProduct & { slug?: string } {
  const trimmedName = product.name?.trim() || "";

  return {
    productId: generatedInflowId,
    sku: "",
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
    categoryId,
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
}

export class ProductSyncMapService {
  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Universal Reusable Sub-Batch Transaction Processor.
   * Processes a concrete set of local products within a transaction context.
   */
  async syncBatch(
    tx: DbClient,
    products: LocalProduct[],
    locationInflowId: string,
    caches: ProductSyncCache,
    brandCustomName?: string,
    checkSignal?: () => Promise<void>
  ) {
    const results: Array<{
      productLocalId: string;
      productInflowId?: string;
      status: "synced" | "skipped_not_found";
    }> = [];

    let processedCount = 0;

    for (const product of products) {
      if (checkSignal) await checkSignal();

      const trimmedName = product.name?.trim();
      if (!trimmedName) {
        results.push({
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

      // 2. Resolve or sync the product record
      if (!match) {
        const generatedInflowId = crypto.randomUUID().toLowerCase();
        const currentTimestamp = new Date().toISOString();
        const categoryLocalId = Number(product.categoryId);

        const category =
          !isNaN(categoryLocalId) && product.categoryId != null
            ? await tx.categoryLocationMap.findFirst({
                where: {
                  locationId: locationInflowId,
                  localId: categoryLocalId,
                },
                select: { categoryId: true },
              })
            : null;

        const payload = mapLocalToInflowPayload(
          product,
          generatedInflowId,
          category?.categoryId ?? null,
          currentTimestamp
        );

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
        results.push({
          productLocalId: String(product.productId),
          status: "skipped_not_found",
        });
        continue;
      }

      // 3. Ensure local location bridge mapping
      const localIdNum = Number(product.productId);
      const locationMap = await tx.productLocationMap.findUnique({
        where: {
          productId_locationId: {
            productId: match.inflowId,
            locationId: locationInflowId,
          },
        },
        select: { localId: true },
      });

      if (!locationMap) {
        await tx.productLocationMap.create({
          data: {
            productId: match.inflowId,
            locationId: locationInflowId,
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
   * Main Driver Method for Paged/Iterative Inflow API or DB product syncs.
   */
  async sync(
    location: {
      inflowId: string;
      name: string;
      url: string;
    },
    options: SyncOptions,
    selectedRecords?: any[],
    syncedAll?: boolean,
    after: string | undefined = undefined,
    brandCustomName?: string,
  ) {
    const { onProgress, checkSignal } = options;
    const BATCH_SIZE = options?.batchSize ?? 30;
    const INTER_BATCH_DELAY = options?.delayBetweenBatchesMs ?? 300;

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

    const caches = createProductSyncCache();

    console.log(`Starting product sync map (Batch Size: ${BATCH_SIZE}, Delay: ${INTER_BATCH_DELAY}ms)...`);
    let batchNo = 0;

    while (hasMore) {
      if (checkSignal) await checkSignal();

      const rawBatch: LocalProduct[] = await getLocalBatchProducts(
        location.url,
        BATCH_SIZE,
        after
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

      // Execute transaction for current batch
      const { processedCount, results } = await prisma.$transaction(
        async (tx) => {
          return await this.syncBatch(
            tx,
            batch,
            location.inflowId,
            caches,
            brandCustomName,
            checkSignal
          );
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