import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { Prisma } from "@/generated/prisma/client";
import { getLocalBatchCategories, LocalCategory } from "../data/category";
import { InflowCategory } from "@/lib/inflow/types";
import { genInflowUniqueSlug } from "@/helpers/genUniqueSlug";
import { SyncOptions } from "@/lib/workers/types";

type DbClient = Prisma.TransactionClient;

/**
 * Shared Caches state across batch sync operations
 */
export type SyncCache = {
  verifiedCategoryIds: Set<string>;
};

export function createSyncCache(): SyncCache {
  return {
    verifiedCategoryIds: new Set<string>(),
  };
}

/**
 * Core Payload Transformer
 * Converts a raw local category record to the structured Inflowcategory payload.
 */
export function mapLocalToInflowPayload(
  data: LocalCategory,
  generatedInflowId: string
): InflowCategory { //Inflow & { slug?: string }
  const trimmedName = data.name?.trim() || "";
  return {
    ...data,
    categoryId: generatedInflowId,
    isDefault: false,
    name: trimmedName
  };
}

export class CategorySyncMapService {
  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async syncCategory(
    tx: DbClient,
    payload: InflowCategory,
    caches?: SyncCache
  ) {
    if (!payload.categoryId) return null;

    const verifiedCategories = caches?.verifiedCategoryIds ?? new Set<string>();

    const isExist = await tx.category.findFirst({
      where: {
        name: payload.name,
        NOT: {
          inflowId: payload.categoryId,
        },
      },
    });

    if (isExist) {
      verifiedCategories.add(isExist.inflowId);
      return isExist;
    }

    const slug = await genInflowUniqueSlug(
      payload.name || "category",
      tx.category,
      payload.categoryId
    );

    const syncedCategory = await tx.category.upsert({
      where: {
        inflowId: payload.categoryId,
      },
      create: {
        inflowId: payload.categoryId,
        name: payload.name,
        slug,
      },
      update: {},
    });

    verifiedCategories.add(syncedCategory.inflowId);

    return syncedCategory;
  }

  /**
   * Universal Reusable Sub-Batch Transaction Processor.
   * Processes a concrete set of local categories within a transaction context.
   */
  async syncMap(
    tx: DbClient,
    records: LocalCategory[],
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

      const trimmedName = data.name?.trim();
      if (!trimmedName) {
        results.push({
          dataLocalId: String(data.categoryId),
          status: "skipped_not_found",
        });
        continue;
      }

      // 1. Check existing match by name
      let match = await tx.category.findFirst({
        where: { name: trimmedName },
        select: { inflowId: true },
      });

      // 2. Resolve or sync the category record
      if (!match) {
        const generatedInflowId = crypto.randomUUID().toLowerCase();

        const payload = mapLocalToInflowPayload(
          data,
          generatedInflowId
        );

        match = await this.syncCategory(
          tx,
          payload,
          caches
        );
      }

      if (!match?.inflowId) {
        results.push({
          dataLocalId: String(data.categoryId),
          status: "skipped_not_found",
        });
        continue;
      }

      // 3. Ensure local location bridge mapping
      const localIdNum = Number(data.categoryId);
      const locationMap = await tx.categoryLocationMap.findUnique({
        where: {
          categoryId_locationId: {
            categoryId: match.inflowId,
            locationId: locationInflowId,
          },
        },
        select: { localId: true },
      });

      if (!locationMap) {
        await tx.categoryLocationMap.create({
          data: {
            categoryId: match.inflowId,
            locationId: locationInflowId,
            localId: !isNaN(localIdNum) ? localIdNum : 0,
          },
          select: { localId: true },
        });
      }

      results.push({
        dataLocalId: String(data.categoryId),
        dataInflowId: match.inflowId,
        status: "synced",
      });

      processedCount++;
    }

    return { processedCount, results };
  }

  async map(
    tx: DbClient,
    records: LocalCategory[],
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

      const trimmedName = data.name?.trim();
      if (!trimmedName) {
        results.push({
          dataLocalId: String(data.categoryId),
          status: "skipped_not_found",
        });
        continue;
      }

      // 1. Check existing match by name
      const match = await tx.category.findFirst({
        where: { name: trimmedName },
        select: { inflowId: true },
      });

      if (!match?.inflowId) {
        results.push({
          dataLocalId: String(data.categoryId),
          status: "skipped_not_found",
        });
        continue;
      }

      // 3. Ensure local location bridge mapping
      const localIdNum = Number(data.categoryId);
      const locationMap = await tx.categoryLocationMap.findUnique({
        where: {
          categoryId_locationId: {
            categoryId: match.inflowId,
            locationId: locationInflowId,
          },
        },
        select: { localId: true },
      });

      if (!locationMap) {
        await tx.categoryLocationMap.create({
          data: {
            categoryId: match.inflowId,
            locationId: locationInflowId,
            localId: !isNaN(localIdNum) ? localIdNum : 0,
          },
          select: { localId: true },
        });
      }

      results.push({
        dataLocalId: String(data.categoryId),
        dataInflowId: match.inflowId,
        status: "synced",
      });

      processedCount++;
    }

    return { processedCount, results };
  }

  /**
   * Main Driver Method for Paged/Iterative Inflow API or DB category syncs.
   */
  async sync(
    location: {
      inflowId: string;
      name: string;
      url: string;
    },
    options: SyncOptions,
    selectedRecords?: string[],
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
        ? new Set(selectedRecords.map((id) => String(id)))
        : null;

    const syncResults: Array<{
      dataLocalId: string;
      dataInflowId?: string;
      status: "synced" | "skipped_not_found";
    }> = [];

    const caches = createSyncCache();

    console.log(`Starting category sync map (Batch Size: ${BATCH_SIZE}, Delay: ${INTER_BATCH_DELAY}ms)...`);
    let batchNo = 0;

    while (hasMore) {
      if (checkSignal) await checkSignal();

      const rawBatch: LocalCategory[] = await getLocalBatchCategories(
        location.url,
        BATCH_SIZE,
        after
      );

      if (!rawBatch || rawBatch.length === 0) break;

      after = String(rawBatch[rawBatch.length - 1].categoryId);
      if (rawBatch.length < BATCH_SIZE) hasMore = false;

      let batch = rawBatch;
      if (allowedIds) {
        batch = batch.filter((item) => allowedIds.has(String(item.categoryId)));
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

const categoryService = new CategorySyncMapService();
export const localCategoryServiceMap = categoryService.sync.bind(categoryService);