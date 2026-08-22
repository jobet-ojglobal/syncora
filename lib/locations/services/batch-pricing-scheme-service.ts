// lib/pricing-schemes/services/pricing-scheme-sync-map.service.ts
import { prisma } from "@/lib/prisma";
import { getLocalBatchPricingSchemes } from "../data/pricing-scheme";
import { SyncOptions } from "@/lib/workers/types";

type LocalPricingScheme = {
  pricingSchemeId: number | string;
  name: string;
  currencyId?: number | string;
};

type DbClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export class PricingSchemeSyncMapService {
  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Process a single batch within a short-lived Prisma transaction
   */
  async map(
    tx: DbClient,
    records: LocalPricingScheme[],
    locationInflowId: string,
    checkSignal?: () => Promise<void>
  ) {
    const results: Array<{
      pricingSchemeInflowId: string;
      localPricingSchemeId?: number;
      status: "synced" | "skipped_not_found";
    }> = [];

    // Step 1: Query global availability and resolve dependent currency
    const resolvedSchemes = await Promise.all(
      records.map(async (scheme) => {
        if (checkSignal) await checkSignal();

        const match = await tx.pricingScheme.findFirst({
          where: { name: scheme.name },
          select: { inflowId: true },
        });

        if (!match) {
          results.push({
            pricingSchemeInflowId: String(scheme.pricingSchemeId),
            status: "skipped_not_found",
          });
          return null;
        }

        // Resolve currency via mapping table
        const depCurrency = await tx.currencyLocationMap.findFirst({
          where: {
            locationId: locationInflowId,
            localId: Number(scheme.currencyId),
          },
          select: { currencyId: true },
        });

        let currencyId: string | null = depCurrency?.currencyId || null;

        // Fallback currency lookup
        if (!currencyId) {
          const fallbackCurrency = await tx.currency.findFirst({
            where: { isoCode: "PHP" },
            select: { inflowId: true },
          });
          currencyId = fallbackCurrency?.inflowId || null;
        }

        if (!currencyId) {
          results.push({
            pricingSchemeInflowId: String(scheme.pricingSchemeId),
            status: "skipped_not_found",
          });
          return null;
        }

        return { incoming: scheme, existing: match };
      })
    );

    const validSchemes = resolvedSchemes.filter(
      (ps): ps is NonNullable<typeof ps> => ps !== null
    );

    // Step 2: Bridge connection inside PricingSchemeLocationMap
    for (const { incoming, existing } of validSchemes) {
      if (checkSignal) await checkSignal();

      let locationMap = await tx.pricingSchemeLocationMap.findUnique({
        where: {
          pricingSchemeId_locationId: {
            pricingSchemeId: existing.inflowId,
            locationId: locationInflowId,
          },
        },
        select: { localId: true },
      });

      if (!locationMap) {
        locationMap = await tx.pricingSchemeLocationMap.create({
          data: {
            pricingSchemeId: existing.inflowId,
            locationId: locationInflowId,
            localId: Number(incoming.pricingSchemeId),
          },
          select: { localId: true },
        });
      }

      results.push({
        pricingSchemeInflowId: String(incoming.pricingSchemeId),
        localPricingSchemeId: locationMap.localId,
        status: "synced",
      });
    }

    return { processedCount: validSchemes.length, results };
  }

  /**
   * Main Driver Method for Paged/Iterative Pricing Scheme syncs.
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
      pricingSchemeInflowId: string;
      localPricingSchemeId?: number;
      status: "synced" | "skipped_not_found";
    }> = [];

    console.log(
      `Starting pricing scheme sync map (Batch Size: ${BATCH_SIZE}, Delay: ${INTER_BATCH_DELAY}ms)...`
    );
    let batchNo = 0;

    while (hasMore) {
      if (checkSignal) await checkSignal();

      const rawBatch: LocalPricingScheme[] = await getLocalBatchPricingSchemes(
        location.url,
        BATCH_SIZE,
        after
      );

      if (!rawBatch || rawBatch.length === 0) break;

      const lastRecord = rawBatch[rawBatch.length - 1];
      after = String(lastRecord.pricingSchemeId);

      if (rawBatch.length < BATCH_SIZE) hasMore = false;

      let batch = rawBatch;
      if (allowedIds) {
        batch = batch.filter((item) =>
          allowedIds.has(String(item.pricingSchemeId))
        );
      }

      if (batch.length === 0) continue;

      if (checkSignal) await checkSignal();

      // Execute transaction scoped to the current batch
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
        `Batch #${batchNo} completed. Processed ${totalProcessed} pricing schemes.`
      );

      if (onProgress) await onProgress(totalProcessed);

      if (checkSignal) await checkSignal();

      if (INTER_BATCH_DELAY > 0) {
        await this.sleep(INTER_BATCH_DELAY);
      }
    }

    return {
      pricingSchemesProcessed: totalProcessed,
      syncedAt: new Date().toISOString(),
      results: syncResults,
    };
  }
}

const pricingService = new PricingSchemeSyncMapService();
export const localPricingSchemeServiceMap = pricingService.sync.bind(pricingService);