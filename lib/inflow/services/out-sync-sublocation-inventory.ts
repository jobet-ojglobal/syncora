// lib/inflow/services/out-sync-inventory.ts
import { prisma } from "@/lib/prisma";
import { InflowProduct, InflowInventoryLine, InflowCustomFields } from "@/lib/inflow/types";
import { Prisma } from "@/generated/prisma/client";
import { upsertProduct } from "../data/products";
import { SyncOptions } from "@/lib/locations/types";

type DbClient = Prisma.TransactionClient;

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
): Promise<InflowProduct> {
  const trimmedName = product.name?.trim() || "";

  // 1. Build Custom Fields (Brand dynamics)
  const existingCustomFields = (product.customFields as Record<string, string>) || {};
  const customFields: InflowCustomFields = { ...existingCustomFields };

  const brandName = product.brand?.name;
  if (brandName) {
    if (brandCustomName) {
      customFields[brandCustomName as keyof InflowCustomFields] = brandName;
    } else {
      customFields.custom1 = brandName;
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
            timestamp: currentTimestamp,
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
          timestamp: currentTimestamp,
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
    lastModifiedById: "8ff3e71d-eb02-425d-8e0f-00a69fc8e482",
    createdDttm: product.createdAt.toISOString(),
    lastModifiedDateTime: product.updatedAt.toISOString(),

    purchasingUom: null,
    salesUom: null,
    customFields,
    images: [],
    inventoryLines,
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

export class SublocationInventoryOutSyncService {
  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Universal Reusable Sub-Batch Transaction Processor.
   * Processes a concrete set of local products within a transaction context.
   */
  async syncBatch(
    tx: DbClient,
    products: LocalProductWithRelations[],
    caches: InventorySyncCache,
    brandCustomName?: string,
    checkSignal?: () => Promise<void>
  ) {
    let processedCount = 0;
    const currentTimestamp = new Date().toISOString();

    for (const product of products) {
      if (checkSignal) await checkSignal();

      const payload: InflowProduct = await mapLocalToInflowPayload(
        product,
        brandCustomName,
        currentTimestamp
      );

      console.log(JSON.stringify(payload.inventoryLines[0], null, 2))

      const upsertRes = await upsertProduct(payload);
      if(upsertRes) {
        console.log(
            `Processed Product: ${payload.name} completed.`, upsertRes.inventoryLines
        );
        
        processedCount++;
      }
      
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
    brandCustomName?: string
  ) {
    const { onProgress, checkSignal } = options;
    const BATCH_SIZE = options?.batchSize ?? 30;
    const INTER_BATCH_DELAY = options?.delayBetweenBatchesMs ?? 300;

    let totalProcessed = 0;
    let hasMore = true;
    let cursorId: string | undefined = undefined;

    const selectedSublocationIds =
      !syncedAll && selectedRecords && selectedRecords.length > 0
        ? new Set(selectedRecords.map((item) => String(item)))
        : null;

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
      const { processedCount } = await prisma.$transaction(
        async (tx) => {
          return await this.syncBatch(
            tx,
            rawBatch,
            caches,
            brandCustomName,
            checkSignal
          );
        },
        { timeout: 60000 }
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