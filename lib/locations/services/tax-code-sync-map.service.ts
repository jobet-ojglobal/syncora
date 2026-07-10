// lib/locations/services/tax-code-sync-map.service.ts
import { prisma } from "@/lib/prisma";
import { getTaxCodes } from "../data/tax-code"; // Assuming this handles the data fetching
import { upsertTaxCode } from "@/lib/inflow/services/tax-code.sync";


type SyncOptions = {
  onProgress?: (processedCount: number) => Promise<void>;
};

export class TaxCodeSyncMapService {
  async sync(
    location: {
      inflowId: string;
      name: string;
      url: string;
    },
    options: SyncOptions
  ) {
    const { onProgress } = options;
    
    // Fetch tax codes from your source location endpoint
    const taxCodes = await getTaxCodes(location.url);
    let processed = 0;

    const syncResults: Array<{
      taxCodeInflowId: string;
      localTaxCodeId?: number;
      status: "synced" | "skipped_not_found";
    }> = [];

    await prisma.$transaction(
      async (tx) => {
        /**
         * Step 1: Query global availability by name
         */
        const existingTaxCodes = await Promise.all(
          taxCodes.map(async (taxCode) => {
            // Find global tax code where name matches exactly
            const match = await tx.taxCode.findFirst({
              where: { name: taxCode.name },
              select: { inflowId: true },
            });

            const depTaxScheme = await tx.taxingSchemeLocationMap.findFirst({
              where: { localId: Number(taxCode.taxingSchemeId) }
            });

            let newTaxCode = null

            if(depTaxScheme) {
              const payload = {
                taxCodeId: crypto.randomUUID().toString(),
                taxingSchemeId: taxCode.taxingSchemeId,
                name: taxCode.name,
                isActive: taxCode.isActive == 1 ? true : false,
                tax1Rate: taxCode.tax1Rate,
                tax2Rate: taxCode.tax2Rate,
                timestamp: taxCode.timestamp
              };

              if(!match) {
                  newTaxCode = await upsertTaxCode(payload);
              }
            }

            return { incoming: taxCode, existing: match || newTaxCode };
          })
        );

        // Filter out tax codes that do not exist globally
        const validTaxCodes = existingTaxCodes.filter((tc) => tc.existing !== null);

        // Track skipped entities for auditing purposes
        existingTaxCodes.forEach((tc) => {
          if (!tc.existing) {
            syncResults.push({
              taxCodeInflowId: tc.incoming.taxCodeId,
              status: "skipped_not_found",
            });
          }
        });

        /**
         * Step 2: Bridge connection inside TaxCodeLocationMap
         */
        const mappingPromises = validTaxCodes.map(async ({ incoming, existing }) => {
          // Check for an existing map record unique to this taxCodeId + locationId composite key
          const locationMap = await tx.taxCodeLocationMap.findUnique({
            where: {
              taxCodeId_locationId: {
                taxCodeId: existing!.inflowId, // Using verified global identification key
                locationId: location.inflowId,
              },
            },
            select: { localId: true },
          });

          syncResults.push({
            taxCodeInflowId: incoming.taxCodeId,
            localTaxCodeId: locationMap?.localId,
            status: "synced",
          });
        });

        await Promise.all(mappingPromises);

        processed = validTaxCodes.length;
      },
      {
        timeout: 30000,
      }
    );

    if (onProgress) {
      await onProgress(processed);
    }

    return {
      taxCodesProcessed: processed,
      syncedAt: new Date().toISOString(),
      results: syncResults,
    };
  }
}