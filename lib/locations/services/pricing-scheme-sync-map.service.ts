// lib/locations/services/pricing-scheme-sync-map.service.ts
import { prisma } from "@/lib/prisma";
import { getPricingSchemes } from "../data/pricing-scheme"; 
import { upsertPricingScheme } from "@/lib/inflow/services/pricing-scheme-only.sync";
import crypto from "crypto";

type SyncOptions = {
  onProgress?: (processedCount: number) => Promise<void>;
};

export class PricingSchemeSyncMapService {
  async syncMap(
    location: {
      inflowId: string;
      name: string;
      url: string;
    },
    options: SyncOptions,
    selectedRecords?: any[],
    syncedAll?: boolean
  ) {
    const { onProgress } = options;
    
    // Fetch pricing schemes from your source location endpoint
    let pricingSchemes = await getPricingSchemes(location.url);

    if (!syncedAll && selectedRecords && selectedRecords.length > 0) {
      const allowedIds = selectedRecords.map(item => String(item.id));
      pricingSchemes = pricingSchemes.filter((data: any) => 
        allowedIds.includes(String(data.pricingSchemeId))
      );
    }

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

            let currencyId: string | null = null;
            
            // Only proceed with global insertion if the relational currency dependency exists
            if (depCurrency) {
              currencyId = depCurrency.currencyId;
            } else {
              const currency = await tx.currency.findFirst({
                where: { isoCode: "PHP" }
              });
              currencyId = currency?.inflowId || null;
            }

            if(currencyId) {
              const generatedInflowId = crypto.randomUUID().toLowerCase();
              const payload = {
                pricingSchemeId: generatedInflowId,
                currencyId, // Pass the global String UUID, not the local Int
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

  async map(
    location: {
      inflowId: string;
      name: string;
      url: string;
    },
    options: SyncOptions,
    selectedRecords?: any[],
    syncedAll?: boolean
  ) {
    const { onProgress } = options;

    // Fetch pricing schemes from your source location endpoint
    let pricingSchemes = await getPricingSchemes(location.url);

    if (!syncedAll && selectedRecords && selectedRecords.length > 0) {
      const allowedIds = new Set(selectedRecords.map((item) => String(item.id)));
      pricingSchemes = pricingSchemes.filter((data: any) =>
        allowedIds.has(String(data.pricingSchemeId))
      );
    }

    let processed = 0;

    const syncResults: Array<{
      pricingSchemeInflowId: string;
      localPricingSchemeId?: number;
      status: "synced" | "skipped_not_found";
    }> = [];

    await prisma.$transaction(
      async (tx) => {
        /**
         * Step 1: Query global availability by name and resolve dependent currency.
         * If the pricing scheme or its dependent currency is not found, skip immediately.
         */
        const resolvedSchemes = await Promise.all(
          pricingSchemes.map(async (scheme) => {
            // Check if the scheme already exists globally based on name
            const match = await tx.pricingScheme.findFirst({
              where: { name: scheme.name },
              select: { inflowId: true },
            });

            if (!match) {
              syncResults.push({
                pricingSchemeInflowId: String(scheme.pricingSchemeId),
                status: "skipped_not_found",
              });
              return null;
            }

            // Find global currency UUID mapped from local currency ID
            const depCurrency = await tx.currencyLocationMap.findFirst({
              where: {
                locationId: location.inflowId,
                localId: Number(scheme.currencyId),
              },
              select: { currencyId: true },
            });

            let currencyId: string | null = depCurrency?.currencyId || null;

            // Optional fallback lookup if location mapping wasn't present
            if (!currencyId) {
              const fallbackCurrency = await tx.currency.findFirst({
                where: { isoCode: "PHP" },
                select: { inflowId: true },
              });
              currencyId = fallbackCurrency?.inflowId || null;
            }

            // Skip if dependent currency cannot be resolved globally
            if (!currencyId) {
              syncResults.push({
                pricingSchemeInflowId: String(scheme.pricingSchemeId),
                status: "skipped_not_found",
              });
              return null;
            }

            return { incoming: scheme, existing: match };
          })
        );

        // Filter down to valid entries using safe type predicate narrowing
        const validSchemes = resolvedSchemes.filter(
          (ps): ps is NonNullable<typeof ps> => ps !== null
        );

        /**
         * Step 2: Bridge connection inside PricingSchemeLocationMap
         */
        await Promise.all(
          validSchemes.map(async ({ incoming, existing }) => {
            let locationMap = await tx.pricingSchemeLocationMap.findUnique({
              where: {
                pricingSchemeId_locationId: {
                  pricingSchemeId: existing.inflowId,
                  locationId: location.inflowId,
                },
              },
              select: { localId: true },
            });

            if (!locationMap) {
              locationMap = await tx.pricingSchemeLocationMap.create({
                data: {
                  pricingSchemeId: existing.inflowId,
                  locationId: location.inflowId,
                  localId: Number(incoming.pricingSchemeId),
                },
                select: { localId: true },
              });
            }

            syncResults.push({
              pricingSchemeInflowId: String(incoming.pricingSchemeId),
              localPricingSchemeId: locationMap.localId,
              status: "synced",
            });
          })
        );

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
