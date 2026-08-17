import { prisma } from "@/lib/prisma";
import { InflowProduct, InflowCustomFields, InflowStockAdjustInput } from "@/lib/inflow/types";
import { Prisma } from "@/generated/prisma/client";
import { SyncOptions } from "@/lib/workers/sync.worker";
import { AdjustmentService, PostAdjustmentPayload, ProcessedAdjustmentResult } from "@/services/stock-adjustment.service";
import { areSerialsDifferent } from "./helpers";

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

export function mapToInflowStockAdjustInput(
  result: ProcessedAdjustmentResult,
  payload: PostAdjustmentPayload
): InflowStockAdjustInput {

  const inflowPayload = {
      stockAdjustmentId: result.adjustment.inflowId,
      adjustmentNumber: result.adjustment.adjustmentNumber,
      adjustmentReasonId: payload.reasonId || "",
      date: new Date().toISOString(),
      isCancelled: false,
      lastModifiedById: payload.performedById,
      locationId: payload.locationId,
      remarks: payload.remarks || "",
      lines: result.createdAdjustmentLines.map((createdLine) => ({
        stockAdjustmentLineId: createdLine.inflowId,
        productId: createdLine.productId,
        sublocation: createdLine.sublocation,
        quantity: {
          standardQuantity: String(createdLine.quantityOnHand),
          uomQuantity: String(createdLine.quantityOnHand),
          uom: "ea.",
          serialNumbers: createdLine.serials,
        },
        description: createdLine.description
      })),
    };
  return inflowPayload;
}

export class InventoryLocationSyncService {
  private adjustmentLocalCloudService: AdjustmentService;

  constructor() {
    this.adjustmentLocalCloudService = new AdjustmentService(prisma);
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
      isCloudSynced: true,
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

    const products = db.product.findMany({
      where: whereClause,
      take,
      ...(cursorId ? { skip: 1, cursor: { id: cursorId } } : {}),
      orderBy: { name: "asc" },
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

    return products;
  }

  async processBatchBulk(
    products: LocalProductWithRelations[],
    checkSignal?: () => Promise<void>,
    batchNo: number = 0,
    reasonId?: string,
  ): Promise<{
    successfulIds: string[];
    failedIds: string[];
  }> {
    const batchStartTime = performance.now();
    const modifiedById = "56bfcf3b-3e98-4098-ae8f-2adcb657cb57";

    const locationAdjustmentMap = new Map<string, SyncAdjustmentLine[]>();

    // --- Phase A: Build Adjustment Inputs ---
    const results = await Promise.allSettled(
      products.map(async (product) => {
        if (checkSignal) await checkSignal();

        for (const inv of product.inventories) {
          const totalQty = inv.quantityOnHand;
          for (const bin of inv.bins) {
            const targetLocId = bin.sublocation?.linkedLocationId || inv.locationId;
            const productId = product.inflowId;
            if (!targetLocId) continue;
            
            // 1. Fetch existing inventory including current bin serial items
            const linkedInventory = await prisma.inventory.findUnique({
              where: {
                productId_locationId: {
                  productId,
                  locationId: targetLocId,
                },
              },
              include: {
                product: {
                  select: {
                    trackSerials: true,
                  },
                },
                bins: {
                  include: {
                    inventoryBinItems: true,
                  },
                },
              },
            });

            const binQty = Number(bin.quantity) || 0;
            const binSerials = bin.inventoryBinItems?.map((item) => item.serialNumber) || [];

            // 2. Extract existing serial numbers from target location (if tracking serials)
            const isTrackSerials = Boolean(product.trackSerials);
            const existingTargetSerials = isTrackSerials && linkedInventory?.bins
              ? linkedInventory.bins.flatMap((b) => b.inventoryBinItems?.map((item) => item.serialNumber) || [])
              : [];

            // 3. Determine quantity & serial diffs
            const isNewInventory = !linkedInventory;
            const targetBinBefore = linkedInventory?.quantityOnHand ?? new Prisma.Decimal(0);
            const linkedBinQtyChange = totalQty.minus(targetBinBefore);
            const hasQtyChange = !linkedBinQtyChange.equals(0);

            const serialsChanged = isTrackSerials
              ? areSerialsDifferent(binSerials, existingTargetSerials)
              : false;

            // 4. Skip ONLY IF there is no quantity change AND serials haven't changed AND the inventory already exists
            if (!hasQtyChange && !serialsChanged && !isNewInventory) continue;

            const adjustmentInput: SyncAdjustmentLine = {
              productId: product.inflowId,
              trackSerials: isTrackSerials,
              quantityAdjusted: linkedBinQtyChange.toNumber(), // Will be 0 if serial-only update
              quantityOnHand: binQty,
              quantityReserved: Number(inv.quantityReserved) || 0,
              quantityAvailable: Number(inv.quantityAvailable) || binQty,
              serials: binSerials,
              description: serialsChanged && !hasQtyChange
                ? `Serial update sync for ${product.name}`
                : `Sublocation sync adjustment for ${product.name}`,
              bins: [],
            };

            const existingGroup = locationAdjustmentMap.get(targetLocId) ?? [];
            existingGroup.push(adjustmentInput);
            locationAdjustmentMap.set(targetLocId, existingGroup);
          }
        }

        return product.id;
      })
    );

    // --- Phase B: Post Local Adjustments & Collect InFlow Payloads ---
    const inflowBulkPayloads: InflowStockAdjustInput[] = [];

    for (const [targetLocationId, adjustmentLines] of locationAdjustmentMap) {
      if (adjustmentLines.length === 0) continue;

      const postPayload: PostAdjustmentPayload = {
        locationId: targetLocationId,
        reasonId: reasonId || undefined,
        remarks: `Batch Sync #${batchNo + 1} Inventory Adjustment`,
        performedById: modifiedById,
        lines: adjustmentLines,
      };

      // 1. Save locally
      const postResult = await this.adjustmentLocalCloudService.postAdjustment(postPayload);

      // 2. Transform and accumulate for inFlow
      const inflowPayload = mapToInflowStockAdjustInput(postResult, postPayload);
      inflowBulkPayloads.push(inflowPayload);

      console.log(
        `[Inventory Sync] Local adjustment created (${postResult.adjustment.inflowId}) for location: ${targetLocationId}`
      );
    }

    // --- Phase D: Formulate Results ---
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

    const batchDuration = performance.now() - batchStartTime;
    console.log(
      `[Product Sync] Finished in ${this.formatDuration(batchDuration)}`
    );

    return { successfulIds, failedIds };
  }

  async sync(
    options: SyncOptions, 
    selectedLocations?: string[],
    selectedRecords?: string[],
    syncedAll?: boolean,
  ) {
    const syncStartTime = performance.now();
    const { onProgress, checkSignal } = options;
    const BATCH_SIZE = options?.batchSize ?? 500; 
    const INTER_BATCH_DELAY = options?.delayBetweenBatchesMs ?? 10;

    const defaultCategory = await prisma.category.findFirst({
      where: { isDefault: true },
      select: { inflowId: true, name: true, isDefault: true },
    });

    if (!defaultCategory) {
      console.error("[InventoryLocationSyncService] Sync aborted: Default category not found.");
      return { productsProcessed: 0, syncedAt: new Date().toISOString() };
    }

    const reason = await prisma.adjustmentReason.findFirst({
      where: { name: { contains: "Integration", mode: "insensitive" } },
    });

    if (!reason) {
      console.error("[InventoryLocationSyncService] Sync aborted: Reason not found.");
      return { productsProcessed: 0, syncedAt: new Date().toISOString() };
    }

    const selectedSublocationIds =
      !syncedAll && selectedRecords && selectedRecords.length > 0
        ? new Set(selectedRecords.map((item) => String(item)))
        : null;

    let totalProcessed = 0;
    let batchNo = 0;
    
    // Track ALL processed product IDs (both success and fail) to paginate correctly
    const processedProductIds: string[] = [];
    const permanentlyFailedIds: string[] = [];

    console.log(`[InventoryLocationSyncService] Starting sync batching (Size: ${BATCH_SIZE})...`);

    while (true) {
      const iterationStartTime = performance.now();
      if (checkSignal) await checkSignal();

      const fetchStartTime = performance.now();
      
      // Exclude all previously fetched/processed IDs so getProducts advances
      const rawBatch = await this.getProducts(
        prisma,
        selectedLocations,
        selectedSublocationIds,
        BATCH_SIZE,
        undefined,
        processedProductIds
      );
      const fetchDuration = performance.now() - fetchStartTime;

      if (!rawBatch || rawBatch.length === 0) {
        console.log(`[InventoryLocationSyncService] No more unsynced products found. Sync complete.`);
        break;
      }

      console.log(
        `[InventoryLocationSyncService] Fetched ${rawBatch.length} unsynced items in ${this.formatDuration(fetchDuration)}`
      );

      if (checkSignal) await checkSignal();

      const { successfulIds, failedIds } = await this.processBatchBulk(
        rawBatch,
        checkSignal,
        batchNo,
        reason?.inflowId
      );

      // Track all processed IDs so the next getProducts call fetches the next set of 20/500 items
      const currentBatchIds = rawBatch.map((p) => p.id);
      processedProductIds.push(...currentBatchIds);

      if (failedIds.length > 0) {
        permanentlyFailedIds.push(...failedIds);
      }

      totalProcessed += successfulIds.length;
      batchNo++;

      const iterationDuration = performance.now() - iterationStartTime;

      console.log(
        `[InventoryLocationSyncService] Batch #${batchNo} done in ${this.formatDuration(iterationDuration)}. ` +
        `Processed: ${successfulIds.length}, Failed: ${failedIds.length}. Cumulative: ${totalProcessed}`
      );

      if (onProgress) {
        await onProgress(totalProcessed);
      }

      if (successfulIds.length === 0 && failedIds.length === rawBatch.length) {
        console.warn(`[InventoryLocationSyncService] Entire batch failed. Stopping execution loop.`);
        break;
      }

      if (INTER_BATCH_DELAY > 0) {
        await this.sleep(INTER_BATCH_DELAY);
      }
    }

    const totalSyncDuration = performance.now() - syncStartTime;
    console.log(
      `[InventoryLocationSyncService] Total job execution completed in ${this.formatDuration(totalSyncDuration)}. Total Processed: ${totalProcessed}, Total Failed: ${permanentlyFailedIds.length}`
    );

    return {
      inventoryLevelsProcessed: totalProcessed,
      failedCount: permanentlyFailedIds.length,
      syncedAt: new Date().toISOString(),
    };
  }
}

export const inventoryStockLocationSyncService = new InventoryLocationSyncService();
