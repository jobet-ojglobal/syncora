import { prisma } from "@/lib/prisma";
import { getTaxingSchemes } from "../data/taxing-schemes";
import { linkDefaultTaxCode, syncTaxingScheme } from "./taxing-scheme.sync";

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
        // Step 1 & 2: Process all root entities and structural components
        const primarySyncPromises = schemes.map((scheme) => syncTaxingScheme(tx, scheme));
        await Promise.all(primarySyncPromises);

        // Step 3: Safe link resolution step
        const structuralLinkPromises = schemes.map((scheme) => linkDefaultTaxCode(tx, scheme));
        await Promise.all(structuralLinkPromises);

        processed = schemes.length;
      },
      { timeout: 30000 }
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