import { prisma } from "@/lib/prisma";
import { getTaxingSchemes } from "../data/taxing-schemes";
import { Prisma } from "@/generated/prisma/client";

type SyncOptions = {
  onProgress?: (processedCount: number) => Promise<void>;
  batchSize?: number;
};

export class TaxingSchemeSyncService {
  async sync(options?: SyncOptions) {
    const schemes = await getTaxingSchemes();
    let processed = 0;

    await prisma.$transaction(
      async (tx) => {
        /**
         * STEP 1: Sync Taxing Schemes (Parallelized)
         */
        const schemePromises = schemes.map((scheme) => {
          const payload = {
            name: scheme.name,
            isActive: scheme.isActive,
            isDefault: scheme.isDefault,
            calculateTax2OnTax1: scheme.calculateTax2OnTax1,
            tax1Name: scheme.tax1Name,
            tax1OnShipping: scheme.tax1OnShipping,
            tax2Name: scheme.tax2Name,
            tax2OnShipping: scheme.tax2OnShipping,
          };

          return tx.taxingScheme.upsert({
            where: { inflowId: scheme.taxingSchemeId },
            create: { ...payload, inflowId: scheme.taxingSchemeId },
            update: payload,
          });
        });

        /**
         * STEP 2: Sync Tax Codes (Parallelized)
         */
        const taxCodePromises = schemes.flatMap((scheme) => {
          const taxCodes = scheme.taxCodes ?? [];
          return taxCodes.map((taxCode) => {
            const payload = {
              taxingSchemeId: taxCode.taxingSchemeId,
              name: taxCode.name,
              isActive: taxCode.isActive,
              tax1Rate: new Prisma.Decimal(taxCode.tax1Rate),
              tax2Rate: new Prisma.Decimal(taxCode.tax2Rate),
            };

            return tx.taxCode.upsert({
              where: { inflowId: taxCode.taxCodeId },
              create: { ...payload, inflowId: taxCode.taxCodeId },
              update: payload,
            });
          });
        });

        // Run Step 1 and Step 2 concurrently to optimize the DB connection channel
        await Promise.all([...schemePromises, ...taxCodePromises]);

        /**
         * STEP 3: Link Default Tax Codes
         * Must happen AFTER Step 2 records are guaranteed to exist to avoid relation errors.
         */
        const linkPromises = schemes
          .filter((scheme) => scheme.defaultTaxCodeId) // Only update if a default tax code is provided
          .map((scheme) =>
            tx.taxingScheme.update({
              where: { inflowId: scheme.taxingSchemeId },
              data: { defaultTaxCodeId: scheme.defaultTaxCodeId },
            })
          );

        await Promise.all(linkPromises);
        
        processed = schemes.length;
      },
      {
        timeout: 30000, // Halved timeout safely due to massive reduction in network round-trips
      }
    );

    // Call callback hook safely outside database connection locking bounds
    if (options?.onProgress) {
      await options.onProgress(processed);
    }

    return {
      schemesProcessed: processed,
      syncedAt: new Date().toISOString(),
    };
  }
}

// import { prisma } from "@/lib/prisma";

// import { getTaxingSchemes } from "../data/taxing-schemes";
// import { Prisma } from "@/generated/prisma/client";

// type SyncOptions = {
//   onProgress?: (
//     processedCount: number
//   ) => Promise<void>;

//   batchSize?: number;
// };

// export class TaxingSchemeSyncService {
//   async sync(options?: SyncOptions) {
//     const schemes =
//       await getTaxingSchemes();

//     let processed = 0;

//     await prisma.$transaction(
//       async (tx) => {
//         /**
//          * STEP 1
//          * Sync Taxing Schemes
//          */
//         for (const scheme of schemes) {
//           await tx.taxingScheme.upsert({
//             where: {
//               inflowId:
//                 scheme.taxingSchemeId,
//             },
//             create: {
//               inflowId:
//                 scheme.taxingSchemeId,

//               name: scheme.name,

//               isActive:
//                 scheme.isActive,

//               isDefault:
//                 scheme.isDefault,

//               calculateTax2OnTax1:
//                 scheme.calculateTax2OnTax1,

//               tax1Name:
//                 scheme.tax1Name,

//               tax1OnShipping:
//                 scheme.tax1OnShipping,

//               tax2Name:
//                 scheme.tax2Name,

//               tax2OnShipping:
//                 scheme.tax2OnShipping,

//               timestamp:
//                 scheme.timestamp,
//             },
//             update: {
//               name: scheme.name,

//               isActive:
//                 scheme.isActive,

//               isDefault:
//                 scheme.isDefault,

//               calculateTax2OnTax1:
//                 scheme.calculateTax2OnTax1,

//               tax1Name:
//                 scheme.tax1Name,

//               tax1OnShipping:
//                 scheme.tax1OnShipping,

//               tax2Name:
//                 scheme.tax2Name,

//               tax2OnShipping:
//                 scheme.tax2OnShipping,

//               timestamp:
//                 scheme.timestamp,
//             },
//           });
//         }

//         /**
//          * STEP 2
//          * Sync Tax Codes
//          */
//         for (const scheme of schemes) {
//           const taxCodes =
//             scheme.taxCodes ?? [];

//           for (const taxCode of taxCodes) {
//             await tx.taxCode.upsert({
//               where: {
//                 inflowId:
//                   taxCode.taxCodeId,
//               },
//               create: {
//                 inflowId:
//                   taxCode.taxCodeId,

//                 taxingSchemeId:
//                   taxCode.taxingSchemeId,

//                 name: taxCode.name,

//                 isActive:
//                   taxCode.isActive,

//                 tax1Rate:
//                   new Prisma.Decimal(
//                     taxCode.tax1Rate
//                   ),

//                 tax2Rate:
//                   new Prisma.Decimal(
//                     taxCode.tax2Rate
//                   ),

//                 timestamp:
//                   taxCode.timestamp,
//               },
//               update: {
//                 taxingSchemeId:
//                   taxCode.taxingSchemeId,

//                 name: taxCode.name,

//                 isActive:
//                   taxCode.isActive,

//                 tax1Rate:
//                   new Prisma.Decimal(
//                     taxCode.tax1Rate
//                   ),

//                 tax2Rate:
//                   new Prisma.Decimal(
//                     taxCode.tax2Rate
//                   ),

//                 timestamp:
//                   taxCode.timestamp,
//               },
//             });
//           }
//         }

//         /**
//          * STEP 3
//          * Link Default Tax Codes
//          */
//         for (const scheme of schemes) {
//           await tx.taxingScheme.update({
//             where: {
//               inflowId:
//                 scheme.taxingSchemeId,
//             },
//             data: {
//               defaultTaxCodeId:
//                 scheme.defaultTaxCodeId,
//             },
//           });
//         }
//       },
//       {
//         timeout: 60000,
//       }
//     );

//     processed = schemes.length;

//     await options?.onProgress?.(
//       processed
//     );

//     return {
//       schemesProcessed:
//         processed,
//       syncedAt:
//         new Date().toISOString(),
//     };
//   }
// }