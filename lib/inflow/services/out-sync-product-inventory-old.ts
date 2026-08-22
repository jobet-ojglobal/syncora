// lib/inflow/services/inventory-sync.service.ts
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { getMidSyncQueue } from "@/lib/queues/sync.queue";
import { AdjustmentService } from "@/services/stock-adjustment.service";
import { SyncOptions } from "@/lib/workers/sync.worker";
import { InflowProduct, InflowInventoryLine, InflowCustomFields } from "@/lib/inflow/types";

type DbClient = Prisma.TransactionClient;

export type SyncAdjustmentLine = StockAdjustmentLineInput & {
  description?: string;
};

/**
 * Shared Caches state across batch sync operations
 */
export type InventorySyncCache = {
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

export function createInventorySyncCache(): InventorySyncCache {
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

type LocalInventoryWithRelations = Prisma.ProductGetPayload<{
  include: {
    brand: true;
    category: true;
    prices: true;
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
  };
}>;

export async function mapLocalToInflowPayload(
  product: LocalInventoryWithRelations,
  brandCustomName?: string,
  modifiedById?: string,
  currentTimestamp: string = new Date().toISOString(),
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

  // 2. Build Inventory Lines from filtered bins and items
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
    lastModifiedById: modifiedById || null,
    createdDttm: product.createdAt.toISOString(),
    lastModifiedDateTime: product.updatedAt.toISOString(),

    purchasingUom: null,
    salesUom: null,
    customFields,
    images: [],
    inventoryLines: [],
  
  };
}

export class SublocationInventorySyncService {
  private adjustmentService: AdjustmentService;
  private adjustmentLocalCloudService: AdjustmentService;

  constructor() {
    const queueProvider = {
      addJob: async (jobName: string, payload: any) => {
        const queue = getMidSyncQueue();
        await queue.add(jobName, payload);
      },
    };

    this.adjustmentService = new AdjustmentService(prisma);
    this.adjustmentLocalCloudService = new AdjustmentService(prisma, queueProvider);
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Fetch products filtered by location/sublocation inventory levels.
   */
  async getLocationInventory(
    db: DbClient | typeof prisma,
    selectedLocations?: string[],
    selectedSublocationIds?: Set<string> | null,
    take: number = 30,
    cursorId?: string,
    skipSynced?: boolean
  ): Promise<LocalInventoryWithRelations[]> {
    const sublocationsFilter =
      selectedSublocationIds && selectedSublocationIds.size > 0
        ? { sublocationId: { in: Array.from(selectedSublocationIds) } }
        : undefined;

    const inventoryWhereFilter: Prisma.InventoryWhereInput = {
      ...(selectedLocations?.length ? { locationId: { in: selectedLocations } } : {}),
      ...(skipSynced ? { product: { isCloudSynced: false } } : {}),
    };

    const whereClause: Prisma.ProductWhereInput = {
      deletedAt: null,
      ...(skipSynced ? { isCloudSynced: false } : {}),
      inventories: {
        some: {
          ...inventoryWhereFilter,
          bins: {
            some: sublocationsFilter || {},
          },
        },
      },
    };

    return await db.product.findMany({
      where: whereClause,
      take,
      ...(cursorId ? { skip: 1, cursor: { id: cursorId } } : {}),
      orderBy: { name: "asc" },
      include: {
        brand: true,
        category: true,
        prices: true,
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

  /**
   * Processes a batch of inventory records for stock adjustments.
   */
  async syncBatch(
    products: LocalInventoryWithRelations[],
    caches: InventorySyncCache,
    brandCustomName?: string,
    checkSignal?: () => Promise<void>,
    batchNo: number = 0,
    itemDelayMs: number = 300,
    hasStockAdjustLocal?: boolean,
    hasStockAdjustCloud?: boolean
  ) {
    let processedCount = 0;
    const currentTimestamp = new Date().toISOString();
    const modifiedById = "8ff3e71d-eb02-425d-8e0f-00a69fc8e482";

    const locationAdjustmentMap = new Map<string, SyncAdjustmentLine[]>();

    for (const product of products) {
      if (checkSignal) await checkSignal();

      let syncedProduct: InflowProduct | null = null;

      if (product.isCloudSynced) {
        syncedProduct = await mapLocalToInflowPayload(
          product,
          brandCustomName,
          modifiedById,
          currentTimestamp
        );
      }

      if (syncedProduct) {
        if (hasStockAdjustLocal) {
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
        }
        processedCount++;
      } else {
        console.log(`[Inventory Sync] Skipping unsynced product: ${product.name}`);
      }

      if (itemDelayMs > 0) {
        await this.sleep(itemDelayMs);
      }
    }

    // --- Phase B: Post location adjustments ---
    const reason = await prisma.adjustmentReason.findFirst({
      where: { name: { contains: "Integration", mode: "insensitive" } },
    });

    for (const [targetLocationId, adjustmentLines] of locationAdjustmentMap) {
      if (adjustmentLines.length === 0) continue;

      if (hasStockAdjustCloud) {
        await this.adjustmentLocalCloudService.postAdjustment({
          locationId: targetLocationId,
          reasonId: reason?.inflowId || undefined,
          remarks: `Batch Sync #${batchNo + 1} Inventory Adjustment`,
          performedById: modifiedById,
          lines: adjustmentLines,
        });
      } else {
        await this.adjustmentService.postAdjustment({
          locationId: targetLocationId,
          reasonId: reason?.inflowId || undefined,
          remarks: `Batch Sync #${batchNo + 1} Inventory Adjustment`,
          performedById: modifiedById,
          lines: adjustmentLines,
        });
      }

      console.log(
        `[Inventory Sync] Processed ${adjustmentLines.length} lines for location: ${targetLocationId}`
      );

      if (itemDelayMs > 0) {
        await this.sleep(itemDelayMs);
      }
    }

    return { processedCount };
  }

  /**
   * Main Driver Method for Paged Inventory Syncing.
   */
  async sync(
    options: SyncOptions,
    selectedLocations?: string[],
    selectedRecords?: string[],
    syncedAll?: boolean,
    brandCustomName?: string,
    includes?: string[]
  ) {
    const { onProgress, checkSignal } = options;
    const BATCH_SIZE = options?.batchSize ?? 10;
    const INTER_BATCH_DELAY = options?.delayBetweenBatchesMs ?? 500;
    const ITEM_DELAY = 300;

    let totalProcessed = 0;
    let cursorId: string | undefined = undefined;

    const selectedSublocationIds =
      !syncedAll && selectedRecords && selectedRecords.length > 0
        ? new Set(selectedRecords.map((item) => String(item)))
        : null;

    const hasStockAdjustLocal = (includes ?? []).includes("StockAdjustLocal");
    const hasStockAdjustCloud = (includes ?? []).includes("StockAdjustCloud");
    const hasSkipSynced = (includes ?? []).includes("SkipSynced");

    const caches = createInventorySyncCache();

    console.log(
      `Starting dedicated inventory sync (Cursor: ${cursorId || "BEGINNING"}, Batch Size: ${BATCH_SIZE})...`
    );
    let batchNo = 0;

    while (true) {
      if (checkSignal) await checkSignal();

      const rawBatch = await this.getLocationInventory(
        prisma,
        selectedLocations,
        selectedSublocationIds,
        BATCH_SIZE,
        cursorId,
        hasSkipSynced
      );

      if (!rawBatch || rawBatch.length === 0) {
        console.log(`[Inventory Sync] No more records returned. Sync complete.`);
        break;
      }

      const lastProduct = rawBatch[rawBatch.length - 1];
      cursorId = lastProduct.id;

      if (checkSignal) await checkSignal();

      const { processedCount } = await this.syncBatch(
        rawBatch,
        caches,
        brandCustomName,
        checkSignal,
        batchNo,
        ITEM_DELAY,
        hasStockAdjustLocal,
        hasStockAdjustCloud
      );

      totalProcessed += processedCount;
      batchNo++;

      console.log(
        `Batch #${batchNo} completed (${rawBatch.length} items fetched, ${processedCount} processed). Total: ${totalProcessed}`
      );

      if (onProgress) {
        await onProgress(totalProcessed);
      }

      if (checkSignal) await checkSignal();

      if (rawBatch.length < BATCH_SIZE) {
        console.log(`[Inventory Sync] Final batch reached (${rawBatch.length} < ${BATCH_SIZE}).`);
        break;
      }

      if (INTER_BATCH_DELAY > 0) {
        await this.sleep(INTER_BATCH_DELAY);
      }
    }

    return {
      inventoryProcessed: totalProcessed,
      syncedAt: new Date().toISOString(),
    };
  }
}