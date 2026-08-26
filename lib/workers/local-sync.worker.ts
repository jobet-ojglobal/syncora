// workers/product.worker.ts
import { Job, Worker } from "bullmq";
import { prisma } from "@/lib/prisma";
import { connection } from "@/lib/redis";
import { SyncOptions } from "./types";

import { localCategoryServiceMap } from "../locations/services/batch-category-sync-map";
import { localCurrencyServiceMap } from "../locations/services/batch-currency-sync-map";
import { localProductServiceMap } from "../locations/services/batch-product-sync-map";
import { localInventoryServiceMap } from "../locations/services/batch-inventory-sync-adjustment.service";
import { localLocationServiceSyncMap } from "../locations/services/batch-location-service";
import { localTaxingSchemeServiceMap } from "../locations/services/batch-taxing-scheme-service";
import { localPricingSchemeServiceMap } from "../locations/services/batch-pricing-scheme-service";
import { localPaymentTermServiceMap } from "../locations/services/batch-payment-term-map";
import { localCustomerServiceSyncMap } from "../locations/services/batch-customer-sync-map";
import { localProductServiceSyncMap } from "../locations/services/batch-product-sync.service";
import { localVendorServiceSyncMap } from "../locations/services/batch-vendor-sync-map";

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
    const { jobId, source, selectedRecords = [] , selectedLocations = [], syncedAll, brandCustomName, after, location } = job.data;

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
          result = await localCategoryServiceMap(location, syncOptions, selectedRecords, syncedAll);
          break;
        case "currencies_local": 
          result = await localCurrencyServiceMap(location, syncOptions, selectedRecords, syncedAll);
          break;
        case "payment_terms_local":
          result = await localPaymentTermServiceMap(location, syncOptions, selectedRecords, syncedAll);
          break;
        case "pricing_schemes_local":
          result = await localPricingSchemeServiceMap(location, syncOptions, selectedRecords, syncedAll);
          break;
        case "taxing_schemes_local":
          result = await localTaxingSchemeServiceMap(location, syncOptions, selectedRecords, syncedAll);
          break;
        case "customers_local":
          result = await localCustomerServiceSyncMap(location, syncOptions, selectedRecords, syncedAll);
          break;
        case "vendors_local":
          result = await localVendorServiceSyncMap(location, syncOptions, selectedRecords, syncedAll);
          break;
        case "locations_local":
          result = await localLocationServiceSyncMap(location, syncOptions, selectedRecords, syncedAll);
          break;
        case "products_local_map":
          result = await localProductServiceMap(location, syncOptions, selectedRecords, syncedAll, after);
          break;
        case "products_local_sync":
          result = await localProductServiceSyncMap(location, syncOptions, selectedRecords, syncedAll, "custom7", ["image"], after); //"prices", "bom", "coreData", "image"
          break;
        case "inventory_lines_local":
          result = await localInventoryServiceMap(location, syncOptions, after, selectedRecords, selectedLocations, syncedAll);
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
