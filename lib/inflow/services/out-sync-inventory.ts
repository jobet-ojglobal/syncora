import { prisma } from "@/lib/prisma";
import { InflowProduct, InflowCustomFields } from "@/lib/inflow/types";
import { Prisma } from "@/generated/prisma/client";
import { upsertProduct } from "../data/products";
import { SyncOptions } from "@/lib/workers/sync.worker";
import pLimit from "p-limit";
import { getMidSyncQueue } from "@/lib/queues/sync.queue";
import { AdjustmentService } from "@/services/stock-adjustment.service";

type DbClient = Prisma.TransactionClient;

export type SyncAdjustmentLine = StockAdjustmentLineInput & {
  description?: string;
};

export type StockAdjustmentLineInput = {
  productId: string;
  trackSerials: boolean;
  quantityAdjusted: number;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  bins: {
    sublocationId: string;
    quantity: number;
    serials: string[];
    id?: string | undefined;
  }[];
  serials: string[];
  id?: string | undefined;
  reason?: string | null | undefined;
};

export type LocalProductWithRelations = Prisma.ProductGetPayload<{
  include: {
    brand: true;
    category: {
      include: {
        parent: true; 
      };
    };
    inventories: {
      include: {
        bins: {
          include: {
            sublocation: true;
            inventoryBinItems: true;
          };
        };
      };
    };

    cost: true;
    prices: true;
    images: true;
    purchasingUom: { include: { uom: true } };
    salesUom: { include: { uom: true } };
  };
}>;

export function mapLocalProductToInflowPayload(
  product: LocalProductWithRelations,
  defaultCategoryPayload: { inflowId: string; name: string; isDefault: boolean } | null,
  brandCustomName?: string,
  modifiedById?: string
): InflowProduct & { isCloudSynced: boolean } {
  const trimmedName = product.name?.trim() || "";
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

  // 2. Resolve Cost Object Mapping
  const productCost = product.cost;
  const mappedCost = productCost
    ? {
        cost: productCost.cost?.toString() || "0",
        productCostId: productCost.inflowId,
        productId: product.inflowId || "",
      }
    : undefined;

  // 3. Resolve Default Image (e.g., using the first image from the relation list)
  const primaryImage = product.images?.[0];
  const mappedDefaultImage = primaryImage
    ? {
        imageId: primaryImage.inflowId,
        largeUrl: primaryImage.largeUrl || "",
        mediumUncroppedUrl: primaryImage.mediumUncroppedUrl || "",
        mediumUrl: primaryImage.mediumUrl || "",
        originalUrl: primaryImage.originalUrl || "",
        smallUrl: primaryImage.smallUrl || "",
        thumbUrl: primaryImage.thumbUrl || "",
      }
    : undefined;

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
    categoryId: product?.categoryId || defaultCategoryPayload?.inflowId || null,
    lastVendorId: product.lastVendorId,
    lastModifiedById: modifiedById || null,
    createdDttm: product.createdAt.toISOString(),
    lastModifiedDateTime: product.updatedAt.toISOString(),

    cost: mappedCost,
    defaultImage: mappedDefaultImage,

    // Dynamic Purchasing UOM Mapping
    purchasingUom: product.purchasingUom
      ? {
          name: product.purchasingUom.uom.name,
          conversionRatio: {
            standardQuantity: product.purchasingUom.standardQuantity?.toString() || "1",
            uomQuantity: product.purchasingUom.uomQuantity?.toString() || "1",
          },
        }
      : null,

    // Dynamic Sales UOM Mapping
    salesUom: product.salesUom
      ? {
          name: product.salesUom.uom.name,
          conversionRatio: {
            standardQuantity: product.salesUom.standardQuantity?.toString() || "1",
            uomQuantity: product.salesUom.uomQuantity?.toString() || "1",
          },
        }
      : null,

    customFields,

    // Corrected Images Array Mapping
    images: Array.isArray(product.images)
      ? product.images.map((img) => ({
          imageId: img.inflowId,
          largeUrl: img.largeUrl || null,
          mediumUncroppedUrl: img.mediumUncroppedUrl || null,
          mediumUrl: img.mediumUrl || null,
          originalUrl: img.originalUrl || null,
          smallUrl: img.smallUrl || null,
          thumbUrl: img.thumbUrl || null,
        }))
      : [],

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

export class InventoryOutSyncService {
  private adjustmentLocalCloudService: AdjustmentService;

  constructor() {
    const queueProvider = {
      addJob: async (jobName: string, payload: any) => {
        const queue = getMidSyncQueue();
        await queue.add(jobName, payload);
      },
    };

    this.adjustmentLocalCloudService = new AdjustmentService(prisma, queueProvider);
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Utility helper to format milliseconds into readable output (e.g., "450ms" or "2.34s")
   */
  private formatDuration(ms: number): string {
    return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`;
  }

  async getProducts(
    db: DbClient | typeof prisma = prisma,
    selectedLocations?: string[],
    selectedSublocationIds?: Set<string> | null,
    take: number = 30,
    cursorId?: string,
    excludeIds: string[] = []
  ): Promise<LocalProductWithRelations[]> {

    const sublocationsFilter =
      selectedSublocationIds && selectedSublocationIds.size > 0
        ? { sublocationId: { in: Array.from(selectedSublocationIds) } }
        : undefined;

    const inventoryWhereFilter: Prisma.InventoryWhereInput = {
      ...(selectedLocations?.length ? { locationId: { in: selectedLocations } } : {}),
    };

    const whereClause: Prisma.ProductWhereInput = {
      deletedAt: null,
      isActive: true,
      ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
      inventories: {
        some: {
          ...inventoryWhereFilter,
          bins: {
            some: sublocationsFilter || {},
          },
        },
      },
    };

    return db.product.findMany({
      where: whereClause,
      take,
      ...(cursorId ? { skip: 1, cursor: { id: cursorId } } : {}),
      orderBy: { id: "asc" },
      include: {
        brand: true,
        category: {
          include: {
            parent: true,
          },
        },
        cost: true,
        prices: true,
        images: true,
        salesUom: { include: { uom: true } },
        purchasingUom: { include: { uom: true } },
        inventories: {
          where: inventoryWhereFilter,
          include: {
            bins: {
              where: sublocationsFilter,
              include: {
                sublocation: true,
                inventoryBinItems: true,
              },
            },
            location: {
              select: {
                inflowId: true,
                name: true,
                isActive: true,
                isDefault: true,
              },
            },
          },
        },
      },
    });
  }

  async processBatch(
    products: LocalProductWithRelations[],
    defaultCategoryPayload: { inflowId: string; name: string; isDefault: boolean } | null,
    brandCustomName?: string,
    checkSignal?: () => Promise<void>,
    batchNo: number = 0,
    concurrency = 1 // Lowered to 1 or 2 to avoid 429 rate limit thrashing
  ): Promise<{
    successfulIds: string[];
    failedIds: string[];
  }> {
    const batchStartTime = performance.now();
    const limit = pLimit(concurrency);
    const modifiedById = "56bfcf3b-3e98-4098-ae8f-2adcb657cb57";
    const itemDelayMs = 300;

    const locationAdjustmentMap = new Map<string, SyncAdjustmentLine[]>();

    const results = await Promise.allSettled(
      products.map((product) =>
        limit(async () => {
          if (checkSignal) await checkSignal();

          const payload = mapLocalProductToInflowPayload(
            product,
            defaultCategoryPayload,
            brandCustomName,
            modifiedById
          );

          let syncedProduct: InflowProduct | null = payload;
          
          if(!payload.isCloudSynced) {
            try {
                syncedProduct = await upsertProduct(payload);

                if (!syncedProduct?.productId) {
                    throw new Error(`Invalid sync response for product ${product.name}`);
                }

                return product.id;
            } catch (error: any) {
                // Check for duplicate product name conflict
                if (
                error?.body?.includes("product_name_conflict") ||
                error?.message?.includes("product_name_conflict")
                ) {
                console.warn(
                    `[Product Sync] Name conflict detected for "${product.name}". Skipping to unblock batch.`
                );
                // Option: Mark with a specific error flag in DB if needed
                }
                throw error;
            }
          } 

          // --- Phase A: Build Adjustment Inputs for target locations ---
          for (const inv of product.inventories) {
            for (const bin of inv.bins) {
              const targetLocId = bin.sublocation?.linkedLocationId || inv.locationId;
              if (!targetLocId) continue;

              if (product.trackSerials) continue;

              const binQty = Number(bin.quantity) || 0;
              const binSerials = bin.inventoryBinItems?.map((item) => item.serialNumber) || [];

              const adjustmentInput: SyncAdjustmentLine = {
                productId: product.inflowId,
                trackSerials: Boolean(product.trackSerials),
                quantityAdjusted: binQty,
                quantityOnHand: binQty,
                quantityReserved: Number(inv.quantityReserved) || 0,
                quantityAvailable: Number(inv.quantityAvailable) || binQty,
                serials: binSerials,
                description: `Sublocation sync adjustment for ${product.name}`,
                bins: [],
              };

              const existingGroup = locationAdjustmentMap.get(targetLocId) ?? [];
              existingGroup.push(adjustmentInput);
              locationAdjustmentMap.set(targetLocId, existingGroup);
            }
          }

          return product.id;
        })
      )
    );

    // --- Phase B: Post location adjustments ---
    const reason = await prisma.adjustmentReason.findFirst({
      where: { name: { contains: "Integration", mode: "insensitive" } },
    });

    for (const [targetLocationId, adjustmentLines] of locationAdjustmentMap) {
      if (adjustmentLines.length === 0) continue;

      await this.adjustmentLocalCloudService.postAdjustment({
        locationId: targetLocationId,
        reasonId: reason?.inflowId || undefined,
        remarks: `Batch Sync #${batchNo + 1} Inventory Adjustment`,
        performedById: modifiedById,
        lines: adjustmentLines,
      });

      console.log(
        `[Inventory Sync] Processed ${adjustmentLines.length} lines for location: ${targetLocationId}`
      );

      if (itemDelayMs> 0) {
        await this.sleep(itemDelayMs);
      }
    }

    const successfulIds: string[] = [];
    const failedIds: string[] = [];

    results.forEach((res, index) => {
      if (res.status === "fulfilled") {
        successfulIds.push(res.value);
      } else {
        failedIds.push(products[index].id);
        console.error(`[Product Sync] Failed (${products[index].name}):`, res.reason);
      }
    });

    if (successfulIds.length > 0) {
      await prisma.product.updateMany({
        where: { id: { in: successfulIds } },
        data: { isCloudSynced: true },
      });
    }

    const batchDuration = performance.now() - batchStartTime;
    console.log(
      `[Product Sync] Batch API processing finished in ${this.formatDuration(batchDuration)} (Avg: ${this.formatDuration(batchDuration / products.length)}/item)`
    );

    return { 
      successfulIds, 
      failedIds };
  }

  async sync(
    options: SyncOptions, 
    selectedLocations?: string[],
    selectedRecords?: string[],
    syncedAll?: boolean,
    brandCustomName?: string,
    includes?: string[]
  ) {
    const syncStartTime = performance.now();
    const { onProgress, checkSignal } = options;
    // Reduced batch size to 20 to keep BullMQ execution time well within stall limits
    const BATCH_SIZE = options?.batchSize ?? 10 ;//20; 
    const API_CONCURRENCY = 5 // 3; // 1 request at a time avoids 429 bursts
    const INTER_BATCH_DELAY = options?.delayBetweenBatchesMs ?? 1000; // 5000; // 1000

    const defaultCategory = await prisma.category.findFirst({
      where: { isDefault: true },
      select: { inflowId: true, name: true, isDefault: true },
    });

    if (!defaultCategory) {
      console.error("[InventoryOutSyncService] Sync aborted: Default category not found.");
      return { productsProcessed: 0, syncedAt: new Date().toISOString() };
    }

    const selectedSublocationIds =
      !syncedAll && selectedRecords && selectedRecords.length > 0
        ? new Set(selectedRecords.map((item) => String(item)))
        : null;

    let totalProcessed = 0;
    let batchNo = 0;
    const permanentlyFailedIds: string[] = [];

    console.log(`[InventoryOutSyncService] Starting sync batching (Size: ${BATCH_SIZE})...`);

    while (true) {
      const iterationStartTime = performance.now();
      if (checkSignal) await checkSignal();

      const fetchStartTime = performance.now();
      const rawBatch = await this.getProducts(
        prisma,
        selectedLocations,
        selectedSublocationIds,
        BATCH_SIZE,
        undefined,
        permanentlyFailedIds
      );
      const fetchDuration = performance.now() - fetchStartTime;

      if (!rawBatch || rawBatch.length === 0) {
        console.log(`[InventoryOutSyncService] No more unsynced products found. Sync complete.`);
        break;
      }

      console.log(
        `[InventoryOutSyncService] Fetched ${rawBatch.length} unsynced items in ${this.formatDuration(fetchDuration)}`
      );

      if (checkSignal) await checkSignal();

      const { successfulIds, failedIds } = await this.processBatch(
        rawBatch,
        defaultCategory,
        brandCustomName,
        checkSignal,
        batchNo,
        API_CONCURRENCY
      );

      if (failedIds.length > 0) {
        permanentlyFailedIds.push(...failedIds);
      }

      totalProcessed += successfulIds.length;
      batchNo++;

      const iterationDuration = performance.now() - iterationStartTime;

      console.log(
        `[InventoryOutSyncService] Batch #${batchNo} done in ${this.formatDuration(iterationDuration)}. ` +
        `Processed: ${successfulIds.length}, Failed: ${failedIds.length}. Cumulative: ${totalProcessed}`
      );

      // Heartbeat report to prevent BullMQ stall timeouts
      if (onProgress) {
        await onProgress(totalProcessed);
      }

      if (successfulIds.length === 0 && failedIds.length === rawBatch.length) {
        console.warn(`[InventoryOutSyncService] Entire batch failed. Stopping execution loop.`);
        break;
      }

      if (INTER_BATCH_DELAY > 0) {
        await this.sleep(INTER_BATCH_DELAY);
      }

      const totalSyncDuration = performance.now() - syncStartTime;
      console.log(
        `[InventoryOutSyncService] Total job execution completed in ${this.formatDuration(totalSyncDuration)}. Total Processed: ${totalProcessed}, Total Failed: ${permanentlyFailedIds.length}`
      );
    }

    return {
      inventoryLevelsProcessed: totalProcessed,
      failedCount: permanentlyFailedIds.length,
      syncedAt: new Date().toISOString(),
    };
  }
}

export const inventoryOutSyncService = new InventoryOutSyncService();
