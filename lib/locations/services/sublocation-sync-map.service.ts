// lib/locations/services/sublocation-sync-map.service.ts
import { prisma } from "@/lib/prisma";
import { getLocalLocations } from "../data/location";
import { sublocationSync } from "./sublocation-sync";

type SyncOptions = {
  onProgress?: (processedCount: number) => Promise<void>;
};

export class SublocationSyncMapService {
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

    // Fetch sublocations from the remote location endpoint
    let sublocations = await getLocalLocations(location.url);

    if (!syncedAll && selectedRecords && selectedRecords.length > 0) {
      const allowedIds = selectedRecords.map((item) => String(item.id));
      sublocations = sublocations.filter((data: any) =>
        allowedIds.includes(String(data.locationId ?? data.id))
      );
    }

    let processed = 0;

    const syncResults: Array<{
      localSublocationId: number;
      sublocationId?: string;
      status: "synced" | "skipped_not_found";
    }> = [];

    await prisma.$transaction(
      async (tx) => {
        /**
         * Step 1: Query global availability by [locationId, name], or upsert inline using transaction client
         */
        const existingSublocations = await Promise.all(
          sublocations.map(async (subloc) => {
            // Match against unique composite constraint [locationId, name]
            let match = await tx.sublocation.findUnique({
              where: {
                locationId_name: {
                  locationId: location.inflowId,
                  name: subloc.name,
                },
              },
              select: { id: true },
            });

            if (!match) {
              const payload = {
                locationId: location.inflowId,
                name: subloc.name,
              };

              // Delegate creation/upsert to sync service using transaction client context
              match = await sublocationSync(tx, payload);
            }

            return { incoming: subloc, existing: match };
          })
        );

        // Filter out unmatched sublocations
        const validSublocations = existingSublocations.filter(
          (item) => item.existing !== null
        );

        /**
         * Step 2: Bridge connection inside SublocationLocationMap
         */
        const mappingPromises = validSublocations.map(
          async ({ incoming, existing }) => {
            const incomingLocalId = Number(
              incoming.locationId
            );

            // Check if mapping record exists for the sublocation and location composite key
            let locationMap = await tx.sublocationLocationMap.findUnique({
              where: {
                sublocationId_locationId: {
                  sublocationId: existing!.id,
                  locationId: location.inflowId,
                },
              },
              select: { localId: true },
            });

            // Create mapping if link does not exist
            if (!locationMap) {
              locationMap = await tx.sublocationLocationMap.create({
                data: {
                  sublocationId: existing!.id,
                  locationId: location.inflowId,
                  localId: incomingLocalId,
                },
                select: { localId: true },
              });
            }

            syncResults.push({
              localSublocationId: incomingLocalId,
              sublocationId: existing!.id,
              status: "synced",
            });
          }
        );

        await Promise.all(mappingPromises);
        processed = validSublocations.length;
      },
      {
        timeout: 30000,
      }
    );

    if (onProgress) {
      await onProgress(processed);
    }

    return {
      sublocationsProcessed: processed,
      syncedAt: new Date().toISOString(),
      results: syncResults,
    };
  }
}