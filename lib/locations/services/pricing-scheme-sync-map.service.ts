// lib/locations/services/pricing-scheme-sync-map.service.ts
import { prisma } from "@/lib/prisma";
import { getPricingSchemes } from "../data/pricing-scheme"; // Assuming this handles the data fetching
import { upsertPricingScheme } from "@/lib/inflow/services/pricing-scheme-only.sync";

type SyncOptions = {
  onProgress?: (processedCount: number) => Promise<void>;
};

export class PricingSchemeSyncMapService {
  async sync(
    location: {
      inflowId: string;
      name: string;
      url: string;
    },
    options: SyncOptions
  ) {
    const { onProgress } = options;
    
    // Fetch pricing schemes from your source location endpoint
    const pricingSchemes = await getPricingSchemes(location.url);
    let processed = 0;

    const syncResults: Array<{
      pricingSchemeInflowId: string;
      localPricingSchemeId?: number;
      status: "synced" | "skipped_not_found";
    }> = [];

    await prisma.$transaction(
      async (tx) => {
        /**
         * Step 1: Query global availability by name
         */
        const existingSchemes = await Promise.all(
          pricingSchemes.map(async (scheme) => {
            // Check if the scheme already exists globally based on the name
            const match = await tx.pricingScheme.findFirst({
              where: { name: scheme.name },
              select: { inflowId: true },
            });

            const depCurrency = await tx.currencyLocationMap.findFirst({
              where: { localId: Number(scheme.currencyId) }
            });

            let newPricing = null
            
            if(depCurrency) {
              const payload = {
                  pricingSchemeId: crypto.randomUUID().toString(),
                  currencyId: scheme.currencyId,
                  name: scheme.name,
                  isActive: scheme.isActive == 1 ? true : false,
                  isDefault: false,
                  isTaxInclusive: scheme.isTaxInclusive == 1 ? true : false,
                  timestamp: scheme.timestamp
              };

              if(!match) {
                  newPricing = await upsertPricingScheme(payload);
              }
            }

            return { incoming: scheme, existing: match || newPricing };
          })
        );

        // Filter out schemes that don't exist globally
        const validSchemes = existingSchemes.filter((ps) => ps.existing !== null);

        // Track skipped entries for debugging/auditing
        existingSchemes.forEach((ps) => {
          if (!ps.existing) {
            syncResults.push({
              pricingSchemeInflowId: ps.incoming.pricingSchemeId,
              status: "skipped_not_found",
            });
          }
        });

        /**
         * Step 2: Bridge connection inside PricingSchemeLocationMap
         */
        const mappingPromises = validSchemes.map(async ({ incoming, existing }) => {
          // Look up if a location map record is already tracking this scheme
          const locationMap = await tx.pricingSchemeLocationMap.findUnique({
            where: {
              pricingSchemeId_locationId: {
                pricingSchemeId: existing!.inflowId, // Using verified global identifier
                locationId: location.inflowId,
              },
            },
            select: { localId: true },
          });

          syncResults.push({
            pricingSchemeInflowId: incoming.pricingSchemeId,
            localPricingSchemeId: locationMap?.localId,
            status: "synced",
          });
        });

        await Promise.all(mappingPromises);

        processed = validSchemes.length;
      },
      {
        timeout: 30000,
      }
    );

    if (onProgress) {
      await onProgress(processed);
    }

    return {
      pricingSchemesProcessed: processed,
      syncedAt: new Date().toISOString(),
      results: syncResults,
    };
  }
}