import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { LocalCurrency, SyncOptions } from "../types";
import { Prisma } from "@/generated/prisma/client";
import { getLocalBatchCurrencies } from "../data/currency";
import { InflowCurrency } from "@/lib/inflow/types";
import { CurrencyRules, getCurrencyFormattingRules } from "@/helpers/currency";

type DbClient = Prisma.TransactionClient;

/**
 * Shared Caches state across batch sync operations
 */
export type SyncCache = {
  verifiedCurrencyIds: Set<string>;
};

export function createSyncCache(): SyncCache {
  return {
    verifiedCurrencyIds: new Set<string>(),
  };
}

/**
 * Core Payload Transformer
 * Converts a raw local currency record to the structured Inflowcurrency payload.
 */
export function mapLocalToInflowPayload(
  data: LocalCurrency,
  generatedInflowId: string,
  formatting: CurrencyRules
) : InflowCurrency { 
  const trimmedName = data.code?.trim() || "";
  return {
    currencyId: generatedInflowId,
    decimalPlaces: data.decimalPlaces,
    decimalSeparator: data.decimalSeparator,
    isoCode: trimmedName,
    isSymbolFirst: formatting.isSymbolFirst,
    negativeType: formatting.negativeType,
    name: trimmedName,
    symbol: data.symbol,
    thousandsSeparator: data.thousandsSeparator,
  };
}

export class CurrencySyncMapService {
  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async syncCurrency(
    tx: DbClient,
    payload: InflowCurrency,
    caches?: SyncCache
  ) {
    if (!payload.currencyId) return null;

    const verifiedCategories = caches?.verifiedCurrencyIds ?? new Set<string>();

    const isExist = await tx.currency.findFirst({
      where: {
        isoCode: payload.isoCode,
        NOT: {
          inflowId: payload.currencyId,
        },
      },
    });

    if (isExist) {
      verifiedCategories.add(isExist.inflowId);
      return isExist;
    }

    const inflowId = payload.currencyId;
    delete (payload as any).currencyId;

    const syncedCurrency = await tx.currency.upsert({
      where: {
        inflowId,
      },
      create: {
        ...payload,
        inflowId,
      },
      update: {},
    });

    verifiedCategories.add(syncedCurrency.inflowId);

    return syncedCurrency;
  }

  /**
   * Universal Reusable Sub-Batch Transaction Processor.
   * Processes a concrete set of local categories within a transaction context.
   */
  async syncBatch(
    tx: DbClient,
    records: LocalCurrency[],
    locationInflowId: string,
    caches: SyncCache,
    checkSignal?: () => Promise<void>
  ) {
    const results: Array<{
      dataLocalId: string;
      dataInflowId?: string;
      status: "synced" | "skipped_not_found";
    }> = [];

    let processedCount = 0;

    for (const data of records) {
      if (checkSignal) await checkSignal();

      const trimmedName = data.code?.trim();
      if (!trimmedName) {
        results.push({
          dataLocalId: String(data.currencyId),
          status: "skipped_not_found",
        });
        continue;
      }

      // 1. Check existing match by name
      let match = await tx.currency.findFirst({
        where: { isoCode: trimmedName },
        select: { inflowId: true },
      });

      // 2. Resolve or sync the currency record
      if (!match) {
        const generatedInflowId = crypto.randomUUID().toLowerCase();
        const formatting = getCurrencyFormattingRules(data.code);

        const payload = mapLocalToInflowPayload(
          data,
          generatedInflowId,
          formatting
        );

        match = await this.syncCurrency(
          tx,
          payload,
          caches
        );
      }

      if (!match?.inflowId) {
        results.push({
          dataLocalId: String(data.currencyId),
          status: "skipped_not_found",
        });
        continue;
      }

      // 3. Ensure local location bridge mapping
      const localIdNum = Number(data.currencyId);
      const locationMap = await tx.currencyLocationMap.findUnique({
        where: {
          currencyId_locationId: {
            currencyId: match.inflowId,
            locationId: locationInflowId,
          },
        },
        select: { localId: true },
      });

      if (!locationMap) {
        await tx.currencyLocationMap.create({
          data: {
            currencyId: match.inflowId,
            locationId: locationInflowId,
            localId: !isNaN(localIdNum) ? localIdNum : 0,
          },
          select: { localId: true },
        });
      }

      results.push({
        dataLocalId: String(data.currencyId),
        dataInflowId: match.inflowId,
        status: "synced",
      });

      processedCount++;
    }

    return { processedCount, results };
  }

  /**
   * Main Driver Method for Paged/Iterative Inflow API or DB currency syncs.
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
    after: string | undefined = undefined,
  ) {
    const { onProgress, checkSignal } = options;
    const BATCH_SIZE = options?.batchSize ?? 30;
    const INTER_BATCH_DELAY = options?.delayBetweenBatchesMs ?? 300;

    let totalProcessed = 0;
    let hasMore = true;

    const allowedIds =
      !syncedAll && selectedRecords && selectedRecords.length > 0
        ? new Set(selectedRecords.map((item) => String(item.id ?? item.currencyId)))
        : null;

    const syncResults: Array<{
      dataLocalId: string;
      dataInflowId?: string;
      status: "synced" | "skipped_not_found";
    }> = [];

    const caches = createSyncCache();

    console.log(`Starting currency sync map (Batch Size: ${BATCH_SIZE}, Delay: ${INTER_BATCH_DELAY}ms)...`);
    let batchNo = 0;

    while (hasMore) {
      if (checkSignal) await checkSignal();

      const rawBatch: LocalCurrency[] = await getLocalBatchCurrencies(
        location.url,
        BATCH_SIZE,
        after
      );

      if (!rawBatch || rawBatch.length === 0) break;

      after = String(rawBatch[rawBatch.length - 1].currencyId);
      if (rawBatch.length < BATCH_SIZE) hasMore = false;

      let batch = rawBatch;
      if (allowedIds) {
        batch = batch.filter((item) => allowedIds.has(String(item.currencyId)));
      }

      if (batch.length === 0) continue;

      if (checkSignal) await checkSignal();

      // Execute transaction for current batch
      const { processedCount, results } = await prisma.$transaction(
        async (tx) => {
          return await this.syncBatch(
            tx,
            batch,
            location.inflowId,
            caches,
            checkSignal
          );
        },
        { timeout: 60000 }
      );

      totalProcessed += processedCount;
      syncResults.push(...results);
      batchNo++;

      console.log(`Batch #${batchNo} completed. Processed ${totalProcessed} categories.`);

      if (onProgress) await onProgress(totalProcessed);

      if (checkSignal) await checkSignal();

      if (INTER_BATCH_DELAY > 0) {
        await this.sleep(INTER_BATCH_DELAY);
      }
    }

    return {
      categoriesProcessed: totalProcessed,
      syncedAt: new Date().toISOString(),
      results: syncResults,
    };
  }
}