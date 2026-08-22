// lib/locations/services/sublocation-sync-map.service.ts
import { prisma } from "@/lib/prisma";
import { getLocalBatchLocations } from "../data/location";
import { SyncOptions } from "@/lib/workers/types";
import { sublocationSync } from "./sublocation-sync";

type LocalSublocation = {
  locationId?: number | string;
  id?: number | string;
  name: string;
};

type DbClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export class LocationSyncMapService {
  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async map(
    tx: DbClient,
    records: LocalSublocation[],
    locationInflowId: string,
    checkSignal?: () => Promise<void>
  ) {
    const results: Array<{
      localLocationId: number;
      sublocationId?: string;
      status: "synced" | "skipped_not_found";
    }> = [];

    let processedCount = 0;

    for (const data of records) {
      if (checkSignal) await checkSignal();

      const incomingLocalId = Number(data.locationId ?? data.id);
      const trimmedName = data.name?.trim();

      if (!trimmedName || isNaN(incomingLocalId)) {
        results.push({
          localLocationId: isNaN(incomingLocalId) ? 0 : incomingLocalId,
          status: "skipped_not_found",
        });
        continue;
      }

      // 1. Query existing match by composite key [locationId, name]
      let match = await tx.sublocation.findUnique({
        where: {
          locationId_name: {
            locationId: locationInflowId,
            name: trimmedName,
          },
        },
        select: { id: true },
      });

      if (!match) {
        const payload = {
          locationId: locationInflowId,
          name: data.name,
        };

        // Delegate creation/upsert to sync service using transaction client context
        match = await sublocationSync(tx, payload);
      }

      // 2. Bridge connection inside SublocationLocationMap
      let locationMap = await tx.sublocationLocationMap.findUnique({
        where: {
          sublocationId_locationId: {
            sublocationId: match.id,
            locationId: locationInflowId,
          },
        },
        select: { localId: true },
      });

      if (!locationMap) {
        locationMap = await tx.sublocationLocationMap.create({
          data: {
            sublocationId: match.id,
            locationId: locationInflowId,
            localId: incomingLocalId,
          },
          select: { localId: true },
        });
      }

      results.push({
        localLocationId: incomingLocalId,
        sublocationId: match.id,
        status: "synced",
      });

      processedCount++;
    }

    return { processedCount, results };
  }

  /**
   * Main Driver Method for Paged/Iterative Sublocation syncs.
   */
  async sync(
    location: {
      inflowId: string;
      name: string;
      url: string;
    },
    options: SyncOptions,
    selectedRecords?: any[],
    syncedAll?: boolean,
    after: string | undefined = undefined
  ) {
    const { onProgress, checkSignal } = options;
    const BATCH_SIZE = options?.batchSize ?? 30;
    const INTER_BATCH_DELAY = options?.delayBetweenBatchesMs ?? 300;

    let totalProcessed = 0;
    let hasMore = true;

    const allowedIds =
      !syncedAll && selectedRecords && selectedRecords.length > 0
        ? new Set(selectedRecords.map((id) => String(id)))
        : null;

    const syncResults: Array<{
      localLocationId: number;
      sublocationId?: string;
      status: "synced" | "skipped_not_found";
    }> = [];

    console.log(
      `Starting sublocation sync map (Batch Size: ${BATCH_SIZE}, Delay: ${INTER_BATCH_DELAY}ms)...`
    );
    let batchNo = 0;

    while (hasMore) {
      if (checkSignal) await checkSignal();

      const rawBatch: LocalSublocation[] = await getLocalBatchLocations(
        location.url,
        BATCH_SIZE,
        after
      );

      if (!rawBatch || rawBatch.length === 0) break;

      const lastRecord = rawBatch[rawBatch.length - 1];
      after = String(lastRecord.locationId ?? lastRecord.id);

      if (rawBatch.length < BATCH_SIZE) hasMore = false;

      let batch = rawBatch;
      if (allowedIds) {
        batch = batch.filter((item) =>
          allowedIds.has(String(item.locationId ?? item.id))
        );
      }

      if (batch.length === 0) continue;

      if (checkSignal) await checkSignal();

      // Execute transaction for current batch
      const { processedCount, results } = await prisma.$transaction(
        async (tx) => {
          return await this.map(
            tx,
            batch,
            location.inflowId,
            checkSignal
          );
        },
        { timeout: 60000 }
      );

      totalProcessed += processedCount;
      syncResults.push(...results);
      batchNo++;

      console.log(
        `Batch #${batchNo} completed. Processed ${totalProcessed} sublocations.`
      );

      if (onProgress) await onProgress(totalProcessed);

      if (checkSignal) await checkSignal();

      if (INTER_BATCH_DELAY > 0) {
        await this.sleep(INTER_BATCH_DELAY);
      }
    }

    return {
      locationsProcessed: totalProcessed,
      syncedAt: new Date().toISOString(),
      results: syncResults,
    };
  }
}

const locationService = new LocationSyncMapService();
export const localLocationServiceSyncMap = locationService.sync.bind(locationService);