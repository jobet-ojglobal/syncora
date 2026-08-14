import { prisma } from "@/lib/prisma";
import { InflowProduct, InflowCustomFields } from "@/lib/inflow/types";
import { Prisma } from "@/generated/prisma/client";
import { upsertProduct } from "../data/products";
import { SyncOptions } from "@/lib/workers/sync.worker";

type DbClient = Prisma.TransactionClient;

// Prisma Product type definition with required relation includes
export type LocalProductWithRelations = Prisma.ProductGetPayload<{
  include: {
    brand: true;
    category: true;
    prices: true;
  };
}>;

/**
 * Payload Transformer: Converts a local product (with relations) into the InflowProduct payload format.
 */
export async function mapLocalProductToInflowPayload(
  product: LocalProductWithRelations,
  brandCustomName?: string,
  modifiedById?: string,
  currentTimestamp: string = new Date().toISOString()
): Promise<InflowProduct & { isCloudSynced: boolean }> {
  const trimmedName = product.name?.trim() || "";

  // 1. Map custom fields (e.g. Brand dynamics)
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

  // 2. Ensure Category fallback
  let setCategoryId: string | null = product.categoryId;
  if (!product.categoryId) {
    const defaultCategory = await prisma.category.findFirst({
      where: { isDefault: true },
    });
    setCategoryId = defaultCategory?.inflowId || null;
  }

  // 3. Build final API payload
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

export class ProductOutSyncService {
  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Fetches paginated products from DB eligible for sync.
   */
  async getProducts(
    db: DbClient | typeof prisma = prisma,
    take: number = 30,
    cursorId?: string,
    skipSynced: boolean = false
    ): Promise<LocalProductWithRelations[]> {
    const whereClause: Prisma.ProductWhereInput = {
        deletedAt: null,
        ...(skipSynced ? { isCloudSynced: false } : {}),
    };

    return await db.product.findMany({
        where: whereClause,
        take,
        // 💡 ONLY use cursor if we are NOT filtering out items as we process them
        ...(!skipSynced && cursorId ? { skip: 1, cursor: { id: cursorId } } : {}),
        orderBy: { createdAt: "asc" }, // Use standard deterministic ordering
        include: {
        brand: true,
        category: true,
        prices: true,
        },
    });
    }

  /**
   * Iterates through a product batch, maps payloads, and upserts each product into the cloud.
   */
  async processBatch(
    products: LocalProductWithRelations[],
    brandCustomName?: string,
    checkSignal?: () => Promise<void>,
    itemDelayMs: number = 300
  ): Promise<{ processedCount: number }> {
    let processedCount = 0;
    const currentTimestamp = new Date().toISOString();
    const modifiedById = "56bfcf3b-3e98-4098-ae8f-2adcb657cb57";

    for (const product of products) {
      if (checkSignal) await checkSignal();

      const payload = await mapLocalProductToInflowPayload(
        product,
        brandCustomName,
        modifiedById,
        currentTimestamp
      );

      const syncedProduct = await upsertProduct(payload);

      if (syncedProduct) {
        console.log(`Success upsert product: ${syncedProduct.name}`);
        await prisma.product.update({
          where: { inflowId: syncedProduct.productId },
          data: { isCloudSynced: true },
        });
      }

      console.log(`Processed Product: ${payload.name} completed.`);
      processedCount++;

      if (itemDelayMs > 0) {
        await this.sleep(itemDelayMs);
      }
    }

    return { processedCount };
  }

  /**
   * Main driver method for batch syncing products to the cloud.
   */
  async sync(
    options: SyncOptions,
    brandCustomName?: string,
    skipSynced: boolean = true
  ) {
    const { onProgress, checkSignal } = options;
    const BATCH_SIZE = options?.batchSize ?? 10;
    const INTER_BATCH_DELAY = options?.delayBetweenBatchesMs ?? 500;
    const ITEM_DELAY = 300;

    let totalProcessed = 0;
    let cursorId: string | undefined = undefined;
    let batchNo = 0;

    console.log(
      `[ProductOutSyncService] Starting product batch sync (Batch Size: ${BATCH_SIZE}, Skip Synced: ${skipSynced})...`
    );

    while (true) {
        if (checkSignal) await checkSignal();

        // Fetch top UNSYNCED batch (no cursor needed because processed items drop out)
        const rawBatch = await this.getProducts(
            prisma,
            BATCH_SIZE,
            skipSynced ? undefined : cursorId, // 💡 Pass undefined cursor when skipSynced is true
            skipSynced
        );

        if (!rawBatch || rawBatch.length === 0) {
            console.log(`[ProductOutSyncService] No more unsynced products found. Sync complete.`);
            break;
        }

        // Update cursor for non-mutating loops
        cursorId = rawBatch[rawBatch.length - 1].id;

        if (checkSignal) await checkSignal();

        // Process current batch
        const { processedCount } = await this.processBatch(
            rawBatch,
            brandCustomName,
            checkSignal,
            ITEM_DELAY
        );

        totalProcessed += processedCount;
        batchNo++;

        console.log(
            `[ProductOutSyncService] Batch #${batchNo} complete (${rawBatch.length} fetched, ${processedCount} processed). Total: ${totalProcessed}`
        );

        if (onProgress) {
            await onProgress(totalProcessed);
        }

        // Safe check: If 0 items were successfully processed in a batch, break to prevent an infinite loop
        if (processedCount === 0) {
            console.warn(`[ProductOutSyncService] 0 items processed in batch. Stopping to prevent infinite loop.`);
            break;
        }

        if (INTER_BATCH_DELAY > 0) {
            await this.sleep(INTER_BATCH_DELAY);
        }
        }

    return {
      productsProcessed: totalProcessed,
      syncedAt: new Date().toISOString(),
    };
  }
}

export const productOutSyncService = new ProductOutSyncService();