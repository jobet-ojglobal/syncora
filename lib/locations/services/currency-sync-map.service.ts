import { prisma } from "@/lib/prisma";
import { getCurrencies } from "../data/currency";
import { getCurrencyFormattingRules } from "@/helpers/currency";
import crypto from "crypto";

type SyncOptions = {
  onProgress?: (processedCount: number) => Promise<void>;
};

export class CurrencySyncMapService {
  async sync(
    location: {
      inflowId: string;
      name: string;
      url: string;
    },
    options: SyncOptions,
    selectedRecords?: any[]
  ) {
    const { onProgress } = options;
    let currencies = await getCurrencies(location.url);

    if (selectedRecords && selectedRecords.length > 0) {
      const allowedIds = selectedRecords.map(item => String(item.id));
      currencies = currencies.filter((data: any) => 
        allowedIds.includes(String(data.currencyId))
      );
    }

    let processed = 0;

    const syncResults: Array<{
      currencyInflowId: string;
      localCurrencyId?: number;
      status: "synced" | "skipped_not_found";
    }> = [];

    await prisma.$transaction(
      async (tx) => {
        /**
         * Step 1: Query global availability by unique isoCode, create if missing
         */
        const existingCurrencies = await Promise.all(
          currencies.map(async (currency) => {
            let match = await tx.currency.findUnique({
              where: { isoCode: currency.code },
              select: { inflowId: true },
            });

            // If it doesn't exist globally, create it right inside the transaction
            if (!match) {
              const formatting = getCurrencyFormattingRules(currency.code);
              
              // CRITICAL FIX: Make sure the ID generated aligns with your schema's inflowId field
              const generatedInflowId = crypto.randomUUID().toLowerCase();

              match = await tx.currency.create({
                data: {
                  inflowId: generatedInflowId,
                  name: currency.description,
                  isoCode: currency.code,
                  symbol: currency.symbol,
                  decimalPlaces: currency.decimalPlaces,
                  decimalSeparator: currency.decimalSeparator,
                  thousandsSeparator: currency.thousandsSeparator,
                  isSymbolFirst: formatting.isSymbolFirst,
                  negativeType: formatting.negativeType,
                },
                select: { inflowId: true }
              });
            }
            
            return { incoming: currency, existing: match };
          })
        );

        // Filter out any that still failed to resolve or create safely
        const validCurrencies = existingCurrencies.filter((c) => c.existing !== null);

        /**
         * Step 2: Bridge connection inside Location Mapping safely
         */
        const mappingPromises = validCurrencies.map(async ({ incoming, existing }) => {
          // Check if mapping row is already established
          let locationMap = await tx.currencyLocationMap.findUnique({
            where: {
              currencyId_locationId: {
                currencyId: existing!.inflowId, // Confirmed matching global key string
                locationId: location.inflowId,
              },
            },
            select: { localId: true },
          });

          // CRITICAL FIX: If the connection map isn't in your DB, create it!
          if (!locationMap) {
            locationMap = await tx.currencyLocationMap.create({
              data: {
                currencyId: existing!.inflowId,
                locationId: location.inflowId,
                localId: Number(incoming.currencyId), // Maps incoming local integer context identifier
              },
              select: { localId: true }
            });
          }

          syncResults.push({
            currencyInflowId: incoming.currencyId,
            localCurrencyId: locationMap?.localId,
            status: "synced",
          });
        });

        await Promise.all(mappingPromises);
        processed = validCurrencies.length;
      },
      {
        timeout: 30000,
      }
    );

    if (onProgress) {
      await onProgress(processed);
    }

    return {
      currenciesProcessed: processed,
      syncedAt: new Date().toISOString(),
      results: syncResults,
    };
  }
}