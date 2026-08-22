// lib/taxes/services/taxing-scheme-sync-map.service.ts
import { prisma } from "@/lib/prisma";
import { getLocalBatchTaxingSchemes } from "../data/taxing-scheme";
import { LocalTaxingScheme } from "../types";
import { SyncOptions } from "@/lib/workers/types";

type DbClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export class TaxingSchemeSyncMapService {
  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Process a single batch within a Prisma transaction
   */
  async map(
    tx: DbClient,
    records: LocalTaxingScheme[],
    locationInflowId: string,
    checkSignal?: () => Promise<void>
  ) {
    const results: Array<{
      taxingSchemeInflowId: string;
      localTaxingSchemeId?: number;
      status: "synced" | "skipped_not_found";
    }> = [];

    // Step 1: Query global availability and resolve code dependencies
    const resolvedSchemesPromises = records.map(async (scheme) => {
      if (checkSignal) await checkSignal();

      const schemeInflowId = String(scheme.taxingSchemeId);

      // Find global taxing scheme matching by exact name
      const match = await tx.taxingScheme.findFirst({
        where: { name: scheme.name },
        select: { inflowId: true },
      });

      if (!match) {
        results.push({
          taxingSchemeInflowId: schemeInflowId,
          status: "skipped_not_found",
        });
        return null;
      }

      let globalDefaultTaxCodeId: string | null = null;

      // Resolve default tax code dependency mapping if present
      if (scheme.defaultTaxCodeId) {
        const depTaxCode = await tx.taxCodeLocationMap.findFirst({
          where: {
            locationId: locationInflowId,
            localId: Number(scheme.defaultTaxCodeId),
          },
          select: { taxCodeId: true },
        });
        globalDefaultTaxCodeId = depTaxCode?.taxCodeId || null;
      }

      // Resolve child tax codes
      const mappedTaxCodes = scheme.taxCodes
        ? await Promise.all(
            scheme.taxCodes.map(async (code) => {
              const codeMatch = await tx.taxCode.findFirst({
                where: { name: code.name, taxingSchemeId: match.inflowId },
                select: { inflowId: true },
              });

              return {
                taxCodeId:
                  codeMatch?.inflowId || crypto.randomUUID().toLowerCase(),
                name: code.name,
                isActive: Number(code.isActive) === 1,
                tax1Rate: code.tax1Rate,
                tax2Rate: code.tax2Rate,
                _localId: Number(code.taxCodeId),
              };
            })
          )
        : [];

      // Update parent default tax code association if resolved
      if (globalDefaultTaxCodeId) {
        await tx.taxingScheme.update({
          where: { inflowId: match.inflowId },
          data: { defaultTaxCodeId: globalDefaultTaxCodeId },
        });
      }

      return {
        incoming: scheme,
        existing: match,
        processedTaxCodes: mappedTaxCodes,
      };
    });

    const validSchemes = (await Promise.all(resolvedSchemesPromises)).filter(
      (item): item is NonNullable<typeof item> => item !== null
    );

    // Step 2: Upsert Location Maps for Parent and Children
    for (const { incoming, existing, processedTaxCodes } of validSchemes) {
      if (checkSignal) await checkSignal();

      // Parent Mapping
      let schemeMap = await tx.taxingSchemeLocationMap.findUnique({
        where: {
          taxingSchemeId_locationId: {
            taxingSchemeId: existing.inflowId,
            locationId: locationInflowId,
          },
        },
        select: { localId: true },
      });

      if (!schemeMap) {
        schemeMap = await tx.taxingSchemeLocationMap.create({
          data: {
            taxingSchemeId: existing.inflowId,
            locationId: locationInflowId,
            localId: Number(incoming.taxingSchemeId),
          },
          select: { localId: true },
        });
      }

      // Child Tax Codes Mappings
      if (processedTaxCodes.length > 0) {
        await Promise.all(
          processedTaxCodes.map(async (childCode) => {
            const codeMap = await tx.taxCodeLocationMap.findUnique({
              where: {
                taxCodeId_locationId: {
                  taxCodeId: childCode.taxCodeId,
                  locationId: locationInflowId,
                },
              },
              select: { localId: true },
            });

            if (!codeMap) {
              await tx.taxCodeLocationMap.create({
                data: {
                  taxCodeId: childCode.taxCodeId,
                  locationId: locationInflowId,
                  localId: childCode._localId,
                },
              });
            }
          })
        );
      }

      results.push({
        taxingSchemeInflowId: String(incoming.taxingSchemeId),
        localTaxingSchemeId: schemeMap.localId,
        status: "synced",
      });
    }

    return { processedCount: validSchemes.length, results };
  }

  /**
   * Main Driver Method for Batching Taxing Schemes.
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
      taxingSchemeInflowId: string;
      localTaxingSchemeId?: number;
      status: "synced" | "skipped_not_found";
    }> = [];

    console.log(
      `Starting taxing scheme sync map (Batch Size: ${BATCH_SIZE}, Delay: ${INTER_BATCH_DELAY}ms)...`
    );
    let batchNo = 0;

    while (hasMore) {
      if (checkSignal) await checkSignal();

      const rawBatch: LocalTaxingScheme[] = await getLocalBatchTaxingSchemes(
        location.url,
        BATCH_SIZE,
        after
      );

      if (!rawBatch || rawBatch.length === 0) break;

      const lastRecord = rawBatch[rawBatch.length - 1];
      after = String(lastRecord.taxingSchemeId);

      if (rawBatch.length < BATCH_SIZE) hasMore = false;

      let batch = rawBatch;
      if (allowedIds) {
        batch = batch.filter((item) =>
          allowedIds.has(String(item.taxingSchemeId))
        );
      }

      if (batch.length === 0) continue;

      if (checkSignal) await checkSignal();

      // Process batch isolated inside its own short-lived transaction
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
        `Batch #${batchNo} completed. Processed ${totalProcessed} taxing schemes.`
      );

      if (onProgress) await onProgress(totalProcessed);

      if (checkSignal) await checkSignal();

      if (INTER_BATCH_DELAY > 0) {
        await this.sleep(INTER_BATCH_DELAY);
      }
    }

    return {
      taxingSchemesProcessed: totalProcessed,
      syncedAt: new Date().toISOString(),
      results: syncResults,
    };
  }
}


const taxingService = new TaxingSchemeSyncMapService();
export const localTaxingSchemeServiceMap = taxingService.sync.bind(taxingService);