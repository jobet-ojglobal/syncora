// lib/locations/services/pricing-scheme-sync-map.service.ts
import { prisma } from "@/lib/prisma";
import { getPricingSchemes } from "../data/pricing-scheme"; 
import { upsertPricingScheme } from "@/lib/inflow/services/pricing-scheme-only.sync";
import crypto from "crypto";

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
         * Step 1: Query global availability by name, or upsert inline
         */
        const existingSchemes = await Promise.all(
          pricingSchemes.map(async (scheme) => {
            // Check if the scheme already exists globally based on the name
            let match = await tx.pricingScheme.findFirst({
              where: { name: scheme.name },
              select: { inflowId: true },
            });

            // Find the global currency UUID mapped from this location's local currency ID
            const depCurrency = await tx.currencyLocationMap.findFirst({
              where: { 
                locationId: location.inflowId,
                localId: Number(scheme.currencyId) 
              },
              select: { currencyId: true } // Adjust this field name to your schema configuration if necessary
            });

            const newPricing = null;
            
            // Only proceed with global insertion if the relational currency dependency exists
            if (depCurrency) {
              const generatedInflowId = crypto.randomUUID().toLowerCase();

              const payload = {
                pricingSchemeId: generatedInflowId,
                currencyId: depCurrency.currencyId, // Pass the global String UUID, not the local Int
                name: scheme.name,
                isActive: Number(scheme.isActive) === 1,
                isDefault: false,
                isTaxInclusive: Number(scheme.isTaxInclusive) === 1,
                timestamp: scheme.timestamp
              };

              if (!match) {
                // Pass down the running transaction context to avoid connection pool isolation issues
                match = await upsertPricingScheme(tx, payload);
              }
            }

            return { incoming: scheme, existing: match };
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
          let locationMap = await tx.pricingSchemeLocationMap.findUnique({
            where: {
              pricingSchemeId_locationId: {
                pricingSchemeId: existing!.inflowId, 
                locationId: location.inflowId,
              },
            },
            select: { localId: true },
          });

          // CRITICAL FIX: If mapping table bridge doesn't exist, create it!
          if (!locationMap) {
            locationMap = await tx.pricingSchemeLocationMap.create({
              data: {
                pricingSchemeId: existing!.inflowId,
                locationId: location.inflowId,
                localId: Number(incoming.pricingSchemeId),
              },
              select: { localId: true }
            });
          }

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