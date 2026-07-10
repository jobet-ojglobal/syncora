// lib/locations/services/category-sync-map.service.ts
import { prisma } from "@/lib/prisma";
import { getCategories } from "../data/category"; 
import { syncCategory } from "@/lib/inflow/services/category-sync";
import crypto from "crypto";

type SyncOptions = {
  onProgress?: (processedCount: number) => Promise<void>;
};

export class CategorySyncMapService {
  async sync(
    location: {
      inflowId: string;
      name: string;
      url: string;
    },
    options: SyncOptions
  ) {
    const { onProgress } = options;
    
    const categories = await getCategories(location.url);
    let processed = 0;

    const syncResults: Array<{
      categoryInflowId: string;
      localCategoryId?: number;
      status: "synced" | "skipped_not_found";
    }> = [];

    await prisma.$transaction(
      async (tx) => {
        /**
         * Step 1: Process and align global records
         */
        const existingCategories = await Promise.all(
          categories.map(async (category) => {
            // Check if this location's local integer ID is already mapped to a global record
            const existingMap = await tx.categoryLocationMap.findFirst({
              where: { 
                locationId: location.inflowId, 
                localId: Number(category.categoryId) 
              },
              select: { categoryId: true },
            });

            let globalRecord = null;

            if (existingMap) {
              // Fetch the global record if the mapping exists
              globalRecord = await tx.category.findUnique({
                where: { inflowId: existingMap.categoryId },
                select: { inflowId: true }
              });
            }

            // If no global record exists, generate a new one using your sync helper
            if (!globalRecord) {
              const generatedInflowId = crypto.randomUUID().toLowerCase();

              // Convert local parent integer ID to global parent string UUID
              let globalParentId: string | null = null;
              if (category.parentCategoryId) {
                const parentMap = await tx.categoryLocationMap.findFirst({
                  where: { 
                    locationId: location.inflowId, 
                    localId: Number(category.parentCategoryId) 
                  },
                  select: { categoryId: true }
                });
                globalParentId = parentMap?.categoryId || null;
              }

              const payload = {
                categoryId: generatedInflowId,
                isDefault: false,
                name: category.name,
                parentCategoryId: globalParentId,
                timestamp: category.timestamp
              };

              // Safely triggers your core upsert function inside the transaction block
              globalRecord = await syncCategory(tx, payload);
            }

            return { incoming: category, existing: globalRecord };
          })
        );

        const validCategories = existingCategories.filter((c) => c.existing !== null);

        /**
         * Step 2: Ensure mapping records exist for everything processed
         */
        const mappingPromises = validCategories.map(async ({ incoming, existing }) => {
          let locationMap = await tx.categoryLocationMap.findUnique({
            where: {
              categoryId_locationId: {
                categoryId: existing!.inflowId, 
                locationId: location.inflowId,
              },
            },
            select: { localId: true },
          });

          if (!locationMap) {
            locationMap = await tx.categoryLocationMap.create({
              data: {
                categoryId: existing!.inflowId,
                locationId: location.inflowId,
                localId: Number(incoming.categoryId),
              },
              select: { localId: true }
            });
          }

          syncResults.push({
            categoryInflowId: incoming.categoryId,
            localCategoryId: locationMap?.localId,
            status: "synced",
          });
        });

        await Promise.all(mappingPromises);
        processed = validCategories.length;
      },
      {
        timeout: 45000, 
      }
    );

    if (onProgress) {
      await onProgress(processed);
    }

    return {
      categoriesProcessed: processed,
      syncedAt: new Date().toISOString(),
      results: syncResults,
    };
  }
}

// // lib/locations/services/category-sync-map.service.ts
// import { prisma } from "@/lib/prisma";
// import { getCategories } from "../data/category"; // Assuming this handles the data fetching
// import { syncCategory } from "@/lib/inflow/services/category-sync";
// import { Prisma } from "@/generated/prisma/client";

// type Tx = Prisma.TransactionClient;

// type SyncOptions = {
//   onProgress?: (processedCount: number) => Promise<void>;
// };

// export class CategorySyncMapService {
//   /**
//    * Helper method to format names uniformly to match the @unique slug column
//    */
//   private generateSlug(name: string): string {
//     return name
//       .toLowerCase()
//       .replace(/[^a-z0-9]+/g, "-")
//       .replace(/(^-|-$)+/g, "");
//   }

//   async sync(
//     location: {
//       inflowId: string;
//       name: string;
//       url: string;
//     },
//     options: SyncOptions
//   ) {
//     const { onProgress } = options;
    
//     // Fetch categories using your data fetching helper
//     const categories = await getCategories(location.url);
//     let processed = 0;

//     const syncResults: Array<{
//       categoryInflowId: string;
//       localCategoryId?: number;
//       status: "synced" | "skipped_not_found";
//     }> = [];

//     await prisma.$transaction(
//       async (tx) => {
//         /**
//          * Step 1: Query global availability by unique slug
//          */
//         const existingCategories = await Promise.all(
//           categories.map(async (category) => {
//             const targetSlug = this.generateSlug(category.name);

//             const match = await tx.category.findUnique({
//               where: { slug: targetSlug },
//               select: { inflowId: true },
//             });

//             let newCategory = null

//             if(!match) {
//               newCategory = await prisma.$transaction(
//                 async (tx) => {
//                 const payload = {
//                   categoryId: crypto.randomUUID().toString(),
//                   isDefault: false,
//                   name: category.name,
//                   parentCategoryId: category.parentCategoryId,
//                   timestamp: category.timestamp
//                 };
//                 return await syncCategory(tx, payload);
//               });
//             }

//             return { incoming: category, existing: match || newCategory };
//           })
//         );

//         // Filter down to only categories that actually exist in your global table
//         const validCategories = existingCategories.filter((c) => c.existing !== null);

//         // Track skipped ones for output auditing
//         existingCategories.forEach((c) => {
//           if (!c.existing) {
//             syncResults.push({
//               categoryInflowId: c.incoming.categoryId,
//               status: "skipped_not_found",
//             });
//           }
//         });

//         /**
//          * Step 2: Bridge connection inside Location Mapping for valid ones
//          */
//         const mappingPromises = validCategories.map(async ({ incoming, existing }) => {
//           // If the mapping already exists, fetch it; if not, you'll see it missing here
//           const locationMap = await tx.categoryLocationMap.findUnique({
//             where: {
//               categoryId_locationId: {
//                 categoryId: existing!.inflowId, // Using the verified global inflowId
//                 locationId: location.inflowId,
//               },
//             },
//             select: { localId: true },
//           });

//           syncResults.push({
//             categoryInflowId: incoming.categoryId,
//             localCategoryId: locationMap?.localId,
//             status: "synced",
//           });
//         });

//         await Promise.all(mappingPromises);

//         processed = validCategories.length;
//       },
//       {
//         timeout: 35000, // Slightly bumped to comfortably accommodate nested structures
//       }
//     );

//     if (onProgress) {
//       await onProgress(processed);
//     }

//     return {
//       categoriesProcessed: processed,
//       syncedAt: new Date().toISOString(),
//       results: syncResults,
//     };
//   }
// }