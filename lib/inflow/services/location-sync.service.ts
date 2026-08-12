import { prisma } from "@/lib/prisma";
import {
  getLocation,
  getLocations,
  getSublocationsByLocation,
} from "../data/locations";
import { syncLocation } from "./location.sync";

type SyncOptions = {
  onProgress?: (progress: number) => Promise<void>;
  checkSignal?: () => Promise<void>;
  batchSize?: number;
  delayBetweenBatchesMs?: number;
};

export class LocationSyncService {
  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async sync(
    options?: SyncOptions,
    selectedRecords?: any[],
    syncedAll?: boolean,
    after: string | undefined = undefined
  ) {
    const BATCH_SIZE = options?.batchSize ?? 100;
    const INTER_BATCH_DELAY = options?.delayBetweenBatchesMs ?? 300;

    let processed = 0;
    let batchNo = 0;

    console.log(selectedRecords)

    console.log(`[Location Sync] Starting service (Batch Size: ${BATCH_SIZE}, Inter-batch Delay: ${INTER_BATCH_DELAY}ms)...`);

    // Helper closure to handle sublocations and DB transactions for a given batch of locations
    const processBatch = async (batch: any[], currentBatchNo: number, totalExpected?: number) => {
      // 1. Check signal before beginning DB operations
      if (options?.checkSignal) await options.checkSignal();

      for (const location of batch) {
        // Fetch external sublocations outside the DB transaction to avoid lock contention
        const sublocationsResponse = await getSublocationsByLocation(
          location.locationId
        );
        const sublocations = sublocationsResponse?.sublocations ?? [];

        await prisma.$transaction(async (tx) => {
          // Sync Location + Address + Default Sublocation
          await syncLocation(tx, location);

          // Sync custom nested storage sublocations
          for (const name of sublocations) {
            if (name === "Default") continue;

            await tx.sublocation.upsert({
              where: {
                locationId_name: {
                  locationId: location.locationId,
                  name,
                },
              },
              create: {
                locationId: location.locationId,
                name,
              },
              update: {},
            });
          }
        });

        processed++;
      }

      console.log(`[Location Sync] Batch #${currentBatchNo} completed. Total processed: ${processed}`);

      if (options?.onProgress) {
        const progressVal = totalExpected && totalExpected > 0 
          ? Math.round((processed / totalExpected) * 100) 
          : processed;
        await options.onProgress(progressVal);
      }

      // 2. Delay between batches to smooth out API traffic
      if (INTER_BATCH_DELAY > 0) {
        await this.sleep(INTER_BATCH_DELAY);
      }
    };

    // BRANCH 1: Sync specific selected locations in chunks
    if (!syncedAll && selectedRecords && selectedRecords.length > 0) {
      const selectedIds = Array.from(
        new Set(
          selectedRecords
            .map((item) => {
              // 1. If selectedRecords is an array of string IDs directly
              if (typeof item === "string") return item;
              
              // 2. Safely resolve object properties
              const rawId = item?.id ?? item?.locationId;
              return rawId ? String(rawId) : null;
            })
            .filter((id): id is string => Boolean(id) && id !== "undefined")
        )
      );

      const totalSelected = selectedIds.length;
      console.log(`[Location Sync] Processing ${totalSelected} selected locations in chunks...`);

      for (let i = 0; i < selectedIds.length; i += BATCH_SIZE) {
        batchNo++;
        if (options?.checkSignal) await options.checkSignal();

        const chunkIds = selectedIds.slice(i, i + BATCH_SIZE);
        console.log(`[Location Sync] Batch #${batchNo}: Fetching ${chunkIds.length} items from remote...`);

        const locationResults = await Promise.allSettled(
          chunkIds.map(async (id) => {
            try {
              return await getLocation(id);
            } catch (err: any) {
              // Treat 404 as non-existent item
              if (err?.status === 404 || String(err).includes("404")) {
                console.warn(`[Location Sync] Location ID ${id} not found on remote (404). Skipping.`);
                return null;
              }
              throw err;
            }
          })
        );

        const validBatch = locationResults
          .filter(
            (res): res is PromiseFulfilledResult<any> => {
              if (res.status === "rejected") {
                console.error(`[Location Sync] Failed to fetch single location:`, res.reason);
              }
              return res.status === "fulfilled" && Boolean(res.value);
            }
          )
          .flatMap((res) => (Array.isArray(res.value) ? res.value : [res.value]));

        if (validBatch.length > 0) {
          await processBatch(validBatch, batchNo, totalSelected);
        }
      }
    } 
    // BRANCH 2: Paginated full sync for all locations
    else {
      console.log("[Location Sync] Starting paginated full locations sync...");

      while (true) {
        if (options?.checkSignal) await options.checkSignal();

        const batch = await getLocations(BATCH_SIZE, after);

        if (!batch || batch.length === 0) break;

        batchNo++;
        console.log(`[Location Sync] Batch #${batchNo}: Processing ${batch.length} locations...`);

        await processBatch(batch, batchNo);

        after = batch[batch.length - 1].locationId;
      }
    }

    console.log(`[Location Sync] Completed sync. Total locations processed: ${processed}`);

    return {
      locationsProcessed: processed,
      syncedAt: new Date().toISOString(),
    };
  }
}

// 8/12/26
// import { prisma } from "@/lib/prisma";
// import {
//   getLocations,
//   getSublocationsByLocation,
// } from "../data/locations";
// import { syncLocation } from "./location.sync";

// type SyncOptions = {
//   onProgress?: (progress: number) => Promise<void>;
// };

// export class LocationSyncService {
//   async sync(options?: SyncOptions,
//     selectedRecords?: any[],
//     syncedAll?: boolean,
//   ) {
//     const locations = await getLocations();

//     let processed = 0;
//     const total = locations.length;

//     for (let i = 0; i < total; i++) {
//       const location = locations[i];

//       await prisma.$transaction(async (tx) => {
//         // Reuse the shared utility to safely write Location + Address + Default Sublocation
//         await syncLocation(tx, location);

//         // Pull down and sync custom nested storage sublocations
//         const sublocationsResponse = await getSublocationsByLocation(location.locationId);
//         const sublocations = sublocationsResponse?.sublocations ?? [];

//         for (const name of sublocations) {
//           if (name === "Default") continue; // Already covered by utility wrapper safely
          
//           await tx.sublocation.upsert({
//             where: {
//               locationId_name: {
//                 locationId: location.locationId,
//                 name,
//               },
//             },
//             create: {
//               locationId: location.locationId,
//               name,
//             },
//             update: {},
//           });
//         }
//       });

//       processed++;
//       await options?.onProgress?.(Math.round((processed / total) * 100));
//     }

//     return {
//       locationsProcessed: processed,
//       syncedAt: new Date().toISOString(),
//     };
//   }
// }

// export class LocationSyncService {
//   async sync(options?: SyncOptions) {
//     const locations = await getLocations();

//     let processed = 0;
//     const total = locations.length;

//     for (let i = 0; i < total; i++) {
//       const location = locations[i];

//       await prisma.$transaction(async (tx) => {
//         await tx.location.upsert({
//           where: {
//             inflowId: location.locationId,
//           },
//           create: {
//             inflowId: location.locationId,
//             name: location.name,
//             isActive: location.isActive,
//             isDefault: location.isDefault,
//             timestamp: location.timestamp,
//           },
//           update: {
//             name: location.name,
//             isActive: location.isActive,
//             isDefault: location.isDefault,
//             timestamp: location.timestamp,
//           },
//         });

//         await tx.locationAddress.upsert({
//           where: {
//             locationId: location.locationId,
//           },
//           create: {
//             locationId: location.locationId,
//             address1: location.address?.address1,
//             address2: location.address?.address2,
//             city: location.address?.city,
//             state: location.address?.state,
//             country: location.address?.country,
//             postalCode: location.address?.postalCode,
//             remarks: location.address?.remarks,
//             addressType: location.address?.addressType,
//           },
//           update: {
//             address1: location.address?.address1,
//             address2: location.address?.address2,
//             city: location.address?.city,
//             state: location.address?.state,
//             country: location.address?.country,
//             postalCode: location.address?.postalCode,
//             remarks: location.address?.remarks,
//             addressType: location.address?.addressType,
//           },
//         });

//         // Create default storage area
//         await tx.sublocation.upsert({
//           where: {
//             locationId_name: {
//               locationId: location.locationId,
//               name: "Default",
//             },
//           },
//           create: {
//             locationId: location.locationId,
//             name: "Default",
//           },
//           update: {},
//         });

//         const sublocationsResponse =
//           await getSublocationsByLocation(
//             location.locationId
//           );

//         const sublocations =
//           sublocationsResponse?.sublocations ??
//           [];

//         for (const name of sublocations) {
//           await tx.sublocation.upsert({
//             where: {
//               locationId_name: {
//                 locationId: location.locationId,
//                 name,
//               },
//             },
//             create: {
//               locationId: location.locationId,
//               name,
//             },
//             update: {},
//           });
//         }
//       });

//       processed++;

//       await options?.onProgress?.(
//         Math.round((processed / total) * 100)
//       );
//     }

//     return {
//       locationsProcessed: processed,
//       syncedAt: new Date().toISOString(),
//     };
//   }
// }

// export class LocationSyncService {
//   async sync(options?: SyncOptions) {
//     const locations = await fetchLocations();

//     let processed = 0;
//     const total = locations.length;

//     for (let i = 0; i < total; i++) {
//       const location = locations[i];

//       await prisma.$transaction(async (tx) => {
//         await tx.location.upsert({
//           where: {
//             inflowId: location.locationId,
//           },
//           create: {
//             inflowId: location.locationId,
//             name: location.name,
//             isActive: location.isActive,
//             isDefault: location.isDefault,
//             timestamp: location.timestamp,
//           },
//           update: {
//             name: location.name,
//             isActive: location.isActive,
//             isDefault: location.isDefault,
//             timestamp: location.timestamp,
//           },
//         });

//         if (location.address) {
//           await tx.locationAddress.upsert({
//             where: {
//               locationId: location.locationId,
//             },
//             create: {
//               locationId: location.locationId,
//               address1: location.address.address1,
//               address2: location.address.address2,
//               city: location.address.city,
//               state: location.address.state,
//               country: location.address.country,
//               postalCode: location.address.postalCode,
//               remarks: location.address.remarks,
//               addressType: location.address.addressType,
//             },
//             update: {
//               address1: location.address.address1,
//               address2: location.address.address2,
//               city: location.address.city,
//               state: location.address.state,
//               country: location.address.country,
//               postalCode: location.address.postalCode,
//               remarks: location.address.remarks,
//               addressType: location.address.addressType,
//             },
//           });
//         }

//         const sublocationResponse =
//           await getSublocationsByLocation(
//             location.locationId
//           );

//         const sublocations =
//           sublocationResponse?.sublocations ?? [];

//         for (const sublocationName of sublocations) {
//           await tx.sublocation.upsert({
//             where: {
//               locationId_name: {
//                 locationId: location.locationId,
//                 name: sublocationName,
//               },
//             },
//             create: {
//               locationId: location.locationId,
//               name: sublocationName,
//             },
//             update: {},
//           });
//         }
//       });

//       processed++;

//       const progress = Math.round(
//         ((i + 1) / total) * 100
//       );

//       await options?.onProgress?.(progress);
//     }

//     return {
//       locationsProcessed: processed,
//       syncedAt: new Date().toISOString(),
//     };
//   }
// }