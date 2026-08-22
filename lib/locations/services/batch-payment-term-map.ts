// lib/payment-terms/services/payment-term-sync-map.service.ts
import { prisma } from "@/lib/prisma";
import { getLocalBatchPaymentTerms } from "../data/payment-term";
import { SyncOptions } from "@/lib/workers/types";

type LocalPaymentTerm = {
  paymentTermsId: number | string;
  name: string;
};

type DbClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export class PaymentTermSyncMapService {
  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Process a single batch within a short-lived Prisma transaction
   */
  async map(
    tx: DbClient,
    records: LocalPaymentTerm[],
    locationInflowId: string,
    checkSignal?: () => Promise<void>
  ) {
    const results: Array<{
      paymentTermInflowId: string;
      status: "synced" | "skipped_not_found";
    }> = [];

    // Step 1: Query global availability by exact name match
    const resolvedPaymentTerms = await Promise.all(
      records.map(async (term) => {
        if (checkSignal) await checkSignal();

        const match = await tx.paymentTerm.findFirst({
          where: { name: term.name },
          select: { inflowId: true },
        });

        if (!match) {
          results.push({
            paymentTermInflowId: String(term.paymentTermsId),
            status: "skipped_not_found",
          });
          return null;
        }

        return { incoming: term, existing: match };
      })
    );

    // Safe type predicate narrowing for matched entities
    const validPaymentTerms = resolvedPaymentTerms.filter(
      (pt): pt is NonNullable<typeof pt> => pt !== null
    );

    // Step 2: Bridge connection inside PaymentTermLocationMap
    for (const { incoming, existing } of validPaymentTerms) {
      if (checkSignal) await checkSignal();

      let locationMap = await tx.paymentTermLocationMap.findUnique({
        where: {
          paymentTermId_locationId: {
            paymentTermId: existing.inflowId,
            locationId: locationInflowId,
          },
        },
        select: { localId: true },
      });

      if (!locationMap) {
        locationMap = await tx.paymentTermLocationMap.create({
          data: {
            paymentTermId: existing.inflowId,
            locationId: locationInflowId,
            localId: Number(incoming.paymentTermsId),
          },
          select: { localId: true },
        });
      }

      results.push({
        paymentTermInflowId: String(incoming.paymentTermsId),
        status: "synced",
      });
    }

    return { processedCount: validPaymentTerms.length, results };
  }

  /**
   * Main Driver Method for Paged/Iterative Payment Terms syncs.
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
      paymentTermInflowId: string;
      status: "synced" | "skipped_not_found";
    }> = [];

    console.log(
      `Starting payment term sync map (Batch Size: ${BATCH_SIZE}, Delay: ${INTER_BATCH_DELAY}ms)...`
    );
    let batchNo = 0;

    while (hasMore) {
      if (checkSignal) await checkSignal();

      const rawBatch: LocalPaymentTerm[] = await getLocalBatchPaymentTerms(
        location.url,
        BATCH_SIZE,
        after
      );

      if (!rawBatch || rawBatch.length === 0) break;

      const lastRecord = rawBatch[rawBatch.length - 1];
      after = String(lastRecord.paymentTermsId);

      if (rawBatch.length < BATCH_SIZE) hasMore = false;

      let batch = rawBatch;
      if (allowedIds) {
        batch = batch.filter((item) =>
          allowedIds.has(String(item.paymentTermsId))
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
        `Batch #${batchNo} completed. Processed ${totalProcessed} payment terms.`
      );

      if (onProgress) await onProgress(totalProcessed);

      if (checkSignal) await checkSignal();

      if (INTER_BATCH_DELAY > 0) {
        await this.sleep(INTER_BATCH_DELAY);
      }
    }

    return {
      paymentTermsProcessed: totalProcessed,
      syncedAt: new Date().toISOString(),
      results: syncResults,
    };
  }
}

const paymentService = new PaymentTermSyncMapService();
export const localPaymentTermServiceMap = paymentService.sync.bind(paymentService);