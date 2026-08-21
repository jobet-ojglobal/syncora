import { prisma } from "@/lib/prisma";
import { InflowProduct } from "@/lib/inflow/types";
import { getInventoryLevels } from "../data/inventory";
import { SyncOptions } from "@/lib/locations/types";

type SyncCache = {
  verifiedProductIds: Map<string, { productId: string; trackSerials: boolean }>;
  sublocationIds: Map<string, string>; // Maps sublocation name -> Sublocation DB ID
};

export class InventorySyncService {
  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private formatDuration(ms: number): string {
    return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`;
  }

  async processBatch(
    products: InflowProduct[],
    batchNo: number = 0,
    modifiedBy: string,
    selectedRecords: Set<string> | null,
    selectedLocations: Set<string> | null,
    caches: SyncCache,
    checkSignal?: () => Promise<void>,
  ): Promise<{
    successfulIds: string[];
    failedIds: string[];
  }> {
    const batchStartTime = performance.now();
    const successfulIds: string[] = [];
    const failedIds: string[] = [];

    for (const product of products) {
      if (checkSignal) await checkSignal();

      if (selectedRecords && !selectedRecords.has(String(product.productId))) {
        continue;
      }

      let productMeta: { productId: string; trackSerials: boolean } | null = null;

      if (product.productId) {
        const cacheKey = product.productId;
        if (caches.verifiedProductIds.has(cacheKey)) {
          productMeta = caches.verifiedProductIds.get(cacheKey) ?? null;
        } else {
          const localProduct = await prisma.product.findUnique({
            where: { inflowId: product.productId },
            select: { inflowId: true, trackSerials: true },
          });

          if (localProduct) {
            productMeta = {
              productId: localProduct.inflowId,
              trackSerials: localProduct?.trackSerials ?? false,
            };
            caches.verifiedProductIds.set(cacheKey, productMeta);
          }
        }
      }

      if (!productMeta) {
        console.warn(
          `[Sync Notification] Skipping line item "${product.productId}": Unresolved productId.`
        );
        continue;
      }

      if (!product.inventoryLines || product.inventoryLines.length === 0) {
        console.warn(
          `[Sync Debug] Skipping product "${product.name}" (${product.productId}): No inventory lines available.`
        );
        continue;
      }

      let productSuccess = true;

      for (const inv of product.inventoryLines) {
        const targetLocationId = inv.locationId;

        if (selectedLocations && !selectedLocations.has(targetLocationId)) {
          continue;
        }

        const parsedQuantity = Number(inv.quantityOnHand);
        if (!Number.isFinite(parsedQuantity) || parsedQuantity < 0) {
          console.error(
            `Invalid quantityOnHand for ${product.productId}`
          );

          productSuccess = false;
          break;
        }
        const newOnHand = parsedQuantity;

        const incomingSerials = inv.serial
          ? Array.isArray(inv.serial)
            ? inv.serial
            : [inv.serial]
          : [];
        const isTrackSerials = productMeta.trackSerials;
        const sublocationName = inv.sublocation?.trim() || "";

        // Validation: Verify Serial Count === StockOnHand Qty for Tracked Items (even if 0)
        if (isTrackSerials && incomingSerials.length !== newOnHand) {
          console.error(
            `[Sync Validation Error] Mismatch for product "${product.name}" (${product.productId}) at sublocation "${sublocationName}": ` +
            `Serial count (${incomingSerials.length}) does not match stock on hand (${newOnHand}). Skipping line.`
          );
          productSuccess = false;
          break;
        }

        try {
          // Resolve Sublocation DB ID if present
          let dbSublocationId: string | null = null;
          if (sublocationName) {
            const sublocationCacheKey =
            `${targetLocationId}:${sublocationName}`;
            if (caches.sublocationIds.has(sublocationCacheKey)) {
              dbSublocationId =
                caches.sublocationIds.get(sublocationCacheKey)!;
            } else {
              const sublocRecord = await prisma.sublocation.findFirst({
                where: {
                  name: sublocationName,
                  locationId: targetLocationId,
                },
                select: { id: true },
              });

              if (sublocRecord) {
                dbSublocationId = sublocRecord.id;

                caches.sublocationIds.set(
                  sublocationCacheKey,
                  dbSublocationId
                );
              }
            }
          }

          // Fetch current local DB inventory snapshot
          const existingInv = await prisma.inventory.findFirst({
            where: {
              productId: productMeta.productId,
              locationId: targetLocationId,
            },
            include: {
              bins: {
                include: {
                  inventoryBinItems: true,
                },
              },
            },
          });

          const currentOnHand = existingInv ? Number(existingInv.quantityOnHand) : 0;
          const currentReserved = existingInv ? Number(existingInv.quantityReserved) : 0;
          const isOpeningBalance = !existingInv; // Record balance setup even when starting at 0 stock

          // Collect current serial numbers across bins
          const existingBin = dbSublocationId
            ? existingInv?.bins.find(
                (bin) => bin.sublocationId === dbSublocationId
              )
            : null;

          const currentBinQuantity = existingBin
            ? Number(existingBin.quantity)
            : 0;

          const quantityDelta = newOnHand - currentBinQuantity;

          const existingTargetSerials = existingBin
            ? existingBin.inventoryBinItems.map(
                (item) => item.serialNumber
              )
            : [];

          const removedSerials = isTrackSerials
            ? existingTargetSerials.filter((s) => !incomingSerials.includes(s))
            : [];

          const addedSerials = isTrackSerials
            ? incomingSerials.filter((s) => !existingTargetSerials.includes(s))
            : [];

          const serialsChanged = removedSerials.length > 0 || addedSerials.length > 0;

          // Skip if no changes exist and an inventory record is already present
          if (quantityDelta === 0 && !serialsChanged && existingBin) {
            continue;
          }

          const transactionType = isOpeningBalance ? "OPENING_BALANCE" : "ADJUSTMENT";

          // Execute Direct Atomic Synchronization
          await prisma.$transaction(async (tx) => {
            // 1. Upsert Header Inventory Level (Supports 0 stock)
            const inventory = await tx.inventory.upsert({
              where: {
                productId_locationId: {
                  productId: productMeta!.productId,
                  locationId: targetLocationId,
                },
              },
              create: {
                productId: productMeta!.productId,
                locationId: targetLocationId,
                quantityOnHand: newOnHand,
                quantityAvailable: Math.max(0, newOnHand - currentReserved),
                quantityReserved: currentReserved,
                lastMovementAt: new Date(),
              },
              update: {
                quantityOnHand: newOnHand,
                quantityAvailable: Math.max(0, newOnHand - currentReserved),
                lastMovementAt: new Date(),
              },
            });

            // 2. Upsert Sublocation Bin (Updates quantity to 0 if out of stock)
            let binId: string | null = null;
            if (dbSublocationId) {
              const bin = await tx.inventoryBin.upsert({
                where: {
                  inventoryId_sublocationId: {
                    inventoryId: inventory.id,
                    sublocationId: dbSublocationId,
                  },
                },
                create: {
                  inventoryId: inventory.id,
                  sublocationId: dbSublocationId,
                  quantity: newOnHand,
                },
                update: {
                  quantity: newOnHand,
                },
              });
              binId = bin.id;
            }

            // 3. Sync Serial Records
            if (isTrackSerials) {
              // Mark removed serials or all serials as unassigned/damaged when stock hits 0
              if (removedSerials.length > 0) {
                await tx.inventoryBinItem.updateMany({
                  where: {
                    serialNumber: { in: removedSerials },
                    productId: productMeta!.productId,
                  },
                  data: {
                    inventoryBinId: null,
                    status: "DAMAGED",
                  },
                });
              }

              // Update incoming serials if available (>0 quantity)
              for (const serialNum of incomingSerials) {
                await tx.inventoryBinItem.upsert({
                  where: { serialNumber: serialNum },
                  create: {
                    serialNumber: serialNum,
                    productId: productMeta!.productId,
                    locationId: targetLocationId,
                    inventoryBinId: binId,
                    status: "IN_STOCK",
                  },
                  update: {
                    locationId: targetLocationId,
                    inventoryBinId: binId,
                    status: "IN_STOCK",
                  },
                });
              }
            }

            // 4. Record Inventory Ledger Entry
            await tx.inventoryLedger.create({
              data: {
                productId: productMeta!.productId,
                locationId: targetLocationId,
                sublocationId: dbSublocationId,
                transactionType,
                referenceType: "ADJUSTMENT",
                performedById: modifiedBy,
                quantityBefore: currentOnHand,
                quantityChange: quantityDelta,
                quantityAfter: newOnHand,
                remarks: "System Inbound Cloud Inventory Sync",
              },
            });
          });
        } catch (err) {
          console.error(
            `[Product Sync Error] Failed to directly sync product "${product.name}" (${product.productId}):`,
            err
          );
          productSuccess = false;
          break;
        }
      }

      if (productSuccess) {
        successfulIds.push(product.productId);
      } else {
        failedIds.push(product.productId);
      }
    }

    const batchDuration = performance.now() - batchStartTime;
    console.log(`[Product Sync] Batch finished in ${this.formatDuration(batchDuration)}`);

    return { successfulIds, failedIds };
  }

  async batchSync(
    options: SyncOptions, 
    after: string | undefined = undefined,
    selectedRecords: string[],
    selectedLocations: string[], 
    syncedAll: boolean,
  ) {
    const syncStartTime = performance.now();
    const { onProgress, checkSignal } = options;
    const BATCH_SIZE = options?.batchSize ?? 100; 
    const INTER_BATCH_DELAY = options?.delayBetweenBatchesMs ?? 200;

    const modifiedBy = "56bfcf3b-3e98-4098-ae8f-2adcb657cb57";

    const selectedProductIds =
      !syncedAll && selectedRecords && selectedRecords.length > 0
        ? new Set(selectedRecords.map((item) => String(item)))
        : null;

    const selectedLocationIds = selectedLocations && selectedLocations.length > 0
        ? new Set(selectedLocations.map((item) => String(item)))
        : null;

    let totalProcessed = 0;
    let batchNo = 0;
    let cursor: string | undefined = after;

    const caches: SyncCache = {
      verifiedProductIds: new Map(),
      sublocationIds: new Map(),
    };

    const permanentlyFailedIds: string[] = [];

    console.log(`[CloudInventorySyncService] Starting sync batching (Size: ${BATCH_SIZE})...`);

    while (true) {
      const iterationStartTime = performance.now();
      if (checkSignal) await checkSignal();

      const fetchStartTime = performance.now();
      
      const rawBatch: InflowProduct[] = await getInventoryLevels(
        BATCH_SIZE,
        cursor
      );
      const fetchDuration = performance.now() - fetchStartTime;

      if (!rawBatch || rawBatch.length === 0) {
        console.log(`[CloudInventorySyncService] No more products found. Sync complete.`);
        break;
      }

      console.log(
        `[CloudInventorySyncService] Fetched ${rawBatch.length} items in ${this.formatDuration(fetchDuration)}`
      );

      if (checkSignal) await checkSignal();

      const { successfulIds, failedIds } = await this.processBatch(
        rawBatch,
        batchNo,
        modifiedBy,
        selectedProductIds,
        selectedLocationIds,
        caches,
        checkSignal,
      );

      cursor = rawBatch[rawBatch.length - 1].productId;

      if (failedIds.length > 0) {
        permanentlyFailedIds.push(...failedIds);
      }

      totalProcessed += successfulIds.length;
      batchNo++;

      const iterationDuration = performance.now() - iterationStartTime;

      console.log(
        `[CloudInventorySyncService] Batch #${batchNo} done in ${this.formatDuration(iterationDuration)}. ` +
        `Processed: ${successfulIds.length}, Failed: ${failedIds.length}. Cumulative: ${totalProcessed}`
      );

      if (onProgress) {
        await onProgress(totalProcessed);
      }

      if (successfulIds.length === 0 && failedIds.length === rawBatch.length) {
        console.warn(`[CloudInventorySyncService] Entire batch failed. Stopping execution loop.`);
        break;
      }

      if (INTER_BATCH_DELAY > 0) {
        await this.sleep(INTER_BATCH_DELAY);
      }
    }

    const totalSyncDuration = performance.now() - syncStartTime;
    console.log(
      `[CloudInventorySyncService] Total job execution completed in ${this.formatDuration(totalSyncDuration)}. Total Processed: ${totalProcessed}, Total Failed: ${permanentlyFailedIds.length}`
    );

    return {
      inventoryLevelsProcessed: totalProcessed,
      failedCount: permanentlyFailedIds.length,
      syncedAt: new Date().toISOString(),
    };
  }
}

export const cloudInventorySyncService = new InventorySyncService();


// async processBatch(
//     products: InflowProduct[],
//     batchNo: number = 0,
//     modifiedBy: string,
//     selectedRecords: Set<string> | null,
//     selectedLocations: Set<string> | null,
//     caches: SyncCache,
//     checkSignal?: () => Promise<void>,
//   ): Promise<{
//     successfulIds: string[];
//     failedIds: string[];
//   }> {
//     const batchStartTime = performance.now();
//     const successfulIds: string[] = [];
//     const failedIds: string[] = [];
//     const inflowBulkPayloads: InflowStockAdjustInput[] = [];

//     for (const product of products) {
//       if (checkSignal) await checkSignal();

//       if (selectedRecords && !selectedRecords.has(String(product.productId))) {
//         continue;
//       }

//       let productMeta: { productId: string; trackSerials: boolean } | null = null;

//       if (product.productId) {
//         const cacheKey = product.productId;
//         if (caches.verifiedProductIds.has(cacheKey)) {
//           productMeta = caches.verifiedProductIds.get(cacheKey) ?? null;
//         } else {
//           const localProduct = await prisma.product.findUnique({
//             where: { inflowId: product.productId },
//             select: { inflowId: true, trackSerials: true },
//           });

//           if (localProduct) {
//             productMeta = {
//               productId: localProduct.inflowId,
//               trackSerials: localProduct?.trackSerials ?? false,
//             };
//             caches.verifiedProductIds.set(cacheKey, productMeta);
//           }
//         }
//       }

//       if (!productMeta) {
//         console.warn(
//           `[Sync Notification] Skipping line item "${product.productId}": Unresolved productId.`
//         );
//         continue;
//       }

//       if (!product.inventoryLines || product.inventoryLines.length === 0) {
//         console.warn(
//           `[Sync Debug] Skipping product "${product.name}" (${product.productId}): No inventory lines available.`
//         );
//         continue;
//       }

//       let productSuccess = true;

//       for (const inv of product.inventoryLines) {
//         const targetLocationId = inv.locationId;

//         if (selectedLocations && !selectedLocations.has(targetLocationId)) {
//           continue;
//         }

//         const parsedQuantity = Number(inv.quantityOnHand);
//         if (!Number.isFinite(parsedQuantity) || parsedQuantity < 0) {
//           console.error(`Invalid quantityOnHand for ${product.productId}`);
//           productSuccess = false;
//           break;
//         }

//         let newOnHand = parsedQuantity;

//         const incomingSerials = inv.serial
//           ? Array.isArray(inv.serial)
//             ? inv.serial
//             : [inv.serial]
//           : [];
//         const isTrackSerials = productMeta.trackSerials;
//         const sublocationName = inv.sublocation?.trim() || "";

//         // Fetch existing DB snapshot for delta calculations before applying corrections
//         const existingInv = await prisma.inventory.findFirst({
//           where: {
//             productId: productMeta.productId,
//             locationId: targetLocationId,
//           },
//           include: {
//             bins: {
//               include: {
//                 inventoryBinItems: true,
//               },
//             },
//           },
//         });

//         const currentOnHand = existingInv ? Number(existingInv.quantityOnHand) : 0;
//         const currentReserved = existingInv ? Number(existingInv.quantityReserved) : 0;

//         // ----------------------------------------------------------------
//         // Cloud Payload Generation on Serial / Qty Mismatch
//         // ----------------------------------------------------------------
//         if (isTrackSerials && incomingSerials.length !== newOnHand) {
//           console.warn(
//             `[Sync Validation] Mismatch detected for product "${product.name}" (${product.productId}) at sublocation "${sublocationName}": ` +
//             `Serial count (${incomingSerials.length}) vs On Hand (${newOnHand}). Crafting cloud stock adjustment payload.`
//           );

//           const correctiveQtyDelta = incomingSerials.length - currentOnHand;
//           const adjustmentInflowId = crypto.randomUUID().toLowerCase();
//           const lineInflowId = crypto.randomUUID().toLowerCase();

//           const adjustmentPayload: InflowStockAdjustInput = {
//             stockAdjustmentId: adjustmentInflowId,
//             adjustmentNumber: `CORR-${batchNo + 1}-${Date.now().toString().slice(-6)}`,
//             adjustmentReasonId: "",
//             date: new Date().toISOString(),
//             isCancelled: false,
//             lastModifiedById: modifiedBy,
//             locationId: targetLocationId,
//             remarks: `Auto-corrective stock adjustment for ${product.name} serial mismatch`,
//             lines: [
//               {
//                 stockAdjustmentLineId: lineInflowId,
//                 productId: productMeta.productId,
//                 sublocation: sublocationName,
//                 quantity: {
//                   standardQuantity: correctiveQtyDelta > 0 ? `+${correctiveQtyDelta}` : String(correctiveQtyDelta),
//                   uomQuantity: correctiveQtyDelta > 0 ? `+${correctiveQtyDelta}` : String(correctiveQtyDelta),
//                   uom: "ea.",
//                   serialNumbers: incomingSerials,
//                 },
//                 description: `Auto-corrected stock on hand from ${newOnHand} to match ${incomingSerials.length} serials.`,
//               },
//             ],
//           };

//           inflowBulkPayloads.push(adjustmentPayload);

//           // Auto-correct local target stock on hand to mirror serial count
//           newOnHand = incomingSerials.length;
//         }

//         try {
//           // Resolve Sublocation DB ID if present
//           let dbSublocationId: string | null = null;
//           if (sublocationName) {
//             const sublocationCacheKey = `${targetLocationId}:${sublocationName}`;
//             if (caches.sublocationIds.has(sublocationCacheKey)) {
//               dbSublocationId = caches.sublocationIds.get(sublocationCacheKey)!;
//             } else {
//               const sublocRecord = await prisma.sublocation.findFirst({
//                 where: {
//                   name: sublocationName,
//                   locationId: targetLocationId,
//                 },
//                 select: { id: true },
//               });

//               if (sublocRecord) {
//                 dbSublocationId = sublocRecord.id;
//                 caches.sublocationIds.set(sublocationCacheKey, dbSublocationId);
//               }
//             }
//           }

//           const isOpeningBalance = !existingInv;

//           const existingBin = dbSublocationId
//             ? existingInv?.bins.find((bin) => bin.sublocationId === dbSublocationId)
//             : null;

//           const currentBinQuantity = existingBin ? Number(existingBin.quantity) : 0;
//           const quantityDelta = newOnHand - currentBinQuantity;

//           const existingTargetSerials = existingBin
//             ? existingBin.inventoryBinItems.map((item) => item.serialNumber)
//             : [];

//           const removedSerials = isTrackSerials
//             ? existingTargetSerials.filter((s) => !incomingSerials.includes(s))
//             : [];

//           const addedSerials = isTrackSerials
//             ? incomingSerials.filter((s) => !existingTargetSerials.includes(s))
//             : [];

//           const serialsChanged = removedSerials.length > 0 || addedSerials.length > 0;

//           // Skip DB update if nothing changed
//           if (quantityDelta === 0 && !serialsChanged && existingBin) {
//             continue;
//           }

//           const transactionType = isOpeningBalance ? "OPENING_BALANCE" : "ADJUSTMENT";

//           // Execute Direct Atomic Synchronization
//           await prisma.$transaction(async (tx) => {
//             // 1. Upsert Header Inventory Level
//             const inventory = await tx.inventory.upsert({
//               where: {
//                 productId_locationId: {
//                   productId: productMeta!.productId,
//                   locationId: targetLocationId,
//                 },
//               },
//               create: {
//                 productId: productMeta!.productId,
//                 locationId: targetLocationId,
//                 quantityOnHand: newOnHand,
//                 quantityAvailable: Math.max(0, newOnHand - currentReserved),
//                 quantityReserved: currentReserved,
//                 lastMovementAt: new Date(),
//               },
//               update: {
//                 quantityOnHand: newOnHand,
//                 quantityAvailable: Math.max(0, newOnHand - currentReserved),
//                 lastMovementAt: new Date(),
//               },
//             });

//             // 2. Upsert Sublocation Bin
//             let binId: string | null = null;
//             if (dbSublocationId) {
//               const bin = await tx.inventoryBin.upsert({
//                 where: {
//                   inventoryId_sublocationId: {
//                     inventoryId: inventory.id,
//                     sublocationId: dbSublocationId,
//                   },
//                 },
//                 create: {
//                   inventoryId: inventory.id,
//                   sublocationId: dbSublocationId,
//                   quantity: newOnHand,
//                 },
//                 update: {
//                   quantity: newOnHand,
//                 },
//               });
//               binId = bin.id;
//             }

//             // 3. Sync Serial Records
//             if (isTrackSerials) {
//               if (removedSerials.length > 0) {
//                 await tx.inventoryBinItem.updateMany({
//                   where: {
//                     serialNumber: { in: removedSerials },
//                     productId: productMeta!.productId,
//                   },
//                   data: {
//                     inventoryBinId: null,
//                     status: "DAMAGED",
//                   },
//                 });
//               }

//               for (const serialNum of incomingSerials) {
//                 await tx.inventoryBinItem.upsert({
//                   where: { serialNumber: serialNum },
//                   create: {
//                     serialNumber: serialNum,
//                     productId: productMeta!.productId,
//                     locationId: targetLocationId,
//                     inventoryBinId: binId,
//                     status: "IN_STOCK",
//                   },
//                   update: {
//                     locationId: targetLocationId,
//                     inventoryBinId: binId,
//                     status: "IN_STOCK",
//                   },
//                 });
//               }
//             }

//             // 4. Record Inventory Ledger Entry
//             await tx.inventoryLedger.create({
//               data: {
//                 productId: productMeta!.productId,
//                 locationId: targetLocationId,
//                 sublocationId: dbSublocationId,
//                 transactionType,
//                 referenceType: "ADJUSTMENT",
//                 performedById: modifiedBy,
//                 quantityBefore: currentBinQuantity,
//                 quantityChange: quantityDelta,
//                 quantityAfter: newOnHand,
//                 remarks: "System Inbound Cloud Inventory Sync",
//               },
//             });
//           });
//         } catch (err) {
//           console.error(
//             `[Product Sync Error] Failed to directly sync product "${product.name}" (${product.productId}):`,
//             err
//           );
//           productSuccess = false;
//           break;
//         }
//       }

//       if (productSuccess) {
//         successfulIds.push(product.productId);
//       } else {
//         failedIds.push(product.productId);
//       }
//     }

//     // Bulk Send Corrective Payloads to External InFlow API
//     if (inflowBulkPayloads.length > 0) {
//       try {
//         console.log(
//           `[Inventory Sync] Dispatching batch #${batchNo + 1} cloud payload (${inflowBulkPayloads.length} stock adjustment(s)) to inFlow...`
//         );

//         await upsertStockAdjustBulk(inflowBulkPayloads);

//         console.log(`[Inventory Sync] Bulk inFlow cloud sync successful for batch #${batchNo + 1}.`);
//       } catch (error) {
//         console.error(
//           `[Inventory Sync] Failed bulk dispatch to inFlow for batch #${batchNo + 1}:`,
//           error
//         );
//       }
//     } else {
//       console.log(`[Sync Debug] No adjustments generated to push to upsertStockAdjustBulk.`);
//     }

//     const batchDuration = performance.now() - batchStartTime;
//     console.log(`[Product Sync] Batch finished in ${this.formatDuration(batchDuration)}`);

//     return { successfulIds, failedIds };
//   }