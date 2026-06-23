
import { prisma } from "@/lib/prisma";

import { getCurrencies } from "../data/currencies";
import { Prisma } from "@/generated/prisma/client";

type SyncOptions = {
  onProgress?: (
    processedCount: number
  ) => Promise<void>;
};

export class CurrencySyncService {
  async sync(options?: SyncOptions) {
    const currencies =
      await getCurrencies();

    let processed = 0;

    await prisma.$transaction(
      async (tx) => {
        /**
         * Step 1:
         * Sync currencies
         */
        for (const currency of currencies) {
          await tx.currency.upsert({
            where: {
              inflowId:
                currency.currencyId,
            },
            create: {
              inflowId:
                currency.currencyId,
              name: currency.name,
              isoCode:
                currency.isoCode,
              symbol:
                currency.symbol,
              decimalPlaces:
                currency.decimalPlaces,
              decimalSeparator:
                currency.decimalSeparator,
              thousandsSeparator:
                currency.thousandsSeparator,
              isSymbolFirst:
                currency.isSymbolFirst,
              negativeType:
                currency.negativeType,
              timestamp:
                currency.timestamp,
            },
            update: {
              name: currency.name,
              isoCode:
                currency.isoCode,
              symbol:
                currency.symbol,
              decimalPlaces:
                currency.decimalPlaces,

              decimalSeparator:
                currency.decimalSeparator,
              thousandsSeparator:
                currency.thousandsSeparator,
              isSymbolFirst:
                currency.isSymbolFirst,
              negativeType:
                currency.negativeType,
              timestamp:
                currency.timestamp,
            },
          });
        }

        

        /**
         * Step 2:
         * Sync conversions
         */
        for (const currency of currencies) {
          const conversions =
            currency.currencyConversions ??
            [];

            await tx.currencyConversion.deleteMany({
              where: {
                currencyId: currency.currencyId,
                inflowId: {
                notIn: conversions.map(
                    (c) => c.currencyConversionId
                ),
                },
              },
            });

          for (const conversion of conversions) {
            
            await tx.currencyConversion.upsert(
              {
                where: {
                  inflowId:
                    conversion.currencyConversionId,
                },
                create: {
                  inflowId:
                    conversion.currencyConversionId,
                  currencyId:
                    conversion.currencyId,
                  exchangeRate:
                    new Prisma.Decimal(
                      conversion.exchangeRate
                    ),
                  isManual:
                    conversion.isManual,
                  timestamp:
                    conversion.timestamp,
                },

                update: {
                  currencyId:
                    conversion.currencyId,
                  exchangeRate:
                    new Prisma.Decimal(
                      conversion.exchangeRate
                    ),
                  isManual:
                    conversion.isManual,
                  timestamp:
                    conversion.timestamp,
                },
              }
            );
          }

          processed++;
        }
      },
      {
        timeout: 60000,
      }
    );

    await options?.onProgress?.(
      processed
    );

    return {
      currenciesProcessed:
        processed,

      syncedAt:
        new Date().toISOString(),
    };
  }
}