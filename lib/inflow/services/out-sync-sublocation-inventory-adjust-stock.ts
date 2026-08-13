// lib/inflow/services/out-sync-inventory.ts
import { prisma } from "@/lib/prisma";
import { InflowProduct, InflowInventoryLine, InflowCustomFields } from "@/lib/inflow/types";
import { Prisma } from "@/generated/prisma/client";
import { checkCloudProduct, upsertProduct } from "../data/products";
import { SyncOptions } from "@/lib/locations/types";
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

export interface PostAdjustmentPayload {
  existingAdjustmentId?: string;
  reasonId?: string;
  locationId: string;
  remarks?: string;
  performedById: string;
  lines: SyncAdjustmentLine[];
}

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

// Local Prisma Product query payload shape with includes
type LocalProductWithRelations = Prisma.ProductGetPayload<{
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

/**
 * Core Payload Transformer
 * Converts a raw local product record (with Prisma relations) to the structured InflowProduct payload.
 * Map bin sublocation linkedLocationId to inventoryLines.locationId.
 */
export async function mapLocalToInflowPayload(
  product: LocalProductWithRelations,
  brandCustomName?: string,
  currentTimestamp: string = new Date().toISOString()
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
  const inventoryLines: InflowInventoryLine[] = [];

  for (const inv of product.inventories) {
    for (const bin of inv.bins) {
      // Determine target locationId: prefer sublocation.linkedLocationId over parent inv.locationId
      const targetLocationId = bin.sublocation?.linkedLocationId || inv.locationId;

      // Handle serialized items
      if (bin.inventoryBinItems && bin.inventoryBinItems.length > 0) {
        for (const item of bin.inventoryBinItems) {
          inventoryLines.push({
            inventoryLineId: item.id,
            locationId: targetLocationId,
            productId: product.inflowId,
            quantityOnHand: "1.0000",
            serial: item.serialNumber,
            sublocation: "",
          });
        }
      } else {
        // Standard un-serialized inventory quantity line
        inventoryLines.push({
          inventoryLineId: bin.id,
          locationId: targetLocationId,
          productId: product.inflowId,
          quantityOnHand: bin.quantity.toString(),
          serial: "",
          sublocation: "",
        });
      }
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
    lastModifiedById: "56bfcf3b-3e98-4098-ae8f-2adcb657cb57",
    createdDttm: product.createdAt.toISOString(),
    lastModifiedDateTime: product.updatedAt.toISOString(),

    purchasingUom: null,
    salesUom: null,
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

export class SublocationInventoryAdjustOutSyncService {
  private adjustmentService: AdjustmentService;
  private adjustmentLocalCloudService: AdjustmentService;

  constructor() {
    // Inject queue provider into AdjustmentService
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
   * Universal Reusable Sub-Batch Transaction Processor.
   * Processes a concrete set of local products within a transaction context.
   */
  async syncBatch(
    products: LocalProductWithRelations[],
    caches: InventorySyncCache,
    brandCustomName?: string,
    checkSignal?: () => Promise<void>,
    batchNo: number = 0,
    itemDelayMs: number = 250,
    hasUpsertProduct: boolean,
    hasStockAdjustLocal: boolean,
    hasStockAdjustCloud: boolean,
  ) {
    let processedCount = 0;
    const currentTimestamp = new Date().toISOString();
    const modifiedBy = "56bfcf3b-3e98-4098-ae8f-2adcb657cb57";

    // Group adjustments by target Location ID
    const locationAdjustmentMap = new Map<string, SyncAdjustmentLine[]>();

    for (const product of products) {
      if (checkSignal) await checkSignal();

      // let payload: InflowProduct | null = null;
      let syncedProduct: InflowProduct | null = null;

      if(product.isCloudSynced) {
        const payloadMapped = await mapLocalToInflowPayload(
            product,
            brandCustomName,
            currentTimestamp
          );
        syncedProduct = payloadMapped
      } else {
        if(hasUpsertProduct) {
          const payload = await mapLocalToInflowPayload(
            product,
            brandCustomName,
            currentTimestamp
          );
          syncedProduct = await upsertProduct(payload);
          console.log(`Processed Product: ${payload.name} completed.`);
        }
      }
      
      if (syncedProduct) {
        if(hasStockAdjustLocal) {
        // --- Phase A: Build Adjustment Inputs for each target location ---
          for (const inv of product.inventories) {
            for (const bin of inv.bins) {
              const targetLocId = bin.sublocation?.linkedLocationId || inv.locationId;
              if (!targetLocId) continue;

              // temporary skip serials
              if(product.trackSerials) continue;

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
                bins: [
                  // {
                  //   sublocationId: bin.sublocationId,
                  //   quantity: binQty,
                  //   serials: binSerials,
                  // },
                ],
              };

              const existingGroup = locationAdjustmentMap.get(targetLocId) ?? [];
              existingGroup.push(adjustmentInput);
              locationAdjustmentMap.set(targetLocId, existingGroup);
            }
          }
        }
        processedCount++;
      }

      if (itemDelayMs > 0) {
        await this.sleep(itemDelayMs);
      }
    }

    // --- Phase B: Post location adjustments through AdjustmentService ---
    const reason = await prisma.adjustmentReason.findFirst({
      where: { name: { contains: "Integration", mode: "insensitive" } },
    });

    for (const [targetLocationId, adjustmentLines] of locationAdjustmentMap) {
      if (adjustmentLines.length === 0) continue;

      if(hasStockAdjustCloud){
        await this.adjustmentLocalCloudService.postAdjustment({
          locationId: targetLocationId,
          reasonId: reason?.inflowId || undefined,
          remarks: `Batch Sync #${batchNo + 1} Inventory Adjustment`,
          performedById: modifiedBy,
          lines: adjustmentLines,
        });
      } else {
        await this.adjustmentService.postAdjustment({
          locationId: targetLocationId,
          reasonId: reason?.inflowId || undefined,
          remarks: `Batch Sync #${batchNo + 1} Inventory Adjustment`,
          performedById: modifiedBy,
          lines: adjustmentLines,
        });
      }

      

      console.log(
        `[Service Sync] Processed ${adjustmentLines.length} lines for location: ${targetLocationId}`
      );
    }

    return { processedCount };
  }
  

  /**
   * Fetch products with location inventory levels filtered specifically by selected Sublocations.
   */
  async getLocationInventory(
    db: DbClient | typeof prisma,
    selectedLocations?: string[],
    selectedSublocationIds?: Set<string> | null,
    take: number = 30,
    cursorId?: string
  ): Promise<LocalProductWithRelations[]> {
    const sublocationsFilter =
      selectedSublocationIds && selectedSublocationIds.size > 0
        ? { sublocationId: { in: Array.from(selectedSublocationIds) } }
        : undefined;

    const whereClause: Prisma.ProductWhereInput = {
      deletedAt: null,
      inventories: {
        some: {
          ...(selectedLocations?.length ? { locationId: { in: selectedLocations } } : {}),
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
      orderBy: { id: "asc" },
      include: {
        brand: true,
        category: true,
        prices: true,
        inventories: {
          where: selectedLocations?.length
            ? { locationId: { in: selectedLocations } }
            : undefined,
          include: {
            bins: {
              where: sublocationsFilter, // Filter bins specifically to selected sublocations
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
   * Main Driver Method for Paged/Iterative Inflow API or DB product syncs.
   * `selectedRecords` represents selected Sublocation IDs.
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
    const BATCH_SIZE = options?.batchSize ?? 15; // 15 Decreased batch size to prevent long-running tasks
    const INTER_BATCH_DELAY = options?.delayBetweenBatchesMs ?? 1000;
    const ITEM_DELAY = 300;

    let totalProcessed = 0;
    let hasMore = true;
    let cursorId: string | undefined = undefined;

    const selectedSublocationIds =
      !syncedAll && selectedRecords && selectedRecords.length > 0
        ? new Set(selectedRecords.map((item) => String(item)))
        : null;

    const EXCLUDED_INCLUDES = new Set(["coreData", "brand"]);
    const cleanIncludes = (includes ?? []).filter((item) => !EXCLUDED_INCLUDES.has(item));
    const hasUpsertProduct= (includes ?? []).includes("UpsertProduct");
    const hasStockAdjustLocal = (includes ?? []).includes("StockAdjustLocal");
    const hasStockAdjustCloud = (includes ?? []).includes("StockAdjustCloud");
    const mergedIncludes = [...cleanIncludes];
    // "UpsertProduct",
    const caches = createInventorySyncCache();

    console.log(
      `Starting inventory sync map (Batch Size: ${BATCH_SIZE}, Delay: ${INTER_BATCH_DELAY}ms)...`
    );
    let batchNo = 0;

    while (hasMore) {
      if (checkSignal) await checkSignal();

      // Fetch paged inventory batch filtered by sublocation IDs
      const rawBatch = await this.getLocationInventory(
        prisma,
        selectedLocations,
        selectedSublocationIds,
        BATCH_SIZE,
        cursorId
      );

      if (!rawBatch || rawBatch.length === 0) break;

      // Update cursor for next batch iteration
      cursorId = rawBatch[rawBatch.length - 1].id;
      if (rawBatch.length < BATCH_SIZE) hasMore = false;

      if (checkSignal) await checkSignal();

      // Execute sync per current batch inside Prisma transaction context
      const { processedCount } = await this.syncBatch(
        rawBatch,
        caches,
        brandCustomName,
        checkSignal,
        batchNo,
        ITEM_DELAY,
        hasUpsertProduct,
        hasStockAdjustLocal,
        hasStockAdjustCloud
      );

      totalProcessed += processedCount;
      batchNo++;

      console.log(
        `Batch #${batchNo} completed. Processed ${totalProcessed} products.`
      );

      if (onProgress) await onProgress(totalProcessed);

      if (checkSignal) await checkSignal();

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