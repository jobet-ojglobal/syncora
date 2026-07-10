import { getCurrencies } from "../data/currencies";
import { upsertCurrencyScheme } from "./currency.sync";

type SyncOptions = {
  onProgress?: (processedCount: number) => Promise<void>;
};

export class CurrencySyncService {
  async sync(options?: SyncOptions) {
    const currencies = await getCurrencies();
    let processed = 0;
    const total = currencies.length;

    // Process sequentially or in controlled chunks to safeguard connection limits
    for (let i = 0; i < total; i++) {
      const currency = currencies[i];
      
      // Fire single isolated atomic write pipeline
      await upsertCurrencyScheme(currency);
      
      processed++;

      // Progress reporting now triggers predictably per record iteration
      if (options?.onProgress) {
        await options.onProgress(processed);
      }
    }

    return {
      currenciesProcessed: processed,
      syncedAt: new Date().toISOString(),
    };
  }
}

// import { prisma } from "@/lib/prisma";
// import { getCurrencies } from "../data/currencies";
// import { Prisma } from "@/generated/prisma/client";

// type SyncOptions = {
//   onProgress?: (processedCount: number) => Promise<void>;
// };

// export class CurrencySyncService {
//   async sync(options?: SyncOptions) {
//     const currencies = await getCurrencies();
//     let processed = 0;

//     await prisma.$transaction(
//       async (tx) => {
//         /**
//          * Step 1: Sync all currencies concurrently
//          */
//         const currencyPromises = currencies.map((currency) => {
//           const payload = {
//             name: currency.name,
//             isoCode: currency.isoCode,
//             symbol: currency.symbol,
//             decimalPlaces: currency.decimalPlaces,
//             decimalSeparator: currency.decimalSeparator,
//             thousandsSeparator: currency.thousandsSeparator,
//             isSymbolFirst: currency.isSymbolFirst,
//             negativeType: currency.negativeType,
//           };

//           return tx.currency.upsert({
//             where: { inflowId: currency.currencyId },
//             create: { ...payload, inflowId: currency.currencyId },
//             update: payload,
//           });
//         });

//         // Resolve currency upserts in parallel batches within the transaction
//         await Promise.all(currencyPromises);

//         /**
//          * Step 2: Sync conversions
//          */
//         const conversionOperations = currencies.flatMap((currency) => {
//           const conversions = currency.currencyConversions ?? [];
//           const conversionIds = conversions.map((c) => c.currencyConversionId);

//           // 1. Delete removed conversions for this currency
//           const deleteOp = tx.currencyConversion.deleteMany({
//             where: {
//               currencyId: currency.currencyId,
//               inflowId: { notIn: conversionIds },
//             },
//           });

//           // 2. Upsert current conversions
//           const upsertOps = conversions.map((conversion) => {
//             const payload = {
//               currencyId: conversion.currencyId,
//               exchangeRate: new Prisma.Decimal(conversion.exchangeRate),
//               isManual: conversion.isManual,
//             };

//             return tx.currencyConversion.upsert({
//               where: { inflowId: conversion.currencyConversionId },
//               create: { ...payload, inflowId: conversion.currencyConversionId },
//               update: payload,
//             });
//           });

//           return [deleteOp, ...upsertOps];
//         });

//         // Run all conversion deletions and upserts concurrently
//         await Promise.all(conversionOperations);
        
//         processed = currencies.length;
//       },
//       {
//         timeout: 30000, // Reduced from 60s since batch execution is vastly faster
//       }
//     );

//     // Call progress hook safely outside the DB transaction block
//     if (options?.onProgress) {
//       await options.onProgress(processed);
//     }

//     return {
//       currenciesProcessed: processed,
//       syncedAt: new Date().toISOString(),
//     };
//   }
// }






// =====================

// import { prisma } from "@/lib/prisma";

// import { getCurrencies } from "../data/currencies";
// import { Prisma } from "@/generated/prisma/client";

// type SyncOptions = {
//   onProgress?: (
//     processedCount: number
//   ) => Promise<void>;
// };

// export class CurrencySyncService {
//   async sync(options?: SyncOptions) {
//     const currencies =
//       await getCurrencies();

//     let processed = 0;

//     await prisma.$transaction(
//       async (tx) => {
//         /**
//          * Step 1:
//          * Sync currencies
//          */
//         for (const currency of currencies) {
//           await tx.currency.upsert({
//             where: {
//               inflowId:
//                 currency.currencyId,
//             },
//             create: {
//               inflowId:
//                 currency.currencyId,
//               name: currency.name,
//               isoCode:
//                 currency.isoCode,
//               symbol:
//                 currency.symbol,
//               decimalPlaces:
//                 currency.decimalPlaces,
//               decimalSeparator:
//                 currency.decimalSeparator,
//               thousandsSeparator:
//                 currency.thousandsSeparator,
//               isSymbolFirst:
//                 currency.isSymbolFirst,
//               negativeType:
//                 currency.negativeType,
//               timestamp:
//                 currency.timestamp,
//             },
//             update: {
//               name: currency.name,
//               isoCode:
//                 currency.isoCode,
//               symbol:
//                 currency.symbol,
//               decimalPlaces:
//                 currency.decimalPlaces,

//               decimalSeparator:
//                 currency.decimalSeparator,
//               thousandsSeparator:
//                 currency.thousandsSeparator,
//               isSymbolFirst:
//                 currency.isSymbolFirst,
//               negativeType:
//                 currency.negativeType,
//               timestamp:
//                 currency.timestamp,
//             },
//           });
//         }

        

//         /**
//          * Step 2:
//          * Sync conversions
//          */
//         for (const currency of currencies) {
//           const conversions =
//             currency.currencyConversions ??
//             [];

//             await tx.currencyConversion.deleteMany({
//               where: {
//                 currencyId: currency.currencyId,
//                 inflowId: {
//                 notIn: conversions.map(
//                     (c) => c.currencyConversionId
//                 ),
//                 },
//               },
//             });

//           for (const conversion of conversions) {
            
//             await tx.currencyConversion.upsert(
//               {
//                 where: {
//                   inflowId:
//                     conversion.currencyConversionId,
//                 },
//                 create: {
//                   inflowId:
//                     conversion.currencyConversionId,
//                   currencyId:
//                     conversion.currencyId,
//                   exchangeRate:
//                     new Prisma.Decimal(
//                       conversion.exchangeRate
//                     ),
//                   isManual:
//                     conversion.isManual,
//                   timestamp:
//                     conversion.timestamp,
//                 },

//                 update: {
//                   currencyId:
//                     conversion.currencyId,
//                   exchangeRate:
//                     new Prisma.Decimal(
//                       conversion.exchangeRate
//                     ),
//                   isManual:
//                     conversion.isManual,
//                   timestamp:
//                     conversion.timestamp,
//                 },
//               }
//             );
//           }

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
//       currenciesProcessed:
//         processed,

//       syncedAt:
//         new Date().toISOString(),
//     };
//   }
// }