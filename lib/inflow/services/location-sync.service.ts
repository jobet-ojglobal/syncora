import { prisma } from "@/lib/prisma";
import {
  getLocations,
  getSublocationsByLocation,
} from "../data/locations";
import { ensureLocationShell } from "./ensure.service";

type SyncOptions = {
  onProgress?: (progress: number) => Promise<void>;
};

export class LocationSyncService {
  async sync(options?: SyncOptions) {
    const locations = await getLocations();

    let processed = 0;
    const total = locations.length;

    for (let i = 0; i < total; i++) {
      const location = locations[i];

      await prisma.$transaction(async (tx) => {
        // Reuse the shared utility to safely write Location + Address + Default Sublocation
        await ensureLocationShell(tx, location);

        // Pull down and sync custom nested storage sublocations
        const sublocationsResponse = await getSublocationsByLocation(location.locationId);
        const sublocations = sublocationsResponse?.sublocations ?? [];

        for (const name of sublocations) {
          if (name === "Default") continue; // Already covered by utility wrapper safely
          
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
      await options?.onProgress?.(Math.round((processed / total) * 100));
    }

    return {
      locationsProcessed: processed,
      syncedAt: new Date().toISOString(),
    };
  }
}

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