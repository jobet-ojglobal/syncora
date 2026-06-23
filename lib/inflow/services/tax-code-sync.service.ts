// import { Prisma } from "@prisma/client";

// import { prisma } from "@/lib/prisma";

// import { getTaxCodes } from "../data/tax-codes";

// type SyncOptions = {
//   onProgress?: (
//     processedCount: number
//   ) => Promise<void>;
// };

// export class TaxCodeSyncService {
//   async sync(options?: SyncOptions) {
//     const taxCodes = await getTaxCodes();

//     let processed = 0;

//     await prisma.$transaction(
//       async (tx) => {
//         for (const taxCode of taxCodes) {
//           /**
//            * Verify parent scheme exists
//            */
//           const scheme =
//             await tx.taxingScheme.findUnique({
//               where: {
//                 inflowId:
//                   taxCode.taxingSchemeId,
//               },
//               select: {
//                 inflowId: true,
//               },
//             });

//           if (!scheme) {
//             console.warn(
//               `Skipping tax code ${taxCode.taxCodeId}. Missing taxing scheme ${taxCode.taxingSchemeId}`
//             );

//             continue;
//           }

//           await tx.taxCode.upsert({
//             where: {
//               inflowId:
//                 taxCode.taxCodeId,
//             },

//             create: {
//               inflowId:
//                 taxCode.taxCodeId,

//               taxingSchemeId:
//                 taxCode.taxingSchemeId,

//               name: taxCode.name,

//               isActive:
//                 taxCode.isActive,

//               tax1Rate:
//                 new Prisma.Decimal(
//                   taxCode.tax1Rate
//                 ),

//               tax2Rate:
//                 new Prisma.Decimal(
//                   taxCode.tax2Rate
//                 ),

//               timestamp:
//                 taxCode.timestamp,
//             },

//             update: {
//               taxingSchemeId:
//                 taxCode.taxingSchemeId,

//               name: taxCode.name,

//               isActive:
//                 taxCode.isActive,

//               tax1Rate:
//                 new Prisma.Decimal(
//                   taxCode.tax1Rate
//                 ),

//               tax2Rate:
//                 new Prisma.Decimal(
//                   taxCode.tax2Rate
//                 ),

//               timestamp:
//                 taxCode.timestamp,
//             },
//           });

//           processed++;
//         }
//       },
//       {
//         timeout: 60000,
//       }
//     );

//     await options?.onProgress?.(
//       processed
//     );

//     return {
//       taxCodesProcessed:
//         processed,
//       syncedAt:
//         new Date().toISOString(),
//     };
//   }
// }