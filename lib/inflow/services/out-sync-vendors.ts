import { prisma } from "@/lib/prisma";
import { InflowVendor } from "@/lib/inflow/types";
import { Prisma } from "@/generated/prisma/client";
import { SyncOptions } from "@/lib/workers/sync.worker";
import { upsertBulkVendors, upsertVendor } from "../data/vendors";

type DbClient = Prisma.TransactionClient;

export type LocalVendorWithRelations = Prisma.VendorGetPayload<{
  include: {
    businessPartner: true;
  };
}>;

/**
 * Maps a local database Vendor record into an InflowVendor payload
 */
export function mapLocalVendorToInflowPayload(
  vendor: LocalVendorWithRelations,
  modifiedById?: string
): InflowVendor {
  return {
    vendorId: vendor.inflowId,
    name: vendor.businessPartner?.name || "",
    contactName: vendor.businessPartner?.contactName || null,
    currencyId: vendor.currencyId || null,
    customFields: null,
    defaultAddressId: vendor.defaultAddressId || null,
    defaultCarrier: vendor.defaultCarrier || null,
    defaultPaymentMethod: vendor.defaultPaymentMethod || null,
    defaultPaymentTermsId: vendor.defaultPaymentTermsId || null,
    discount: vendor.discount ? vendor.discount.toString() : null,
    email: vendor.businessPartner?.email || null,
    fax: vendor.businessPartner?.fax || null,
    isActive: vendor.businessPartner?.isActive ?? true,
    isTaxInclusivePricing: vendor.isTaxInclusivePricing ?? false,
    lastModifiedById: modifiedById || vendor.lastModifiedById || null,
    leadTimeDays: vendor.leadTimeDays || null,
    phone: vendor.businessPartner?.phone || null,
    remarks: vendor.businessPartner?.remarks || null,
    taxingSchemeId: vendor.taxingSchemeId || null,
    website: vendor.businessPartner?.website || null,
  };
}

export class VendorOutSyncService {
  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Utility helper to format milliseconds into readable output (e.g., "450ms" or "2.34s")
   */
  private formatDuration(ms: number): string {
    return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`;
  }

  async getVendors(
    db: DbClient | typeof prisma = prisma,
    take: number = 30,
    cursorId?: string,
    excludeIds: string[] = [],
    selectedIds?: string[]
  ): Promise<LocalVendorWithRelations[]> {
    const whereClause: Prisma.VendorWhereInput = {
      deletedAt: null,
      isCloudSynced: false,
      businessPartner: {
        isActive: true,
      },
      ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
      ...(selectedIds && selectedIds.length > 0
        ? { inflowId: { in: selectedIds } }
        : {}),
    };

    return db.vendor.findMany({
      where: whereClause,
      take,
      ...(cursorId ? { skip: 1, cursor: { id: cursorId } } : {}),
      orderBy: { id: "asc" },
      include: {
        businessPartner: true,
      },
    });
  }

  async processBatchBulk(
    vendors: LocalVendorWithRelations[],
    checkSignal?: () => Promise<void>
  ): Promise<{
    successfulIds: string[];
    failedIds: string[];
  }> {
    const batchStartTime = performance.now();
    const modifiedById = "8ff3e71d-eb02-425d-8e0f-00a69fc8e482";

    if (checkSignal) await checkSignal();

    // 1. Map all local vendors into an array payload
    const payloads = vendors.map((vendor) =>
      mapLocalVendorToInflowPayload(vendor, modifiedById)
    );

    const successfulIds: string[] = [];
    const failedIds: string[] = [];

    try {
      // 2. Single Bulk API request sending array payload
      const syncedVendors = await upsertBulkVendors(payloads);

      if (Array.isArray(syncedVendors) && syncedVendors.length > 0) {
        // Map returned synced items back to local vendor IDs
        const syncedVendorInflowIds = new Set(
          syncedVendors.map((v) => v.vendorId).filter(Boolean)
        );

        vendors.forEach((vendor) => {
          if (syncedVendorInflowIds.has(vendor.inflowId)) {
            successfulIds.push(vendor.id);
          } else {
            failedIds.push(vendor.id);
          }
        });
      } else {
        // If the bulk endpoint returns success without item array, mark all as successful
        successfulIds.push(...vendors.map((v) => v.id));
      }
    } catch (bulkError: any) {
      console.warn(
        `[Vendor Sync] Bulk array payload failed (${
          bulkError?.message || "Error"
        }). Falling back to item-by-item processing for this batch...`
      );

      // Fallback: Process items individually if bulk payload fails
      for (let i = 0; i < vendors.length; i++) {
        const vendor = vendors[i];
        const payload = payloads[i];

        try {
          const syncedVendor = await upsertVendor(payload);
          if (syncedVendor?.vendorId) {
            successfulIds.push(vendor.id);
          } else {
            failedIds.push(vendor.id);
          }
        } catch (itemError: any) {
          console.error(
            `[Vendor Sync] Item failed (${vendor.businessPartner?.name || vendor.id}):`,
            itemError?.message || itemError
          );
          failedIds.push(vendor.id);
        }
      }
    }

    const batchDuration = performance.now() - batchStartTime;
    console.log(
      `[Vendor Sync] Bulk Batch API processing finished in ${this.formatDuration(
        batchDuration
      )} (Avg: ${this.formatDuration(batchDuration / vendors.length)}/item)`
    );

    return { successfulIds, failedIds };
  }

  async sync(options: SyncOptions, selectedRecords?: string[]) {
    const syncStartTime = performance.now();
    const { onProgress, checkSignal } = options;
    const BATCH_SIZE = options?.batchSize ?? 100;
    const INTER_BATCH_DELAY = options?.delayBetweenBatchesMs ?? 1000;

    let totalProcessed = 0;
    let batchNo = 0;
    const permanentlyFailedIds: string[] = [];

    console.log(`[VendorOutSyncService] Starting vendor sync batching (Size: ${BATCH_SIZE})...`);

    while (true) {
      const iterationStartTime = performance.now();
      if (checkSignal) await checkSignal();

      const fetchStartTime = performance.now();

      // Fetch unsynced vendor batch from DB
      const batch: LocalVendorWithRelations[] = await this.getVendors(
        prisma,
        BATCH_SIZE,
        undefined,
        permanentlyFailedIds,
        selectedRecords
      );

      const fetchDuration = performance.now() - fetchStartTime;

      if (!batch || batch.length === 0) {
        console.log(`[VendorOutSyncService] No more vendor records found to sync. Sync complete.`);
        break;
      }

      console.log(
        `[VendorOutSyncService] Fetched ${batch.length} vendors in ${this.formatDuration(fetchDuration)}`
      );

      if (checkSignal) await checkSignal();

      const { successfulIds, failedIds } = await this.processBatchBulk(
        batch,
        checkSignal
      );

      if (failedIds.length > 0) {
        permanentlyFailedIds.push(...failedIds);
      }

      totalProcessed += successfulIds.length;
      batchNo++;

      const iterationDuration = performance.now() - iterationStartTime;

      console.log(
        `[VendorOutSyncService] Batch #${batchNo} done in ${this.formatDuration(iterationDuration)}. ` +
          `Processed: ${successfulIds.length}, Failed: ${failedIds.length}. Cumulative: ${totalProcessed}`
      );

      // 3. Update database for all successful items in the batch
      if (successfulIds.length > 0) {
        const dbUpdateStart = performance.now();
        await prisma.vendor.updateMany({
          where: { id: { in: successfulIds } },
          data: { isCloudSynced: true },
        });
        console.log(
          `[Vendor Sync] Marked ${successfulIds.length} items as synced in DB (${this.formatDuration(performance.now() - dbUpdateStart)})`
        );
      }

      if (onProgress) {
        await onProgress(totalProcessed);
      }

      if (successfulIds.length === 0 && failedIds.length === batch.length) {
        console.warn(`[VendorOutSyncService] Entire batch failed. Stopping execution loop.`);
        break;
      }

      if (INTER_BATCH_DELAY > 0) {
        await this.sleep(INTER_BATCH_DELAY);
      }
    }

    const totalSyncDuration = performance.now() - syncStartTime;
    console.log(
      `[VendorOutSyncService] Total vendor job execution completed in ${this.formatDuration(
        totalSyncDuration
      )}. Total Processed: ${totalProcessed}, Total Failed: ${permanentlyFailedIds.length}`
    );

    return {
      vendorsProcessed: totalProcessed,
      failedCount: permanentlyFailedIds.length,
      syncedAt: new Date().toISOString(),
    };
  }
}

const vendorService = new VendorOutSyncService();
export const localVendorSyncService = vendorService.sync.bind(vendorService);