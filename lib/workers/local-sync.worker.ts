// workers/product.worker.ts

import { Job, Worker } from "bullmq";
import { prisma } from "@/lib/prisma";
import { connection } from "@/lib/redis";

// Local Imports
import { CategorySyncMapService as LocalCategorySyncMapService } from "../locations/services/batch-category-sync-map";
import { CurrencySyncMapService as LocalCurrencySyncMapService } from "../locations/services/batch-currency-sync-map";
import { PaymentTermSyncMapService as LocalPaymentTermSyncMapService } from "../locations/services/payment-term-sync-map.service";
import { PricingSchemeSyncMapService as LocalPricingSchemeSyncMapService } from "../locations/services/pricing-scheme-sync-map.service";
import { TaxingSchemeSyncMapService as LocalTaxingSchemeSyncMapService } from "../locations/services/taxing-scheme-sync-map.service";
import { CustomerSyncMapService as LocalCustomerSyncMapService } from "../locations/services/customer-sync-map.service";
import { ProductSyncMapService as LocalProductSyncMapService } from "../locations/services/batch-product-sync-map";
import { SublocationSyncMapService as LocalSublocationSyncMapService } from "../locations/services/sublocation-sync-map.service";
import { inventoryLocalSyncService } from "../locations/services/batch-inventory-sync-adjustment.service";

// Local Service 
const categoryServiceLocal = new LocalCategorySyncMapService();
const currencyServiceLocal = new LocalCurrencySyncMapService();
const paymentServiceLocal = new LocalPaymentTermSyncMapService();
const pricingServiceLocal = new LocalPricingSchemeSyncMapService();
const taxingSchemeServiceLocal = new LocalTaxingSchemeSyncMapService();
const customerServiceLocal = new LocalCustomerSyncMapService();
const productServiceLocal = new LocalProductSyncMapService();
const sublocationServiceLocal = new LocalSublocationSyncMapService();

export interface BaseSyncResult {
  processedCount: number;
  failedCount: number;
  syncedAt: string;
  details?: Record<string, any>;
}

export class SyncCancelledError extends Error {
  constructor(message = "Sync job was cancelled by user.") {
    super(message);
    this.name = "SyncCancelledError";
  }
}

interface SyncWebhookJobData {
  jobId: string;
  source: string;
  includes: any;
  selectedRecords?: string[];
  selectedLocations?: string[];
  syncedAll: boolean;
  brandCustomName: string;
  after: string;
  location: { inflowId: string; name: string; url: string };
}

export type SyncOptions = {
  onProgress?: (progress: number) => Promise<void>;
  checkSignal?: () => Promise<void>;
  batchSize?: number;
  delayBetweenBatchesMs?: number;
};

/**
 * Ensures job isn't cancelled. Throws SyncCancelledError if cancelled.
 */
const checkCancellation = async (jobId: string) => {
  const syncJob = await prisma.syncJob.findUnique({
    where: { id: jobId },
    select: { status: true },
  });

  if (syncJob?.status === "cancelled") {
    throw new SyncCancelledError();
  }
};

/**
 * Safely updates syncJob status without overwriting 'cancelled'
 */
const safeUpdateJob = async (jobId: string, progress: number) => {
  const result = await prisma.syncJob.updateMany({
    where: {
      id: jobId,
      status: { not: "cancelled" }, // 🟢 Prevents race condition
    },
    data: {
      status: "processing",
      progress,
    },
  });

  if (result.count === 0) {
    throw new SyncCancelledError();
  }
};

const worker = new Worker<SyncWebhookJobData>(
  "local_sync",
  async (job: Job<SyncWebhookJobData>) => {
    const { jobId, source, includes, selectedRecords = [] , selectedLocations = [], syncedAll, brandCustomName, after, location } = job.data;

    console.log(`[Local Sync Worker] Processing job source: ${source} for location ${location?.name || "cloud"}`);

    const syncOptions: SyncOptions = {
      checkSignal: async () => {
        await checkCancellation(jobId);
      },
      onProgress: async (processedCount) => {
        await checkCancellation(jobId);
        await job.updateProgress(processedCount);
        await safeUpdateJob(jobId, processedCount);
      },
    };

    try {
      await checkCancellation(jobId);
      await safeUpdateJob(jobId, 0);

      let result;

      switch (source) {
        case "categories_local":
          result = await categoryServiceLocal.sync(location, syncOptions, selectedRecords, syncedAll);
          break;
        case "currencies_local": 
          result = await currencyServiceLocal.sync(location, syncOptions, selectedRecords, syncedAll);
          break;
        case "payment_terms_local":
          result = await paymentServiceLocal.sync(location, syncOptions, selectedRecords, syncedAll);
          break;
        case "pricing_schemes_local":
          result = await pricingServiceLocal.sync(location, syncOptions, selectedRecords, syncedAll);
          break;
        case "taxing_schemes_local":
          result = await taxingSchemeServiceLocal.sync(location, syncOptions, selectedRecords, syncedAll);
          break;
        case "customers_local":
          result = await customerServiceLocal.sync(location, syncOptions, selectedRecords, syncedAll);
          break;
        case "locations_local":
          result = await sublocationServiceLocal.sync(location, syncOptions, selectedRecords, syncedAll);
          break;
        case "products_local":
          result = await productServiceLocal.sync(location, syncOptions, selectedRecords, syncedAll, "custom7");
          break;
        case "inventory_lines_local":
          result = await inventoryLocalSyncService.batchSync(location, syncOptions, after, selectedRecords, selectedLocations, syncedAll);
          break;
     
        default:
          throw new Error(
            `Unsupported sync source: ${source}`
          );
      }

      const failedCount = 
        result && typeof result === "object" && "failedCount" in result
          ? (result.failedCount as number)
          : 0;

      const hasBatchFailures = failedCount > 0;

      await prisma.syncJob.update({
        where: { id: jobId },
        data: {
          status: "completed",
          progress: 100,
          hasError: hasBatchFailures,
          errorType: hasBatchFailures ? "PARTIAL_BATCH_FAILURE" : null,
          error: hasBatchFailures
            ? `Completed with ${failedCount} un-synced record error(s).`
            : null,
          data: JSON.parse(JSON.stringify(result)),
        },
      });

      return result;
    } catch (error) {
      if (error instanceof SyncCancelledError) {
        await prisma.syncJob.updateMany({
          where: { id: jobId },
          data: {
            status: "cancelled",
            hasError: false,
            errorType: "CANCELLED",
            error: "Sync job was manually cancelled by user.",
          },
        });

        await job.discard();
        return { cancelled: true };
      }

      const errorMessage = error instanceof Error ? error.message : "Unknown error";
  
      // Categorize error type dynamically
      let errorType = "SYSTEM_ERROR";
      if (errorMessage.includes("product_name_conflict")) {
        errorType = "NAME_CONFLICT";
      } else if (errorMessage.includes("InFlow API Error")) {
        errorType = "API_ERROR";
      }

      const maxAttempts = job.opts.attempts || 1;
      const currentAttempt = job.attemptsMade + 1;
      const isFinalAttempt = currentAttempt >= maxAttempts;

      await prisma.syncJob.update({
        where: { id: jobId },
        data: {
          status: isFinalAttempt ? "failed" : "retrying",
          hasError: true,
          errorType,
          failedAttempts: currentAttempt,
          error: isFinalAttempt
            ? errorMessage
            : `Attempt ${currentAttempt}/${maxAttempts} failed: ${errorMessage}`,
        },
      });

      throw error;
    }
  },
  { 
    connection,
    concurrency: 2, // 5
    lockDuration: 60000, // Extend lock duration to 60s (default is 30s)
    stalledInterval: 30000,
  }
);

worker.on("completed", (job) => {
  console.log(`✓ Job ${job.id} completed and saved to database`);
});

worker.on("failed", (job, err) => {
  console.error(`✗ Job ${job?.id} failed:`, err.message);
});

worker.on("error", (error) => {
  console.error("Local Worker error:", error);
});

console.log("🚀 Manual Sync Local Worker started. Listening for 'sync' jobs...");

process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down worker...");
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
});
