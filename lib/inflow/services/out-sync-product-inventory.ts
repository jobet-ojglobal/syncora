import { prisma } from "@/lib/prisma";
import { InflowProduct, InflowCustomFields, InflowInventoryLine } from "@/lib/inflow/types";
import { Prisma } from "@/generated/prisma/client";
import { upsertProductBulk } from "../data/products";
import { SyncOptions } from "@/lib/workers/sync.worker";

type DbClient = Prisma.TransactionClient;

export type LocalProductWithRelations = Prisma.ProductGetPayload<{
  include: {
    brand: true;
    category: {
      include: {
        parent: true; 
      };
    };
    cost: true;
    prices: true;
    images: true;
    purchasingUom: { include: { uom: true } };
    salesUom: { include: { uom: true } };
    inventoryBinItems: true;
    inventories: {
      include: {
        location: {
          select: {
            inflowId: true;
            name: true;
            isActive: true;
            isDefault: true;
          };
        };
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

  const cat = product.category;

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

  const inventoryLines: InflowInventoryLine[] = [];
  
  for (const inv of product.inventories) {
    let totalBinQty = 0;

    // --- 1. Map Binned Stock & Bin Serials ---
    for (const bin of inv.bins) {
      const binQty = Number(bin.quantity) || 0;
      totalBinQty += binQty;
      const targetLocationId = bin.sublocation?.linkedLocationId || inv.locationId;
      const sublocationName = bin.sublocation?.name || "";

      if (bin.inventoryBinItems && bin.inventoryBinItems.length > 0) {
        // One inventory line per serialized item
        
        for (const item of bin.inventoryBinItems) {
          const inflowId = crypto.randomUUID().toLowerCase();
            inventoryLines.push({
              inventoryLineId: inflowId,
              lotId: null,
              locationId: targetLocationId,
              productId: product.inflowId,
              quantityOnHand: "1.00000",
              serial: item.serialNumber,
              sublocation: sublocationName,
          });
        }
      } else if (binQty > 0) {
        // Quantity line for non-serialized bin stock
        const inflowId = crypto.randomUUID().toLowerCase();
        inventoryLines.push({
          inventoryLineId: inflowId,
          lotId: null,
          locationId: targetLocationId,
          productId: product.inflowId,
          quantityOnHand: bin.quantity.toString(),
          serial: "",
          sublocation: sublocationName,
        });
      }
    }

    // --- 2. Map Floor Stock (Unbinned) & Floor Serials ---
    const totalOnHand = Number(inv.quantityOnHand) || 0;
    const floorQty = totalOnHand - totalBinQty;

    // Extract floor serials matching this location
    const floorSerials =
      product.inventoryBinItems?.filter(
        (item) => item.locationId === inv.locationId && item.inventoryBinId === null
      ) || [];

    if (floorSerials.length > 0) {
      // One inventory line per floor serial (sublocation = "")
      for (const item of floorSerials) {
        const inflowId = crypto.randomUUID().toLowerCase();
        inventoryLines.push({
          inventoryLineId: inflowId,
          lotId: null,
          locationId: inv.locationId,
          productId: product.inflowId,
          quantityOnHand: "1.00000",
          serial: item.serialNumber,
          sublocation: "",
        });
      }
    } else if (floorQty > 0 || inv.bins.length === 0) {
      // Single quantity line for non-serialized floor stock (sublocation = "")
      const inflowId = crypto.randomUUID().toLowerCase();
      inventoryLines.push({
        inventoryLineId: inflowId,
        lotId: null,
        locationId: inv.locationId,
        productId: product.inflowId,
        quantityOnHand: String(floorQty > 0 ? floorQty : totalOnHand),
        serial: "",
        sublocation: "",
      });
    }
  }

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

    trackExpiry: false, // product.trackExpiry,
    trackLots: false, //product.trackLots,
    trackSerials: product.trackSerials,

    shelfLifeDays: null, // product.shelfLifeDays,
    sellBeforeExpiryDays: null, // product.sellBeforeExpiryDays,
    expiryNotificationDays: null, // product.expiryNotificationDays,

    weight: product.weight?.toString() || null,
    width: product.width?.toString() || null,
    height: product.height?.toString() || null,
    length: product.length?.toString() || null,

    originCountry: product.originCountry,
    hsTariffNumber: product.hsTariffNumber,
    remarks: product.remarks,
    categoryId: cat?.inflowId || defaultCategoryPayload?.inflowId || null,
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
    inventoryLines,
  };
}

export class ProductInventoryOutSyncService {
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
    selectedRecords: string[],
    take: number = 30,
    cursorId?: string,
    excludeIds: string[] = []
  ): Promise<LocalProductWithRelations[]> {
    const whereClause: Prisma.ProductWhereInput = {
      deletedAt: null,
      isActive: true,
      isCloudSynced: false, // <-- Change from true to false
      ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
      ...(selectedRecords.length > 0 ? { inflowId: { in: selectedRecords } } : {}),
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
        inventoryBinItems: {
          where: {
            inventoryBinId: null,
            status: "IN_STOCK",
          },
        },
        inventories: {
          include: {
            bins: {
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

  async processBatchBulk(
    products: LocalProductWithRelations[],
    defaultCategoryPayload: { inflowId: string; name: string; isDefault: boolean } | null,
    brandCustomName?: string,
    checkSignal?: () => Promise<void>
  ): Promise<{
    successfulIds: string[];
    failedIds: string[];
  }> {
    const batchStartTime = performance.now();
    const modifiedById = "56bfcf3b-3e98-4098-ae8f-2adcb657cb57";

    if (checkSignal) await checkSignal();

    // 1. Map all local products into an array payload
    const payloads = products.map((product) =>
      mapLocalProductToInflowPayload(
        product,
        defaultCategoryPayload,
        brandCustomName,
        modifiedById
      )
    );

    const successfulIds: string[] = [];
    const failedIds: string[] = [];

    console.log(JSON.stringify(payloads, null, 2))

    try {
      // 2. Single Bulk API request sending array payload
      const syncedProducts = await upsertProductBulk(payloads); // Bulk API call

      if (Array.isArray(syncedProducts) && syncedProducts.length > 0) {
        // Map returned synced items back to local product IDs
        const syncedProductIds = new Set(
          syncedProducts.map((p) => p.productId).filter(Boolean)
        );

        products.forEach((product) => {
          if (syncedProductIds.has(product.inflowId)) {
            successfulIds.push(product.id);
          } else {
            failedIds.push(product.id);
          }
        });
      } else {
        // If the bulk endpoint returns success without item array, mark all as successful
        successfulIds.push(...products.map((p) => p.id));
      }
    } catch (bulkError: any) {
      console.warn(
        `[Product Sync] Bulk array payload failed (${bulkError?.message || "Error"}). Falling back to item-by-item processing for this batch...`
      );
    }

    // 3. Update database for all successful items in the batch
    if (successfulIds.length > 0) {
      const dbUpdateStart = performance.now();
      await prisma.product.updateMany({
        where: { id: { in: successfulIds } },
        data: { isCloudSynced: true },
      });
      console.log(
        `[Product Sync] Marked ${successfulIds.length} items as synced in DB (${this.formatDuration(performance.now() - dbUpdateStart)})`
      );
    }

    const batchDuration = performance.now() - batchStartTime;
    console.log(
      `[Product Sync] Bulk Batch API processing finished in ${this.formatDuration(batchDuration)} (Avg: ${this.formatDuration(batchDuration / products.length)}/item)`
    );

    return { successfulIds, failedIds };
  }

  async sync(
    options: SyncOptions, 
    selectedRecords: string[],
    brandCustomName?: string,
  ) {
    const syncStartTime = performance.now();
    const { onProgress, checkSignal } = options;
    const BATCH_SIZE = options?.batchSize ?? 50; 
    const INTER_BATCH_DELAY = options?.delayBetweenBatchesMs ?? 1000;

    const defaultCategory = await prisma.category.findFirst({
      where: { isDefault: true },
      select: { inflowId: true, name: true, isDefault: true },
    });

    if (!defaultCategory) {
      console.error("[ProductInventoryOutSyncService] Sync aborted: Default category not found.");
      return { productsProcessed: 0, syncedAt: new Date().toISOString() };
    }

    let totalProcessed = 0;
    let batchNo = 0;
    const processedOrFailedIds: string[] = []; // <-- Track all processed product IDs

    console.log(`[ProductInventoryOutSyncService] Starting sync batching (Size: ${BATCH_SIZE})...`);

    while (true) {
      const iterationStartTime = performance.now();
      if (checkSignal) await checkSignal();

      const fetchStartTime = performance.now();
      const rawBatch = await this.getProducts(
        prisma,
        selectedRecords,
        BATCH_SIZE,
        undefined,
        processedOrFailedIds // <-- Pass processed IDs so they aren't fetched again
      );
      const fetchDuration = performance.now() - fetchStartTime;

      if (!rawBatch || rawBatch.length === 0) {
        console.log(`[ProductInventoryOutSyncService] No more unsynced products found. Sync complete.`);
        break;
      }

      console.log(
        `[ProductInventoryOutSyncService] Fetched ${rawBatch.length} unsynced items in ${this.formatDuration(fetchDuration)}`
      );

      if (checkSignal) await checkSignal();

      const { successfulIds, failedIds } = await this.processBatchBulk(
        rawBatch,
        defaultCategory,
        brandCustomName,
        checkSignal,
      );

      // Track all finished item IDs (both successes and failures)
      processedOrFailedIds.push(...successfulIds, ...failedIds);

      totalProcessed += successfulIds.length;
      batchNo++;

      const iterationDuration = performance.now() - iterationStartTime;

      console.log(
        `[ProductInventoryOutSyncService] Batch #${batchNo} done in ${this.formatDuration(iterationDuration)}. ` +
        `Processed: ${successfulIds.length}, Failed: ${failedIds.length}. Cumulative: ${totalProcessed}`
      );

      if (onProgress) {
        await onProgress(totalProcessed);
      }

      if (successfulIds.length === 0 && failedIds.length === rawBatch.length) {
        console.warn(`[ProductInventoryOutSyncService] Entire batch failed. Stopping execution loop.`);
        break;
      }

      if (INTER_BATCH_DELAY > 0) {
        await this.sleep(INTER_BATCH_DELAY);
      }
    }

    const totalSyncDuration = performance.now() - syncStartTime;
    console.log(
      `[ProductInventoryOutSyncService] Total job execution completed in ${this.formatDuration(totalSyncDuration)}. Total Processed: ${totalProcessed}`
    );

    return {
      productsProcessed: totalProcessed,
      failedCount: processedOrFailedIds.length - totalProcessed,
      syncedAt: new Date().toISOString(),
    };
  }


  /**
   * Fetches products using standard cursor-based pagination.
   * Completely ignores `isCloudSynced`.
   */
  async getProductsNoCheckCloudSync(
    db: DbClient | typeof prisma = prisma,
    selectedRecords: string[],
    take: number = 30,
    cursorId?: string
  ): Promise<LocalProductWithRelations[]> {
    const whereClause: Prisma.ProductWhereInput = {
      deletedAt: null,
      isActive: true,
      ...(selectedRecords.length > 0 ? { inflowId: { in: selectedRecords } } : {}),
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
        inventoryBinItems: {
          where: {
            inventoryBinId: null,
            status: "IN_STOCK",
          },
        },
        inventories: {
          include: {
            bins: {
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
   * Syncs products sequentially page by page until all items are processed.
   */
  async syncNoCheckCloudSync(
    options: SyncOptions,
    selectedRecords: string[] = [],
    brandCustomName?: string
  ) {
    const syncStartTime = performance.now();
    const { onProgress, checkSignal } = options;
    const BATCH_SIZE = options?.batchSize ?? 50;
    const INTER_BATCH_DELAY = options?.delayBetweenBatchesMs ?? 1000;

    const defaultCategory = await prisma.category.findFirst({
      where: { isDefault: true },
      select: { inflowId: true, name: true, isDefault: true },
    });

    if (!defaultCategory) {
      console.error("[ProductInventoryOutSyncService] Sync aborted: Default category not found.");
      return { productsProcessed: 0, syncedAt: new Date().toISOString() };
    }

    let totalProcessed = 0;
    let totalFailed = 0;
    let batchNo = 0;
    let cursorId: string | undefined = undefined;

    console.log(`[ProductInventoryOutSyncService] Starting cursor-based sync loop (Batch Size: ${BATCH_SIZE})...`);

    while (true) {
      const iterationStartTime = performance.now();
      if (checkSignal) await checkSignal();

      const fetchStartTime = performance.now();
      const rawBatch = await this.getProductsNoCheckCloudSync(
        prisma,
        selectedRecords,
        BATCH_SIZE,
        cursorId
      );
      const fetchDuration = performance.now() - fetchStartTime;

      if (!rawBatch || rawBatch.length === 0) {
        console.log(`[ProductInventoryOutSyncService] No more products to fetch. Execution finished.`);
        break;
      }

      console.log(
        `[ProductInventoryOutSyncService] Fetched batch of ${rawBatch.length} products in ${this.formatDuration(fetchDuration)}`
      );

      if (checkSignal) await checkSignal();

      const { successfulIds, failedIds } = await this.processBatchBulk(
        rawBatch,
        defaultCategory,
        brandCustomName,
        checkSignal
      );

      totalProcessed += successfulIds.length;
      totalFailed += failedIds.length;
      batchNo++;

      // Advance cursor to the last item in the fetched batch
      cursorId = rawBatch[rawBatch.length - 1].id;

      const iterationDuration = performance.now() - iterationStartTime;
      console.log(
        `[ProductInventoryOutSyncService] Batch #${batchNo} done in ${this.formatDuration(iterationDuration)}. ` +
        `Success: ${successfulIds.length}, Failed: ${failedIds.length}. Total Processed: ${totalProcessed}`
      );

      if (onProgress) {
        await onProgress(totalProcessed);
      }

      // Break loop if the fetched batch was smaller than requested (end of dataset)
      if (rawBatch.length < BATCH_SIZE) {
        console.log(`[ProductInventoryOutSyncService] Reached end of record set.`);
        break;
      }

      if (INTER_BATCH_DELAY > 0) {
        await this.sleep(INTER_BATCH_DELAY);
      }
    }

    const totalSyncDuration = performance.now() - syncStartTime;
    console.log(
      `[ProductInventoryOutSyncService] Sync finished in ${this.formatDuration(totalSyncDuration)}. Success: ${totalProcessed}, Failed: ${totalFailed}`
    );

    return {
      productsProcessed: totalProcessed,
      failedCount: totalFailed,
      syncedAt: new Date().toISOString(),
    };
  }
}

export const productInventoryOutSyncService = new ProductInventoryOutSyncService();




      // // Fallback: If bulk fails, process items individually to prevent 1 bad item from bricking the batch
      // for (let i = 0; i < products.length; i++) {
      //   const product = products[i];
      //   const payload = payloads[i];

      //   try {
      //     const syncedProduct = await upsertProduct(payload);
      //     if (syncedProduct?.productId) {
      //        console.log(`[Product Upsert] ${product.name}`);
      //       successfulIds.push(product.id);
      //     } else {
      //       failedIds.push(product.id);
      //     }
      //   } catch (itemError: any) {
      //     console.error(`[Product Sync] Item failed (${product.name}):`, itemError?.message || itemError);
      //     failedIds.push(product.id);
      //   }
      // }