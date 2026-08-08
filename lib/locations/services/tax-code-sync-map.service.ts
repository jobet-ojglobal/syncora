// lib/locations/services/tax-code-sync-map.service.ts
import { prisma } from "@/lib/prisma";
import { getTaxCodes } from "../data/tax-code"; 
import { upsertTaxCode } from "@/lib/inflow/services/tax-code.sync";
import crypto from "crypto";

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
    options: SyncOptions,
    selectedRecords?: any[],
    syncedAll?: boolean
  ) {
    const { onProgress } = options;
    
    // Fetch tax codes from your source location endpoint
    let taxCodes = await getTaxCodes(location.url);

    if (!syncedAll && selectedRecords && selectedRecords.length > 0) {
      const allowedIds = selectedRecords.map(item => String(item.id));
      taxCodes = taxCodes.filter((data: any) => 
        allowedIds.includes(String(data.taxCodeId))
      );
    }

    let processed = 0;

    const syncResults: Array<{
      taxCodeInflowId: string;
      localTaxCodeId?: number;
      status: "synced" | "skipped_not_found";
    }> = [];

    await prisma.$transaction(
      async (tx) => {
        /**
         * Step 1: Query global availability by name, or upsert inline
         */
        const existingTaxCodes = await Promise.all(
          taxCodes.map(async (taxCode) => {
            // Find global tax code where name matches exactly
            let match = await tx.taxCode.findFirst({
              where: { name: taxCode.name },
              select: { inflowId: true },
            });

            // Find the global taxing scheme UUID mapped from this location's local scheme ID
            const depTaxScheme = await tx.taxingSchemeLocationMap.findFirst({
              where: { 
                locationId: location.inflowId,
                localId: Number(taxCode.taxingSchemeId) 
              },
              select: { taxingSchemeId: true } // Confirm this matches your junction table property name
            });

            if (depTaxScheme) {
              const generatedInflowId = crypto.randomUUID().toLowerCase();

              const payload = {
                taxCodeId: generatedInflowId,
                taxingSchemeId: depTaxScheme.taxingSchemeId, // Pass the global string UUID, not the local Int
                name: taxCode.name,
                isActive: Number(taxCode.isActive) === 1,
                tax1Rate: taxCode.tax1Rate,
                tax2Rate: taxCode.tax2Rate,
                timestamp: taxCode.timestamp
              };

              if (!match) {
                // Pass down the running transaction client context
                match = await upsertTaxCode(tx, payload);
              }
            }

            return { incoming: taxCode, existing: match };
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
          let locationMap = await tx.taxCodeLocationMap.findUnique({
            where: {
              taxCodeId_locationId: {
                taxCodeId: existing!.inflowId, 
                locationId: location.inflowId,
              },
            },
            select: { localId: true },
          });

          // CRITICAL FIX: If mapping table row link doesn't exist, build it
          if (!locationMap) {
            locationMap = await tx.taxCodeLocationMap.create({
              data: {
                taxCodeId: existing!.inflowId,
                locationId: location.inflowId,
                localId: Number(incoming.taxCodeId),
              },
              select: { localId: true }
            });
          }

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