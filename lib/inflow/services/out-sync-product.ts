import { prisma } from "@/lib/prisma";
import { InflowProduct, InflowCustomFields } from "@/lib/inflow/types";
import { Prisma } from "@/generated/prisma/client";
import { upsertProduct } from "../data/products";
import { SyncOptions } from "@/lib/workers/sync.worker";
import pLimit from "p-limit";

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
  // const mappedCategory = cat
  //   ? {
  //       categoryId: cat.inflowId,
  //       isDefault: cat.isDefault,
  //       name: cat.name,
  //       parentCategoryId: cat.parentId || null,
  //       parentCategory: cat.parent
  //         ? {
  //             categoryId: cat.parent.inflowId,
  //             name: cat.parent.name,
  //             isDefault: cat.parent.isDefault,
  //           }
  //         : undefined,
  //     }
  //   : defaultCategoryPayload
  //   ? {
  //       categoryId: defaultCategoryPayload.inflowId,
  //       isDefault: defaultCategoryPayload.isDefault,
  //       name: defaultCategoryPayload.name,
  //       parentCategoryId: null,
  //     }
  //   : undefined;

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
  };
}

export class ProductOutSyncService {
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
    take: number = 30,
    cursorId?: string,
    excludeIds: string[] = []
  ): Promise<LocalProductWithRelations[]> {
    const whereClause: Prisma.ProductWhereInput = {
      deletedAt: null,
      isActive: true,
      // isCloudSynced: false,
      ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
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
      },
    });
  }

  async processBatch(
    products: LocalProductWithRelations[],
    defaultCategoryPayload: { inflowId: string; name: string; isDefault: boolean } | null,
    brandCustomName?: string,
    checkSignal?: () => Promise<void>,
    concurrency = 1 // Lowered to 1 or 2 to avoid 429 rate limit thrashing
  ): Promise<{
    successfulIds: string[];
    failedIds: string[];
  }> {
    const batchStartTime = performance.now();
    const limit = pLimit(concurrency);
    const modifiedById = "56bfcf3b-3e98-4098-ae8f-2adcb657cb57";

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

          try {
            const syncedProduct = await upsertProduct(payload);

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
        })
      )
    );

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

  async sync(options: SyncOptions, brandCustomName?: string) {
    const syncStartTime = performance.now();
    const { onProgress, checkSignal } = options;
    // Reduced batch size to 20 to keep BullMQ execution time well within stall limits
    const BATCH_SIZE = options?.batchSize ?? 5 ;//20; 
    const API_CONCURRENCY = 5 // 3; // 1 request at a time avoids 429 bursts
    const INTER_BATCH_DELAY = options?.delayBetweenBatchesMs ?? 1000; // 5000; // 1000

    const defaultCategory = await prisma.category.findFirst({
      where: { isDefault: true },
      select: { inflowId: true, name: true, isDefault: true },
    });

    if (!defaultCategory) {
      console.error("[ProductOutSyncService] Sync aborted: Default category not found.");
      return { productsProcessed: 0, syncedAt: new Date().toISOString() };
    }

    let totalProcessed = 0;
    let batchNo = 0;
    const permanentlyFailedIds: string[] = [];

    console.log(`[ProductOutSyncService] Starting sync batching (Size: ${BATCH_SIZE})...`);

    while (true) {
      const iterationStartTime = performance.now();
      if (checkSignal) await checkSignal();

      const fetchStartTime = performance.now();
      const rawBatch = await this.getProducts(
        prisma,
        BATCH_SIZE,
        undefined,
        permanentlyFailedIds
      );
      const fetchDuration = performance.now() - fetchStartTime;

      if (!rawBatch || rawBatch.length === 0) {
        console.log(`[ProductOutSyncService] No more unsynced products found. Sync complete.`);
        break;
      }

      console.log(
        `[ProductOutSyncService] Fetched ${rawBatch.length} unsynced items in ${this.formatDuration(fetchDuration)}`
      );

      if (checkSignal) await checkSignal();

      const { successfulIds, failedIds } = await this.processBatch(
        rawBatch,
        defaultCategory,
        brandCustomName,
        checkSignal,
        API_CONCURRENCY
      );

      if (failedIds.length > 0) {
        permanentlyFailedIds.push(...failedIds);
      }

      totalProcessed += successfulIds.length;
      batchNo++;

      const iterationDuration = performance.now() - iterationStartTime;

      console.log(
        `[ProductOutSyncService] Batch #${batchNo} done in ${this.formatDuration(iterationDuration)}. ` +
        `Processed: ${successfulIds.length}, Failed: ${failedIds.length}. Cumulative: ${totalProcessed}`
      );

      // Heartbeat report to prevent BullMQ stall timeouts
      if (onProgress) {
        await onProgress(totalProcessed);
      }

      if (successfulIds.length === 0 && failedIds.length === rawBatch.length) {
        console.warn(`[ProductOutSyncService] Entire batch failed. Stopping execution loop.`);
        break;
      }

      if (INTER_BATCH_DELAY > 0) {
        await this.sleep(INTER_BATCH_DELAY);
      }

      const totalSyncDuration = performance.now() - syncStartTime;
      console.log(
        `[ProductOutSyncService] Total job execution completed in ${this.formatDuration(totalSyncDuration)}. Total Processed: ${totalProcessed}, Total Failed: ${permanentlyFailedIds.length}`
      );
    }

    return {
      productsProcessed: totalProcessed,
      failedCount: permanentlyFailedIds.length,
      syncedAt: new Date().toISOString(),
    };
  }
}

export const productOutSyncService = new ProductOutSyncService();

//   async processBatch(
//     products: LocalProductWithRelations[],
//     defaultCategoryPayload: { inflowId: string; name: string; isDefault: boolean } | null,
//     brandCustomName?: string,
//     checkSignal?: () => Promise<void>,
//     concurrency = 1 // Lowered to 1 or 2 to avoid 429 rate limit thrashing
//   ): Promise<{
//     successfulIds: string[];
//     failedIds: string[];
//   }> {
//     const limit = pLimit(concurrency);
//     const modifiedById = "56bfcf3b-3e98-4098-ae8f-2adcb657cb57";

//     const results = await Promise.allSettled(
//       products.map((product) =>
//         limit(async () => {
//           if (checkSignal) await checkSignal();

//           const payload = mapLocalProductToInflowPayload(
//             product,
//             defaultCategoryPayload,
//             brandCustomName,
//             modifiedById
//           );

//           try {
//             const syncedProduct = await upsertProduct(payload);

//             if (!syncedProduct?.productId) {
//               throw new Error(`Invalid sync response for product ${product.name}`);
//             }

//             return product.id;
//           } catch (error: any) {
//             // Check for duplicate product name conflict
//             if (
//               error?.body?.includes("product_name_conflict") ||
//               error?.message?.includes("product_name_conflict")
//             ) {
//               console.warn(
//                 `[Product Sync] Name conflict detected for "${product.name}". Skipping to unblock batch.`
//               );
//               // Option: Mark with a specific error flag in DB if needed
//             }
//             throw error;
//           }
//         })
//       )
//     );

//     const successfulIds: string[] = [];
//     const failedIds: string[] = [];

//     results.forEach((res, index) => {
//       if (res.status === "fulfilled") {
//         successfulIds.push(res.value);
//       } else {
//         failedIds.push(products[index].id);
//         console.error(`[Product Sync] Failed (${products[index].name}):`, res.reason);
//       }
//     });

//     if (successfulIds.length > 0) {
//       await prisma.product.updateMany({
//         where: { id: { in: successfulIds } },
//         data: { isCloudSynced: true },
//       });
//     }

//     return { successfulIds, failedIds };
//   }

//   async sync(options: SyncOptions, brandCustomName?: string) {
//     const { onProgress, checkSignal } = options;
//     // Reduced batch size to 20 to keep BullMQ execution time well within stall limits
//     // const BATCH_SIZE = options?.batchSize ?? 20 ;//20; 
//     // const API_CONCURRENCY = 1 // 3; // 1 request at a time avoids 429 bursts
//     // const INTER_BATCH_DELAY = options?.delayBetweenBatchesMs ?? 1000; // 1000

//     const BATCH_SIZE = options?.batchSize ?? 20;
//     const API_CONCURRENCY = 5;
//     const INTER_BATCH_DELAY = 0;

//     const defaultCategory = await prisma.category.findFirst({
//       where: { isDefault: true },
//       select: { inflowId: true, name: true, isDefault: true },
//     });

//     if (!defaultCategory) {
//       console.error("[ProductOutSyncService] Sync aborted: Default category not found.");
//       return { productsProcessed: 0, syncedAt: new Date().toISOString() };
//     }

//     let totalProcessed = 0;
//     let batchNo = 0;
//     const permanentlyFailedIds: string[] = [];

//     console.log(`[ProductOutSyncService] Starting sync batching (Size: ${BATCH_SIZE})...`);

//     while (true) {
//       if (checkSignal) await checkSignal();

//       const rawBatch = await this.getProducts(
//         prisma,
//         BATCH_SIZE,
//         undefined,
//         permanentlyFailedIds
//       );

//       if (!rawBatch || rawBatch.length === 0) {
//         console.log(`[ProductOutSyncService] No more unsynced products found. Sync complete.`);
//         break;
//       }

//       if (checkSignal) await checkSignal();

//       const { successfulIds, failedIds } = await this.processBatch(
//         rawBatch,
//         defaultCategory,
//         brandCustomName,
//         checkSignal,
//         API_CONCURRENCY
//       );

//       if (failedIds.length > 0) {
//         permanentlyFailedIds.push(...failedIds);
//       }

//       totalProcessed += successfulIds.length;
//       batchNo++;

//       console.log(
//         `[ProductOutSyncService] Batch #${batchNo} done. Processed: ${successfulIds.length}, Failed: ${failedIds.length}. Cumulative: ${totalProcessed}`
//       );

//       // Heartbeat report to prevent BullMQ stall timeouts
//       if (onProgress) {
//         await onProgress(totalProcessed);
//       }

//       if (successfulIds.length === 0 && failedIds.length === rawBatch.length) {
//         console.warn(`[ProductOutSyncService] Entire batch failed. Stopping execution loop.`);
//         break;
//       }

//       if (INTER_BATCH_DELAY > 0) {
//         await this.sleep(INTER_BATCH_DELAY);
//       }
//     }

//     return {
//       productsProcessed: totalProcessed,
//       failedCount: permanentlyFailedIds.length,
//       syncedAt: new Date().toISOString(),
//     };
//   }
// }

// export const productOutSyncService = new ProductOutSyncService();