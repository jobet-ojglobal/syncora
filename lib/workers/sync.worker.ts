// workers/product.worker.ts

import { Job, Worker } from "bullmq";
import { prisma } from "@/lib/prisma";
import { connection } from "@/lib/redis";

import { TestSyncService } from "@/lib/inflow/services/test-sync.service"
import { CustomerSyncService } from "@/lib/inflow/services/customer-sync.service";
import { InventorySyncService } from "@/lib/inflow/services/inventory-sync.service";
import { LocationSyncService } from "@/lib/inflow/services/location-sync.service";
import { CategorySyncService } from "../inflow/services/category-sync.service";
import { TeamMemberSyncService } from "../inflow/services/team-members-sync.service";
import { TaxingSchemeSyncService } from "../inflow/services/taxing-scheme-sync.service";
import { CurrencySyncService } from "../inflow/services/currency-sync.service";
import { AdjustmentReasonSyncService } from "../inflow/services/adjustment-sync.service";
import { PricingSchemeSyncService } from "../inflow/services/pricing-scheme-sync.service";
import { ProductCostAdjustmentSyncService } from "../inflow/services/product-cost-adjustment-sync.service";
import { PaymentTermSyncService } from "../inflow/services/payment-term-sync.service";
import { VendorSyncService } from "../inflow/services/vendor-sync.service";
import { ProductSyncService } from "@/lib/inflow/services/product-sync.service";
import { ProductGroupSyncService } from "../inflow/services/product-group-sync.service";
import { SalesOrderSyncService } from "../inflow/services/sales-order-sync.service";
import { PurchaseOrderSyncService } from "../inflow/services/purchase-order-sync.service";

// Local Imports
import { CategorySyncMapService as LocalCategorySyncMapService } from "../locations/services/batch-category-sync-map";
import { CurrencySyncMapService as LocalCurrencySyncMapService } from "../locations/services/batch-currency-sync-map";
import { PaymentTermSyncMapService as LocalPaymentTermSyncMapService } from "../locations/services/payment-term-sync-map.service";
import { PricingSchemeSyncMapService as LocalPricingSchemeSyncMapService } from "../locations/services/pricing-scheme-sync-map.service";
import { TaxingSchemeSyncMapService as LocalTaxingSchemeSyncMapService } from "../locations/services/taxing-scheme-sync-map.service";
import { CustomerSyncMapService as LocalCustomerSyncMapService } from "../locations/services/customer-sync-map.service";
import { ProductSyncMapService as LocalProductSyncMapService } from "../locations/services/batch-product-sync-map";
import { SublocationSyncMapService as LocalSublocationSyncMapService } from "../locations/services/sublocation-sync-map.service";

// OUT SYNC
import { inventoryCloudSyncService } from "../inflow/services/out-sync-location-inventory";
import { inventoryStockLocationSyncService } from "../inflow/services/adjust-location-stocks-sync";

import { ProductOutSyncService } from "../inflow/services/out-sync-product";
import { productInventoryOutSyncService } from "../inflow/services/out-sync-product-inventory";
import { cloudInventorySyncService } from "../inflow/services/batch-inventory-sync.service";
import { localVendorSyncService } from "../inflow/services/out-sync-vendors";

const testService = new TestSyncService();
const categoryService = new CategorySyncService();
const productGroupService = new ProductGroupSyncService();
const productService = new ProductSyncService();
const customerService = new CustomerSyncService();
const vendorService = new VendorSyncService();
const inventoryService = new InventorySyncService();
const locationService = new LocationSyncService();
const teamMemberService = new TeamMemberSyncService();
const taxingSchemeService = new TaxingSchemeSyncService();
const currencyService = new CurrencySyncService();
const adjustmentReasonService = new AdjustmentReasonSyncService();
const pricingSchemeService = new PricingSchemeSyncService();
const productCostAdjustmentService = new ProductCostAdjustmentSyncService();
const paymentTermService = new PaymentTermSyncService();
const salesOrderService = new SalesOrderSyncService();
const purchaseOrderService = new PurchaseOrderSyncService();

// cloud outsync
const productOutSyncService = new ProductOutSyncService();

// Local Service 
const categoryServiceLocal = new LocalCategorySyncMapService();
const currencyServiceLocal = new LocalCurrencySyncMapService();
const paymentServiceLocal = new LocalPaymentTermSyncMapService();
const pricingServiceLocal = new LocalPricingSchemeSyncMapService();
const taxingSchemeServiceLocal = new LocalTaxingSchemeSyncMapService();
const customerServiceLocal = new LocalCustomerSyncMapService();
const productServiceLocal = new LocalProductSyncMapService();
const sublocationServiceLocal = new LocalSublocationSyncMapService();

// export class SyncCancelledError extends Error {
//   constructor(message = "Sync job was cancelled by user.") {
//     super(message);
//     this.name = "SyncCancelledError";
//   }
// }

// interface SyncWebhookJobData {
//   jobId: string;
//   source: string;
//   includes: any;
//   selectedRecords: string[];
//   syncedAll: boolean;
//   brandCustomName: string;
//   after: string;
//   location: {
//     inflowId: string;
//     name: string;
//     url: string;
//   };
// }

// type SyncOptions = {
//   onProgress?: (progress: number) => Promise<void>;
//   checkSignal?: () => Promise<void>;
// };

// const checkCancellation = async (jobId: string) => {
//   const syncJob = await prisma.syncJob.findUnique({
//     where: { id: jobId },
//     select: { status: true },
//   });

//   if (syncJob?.status === "cancelled") {
//     throw new SyncCancelledError();
//   }
// };


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
  "sync",
  async (job: Job<SyncWebhookJobData>) => {
    const { jobId, source, includes, location, selectedRecords = [] , selectedLocations = [], syncedAll, brandCustomName, after } = job.data;

    const locationUrl = (location?.url && location.url.trim() !== "") ? location.url : null;

    console.log(`[Sync Worker] Processing job source: ${source} for location ${location?.name || "cloud"}`);

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
        // Local Sync
        // case "categories_local": // OK
        //   if (!locationUrl) {
        //     throw new Error(`Cannot sync category: No location URL found for location ${location?.name}`);
        //   }
        //   result = await categoryServiceLocal.sync(location, syncOptions, selectedRecords, syncedAll);
        //   break;
        // case "currencies_local": 
        //   if (!locationUrl) {
        //     throw new Error(`Cannot sync currency: No location URL found for location ${location?.name}`);
        //   }
        //   result = await currencyServiceLocal.sync(location, syncOptions, selectedRecords, syncedAll);
        //   break;
        // case "payment_terms_local":
        //   if (!locationUrl) {
        //     throw new Error(`Cannot sync payment term: No location URL found for location ${location?.name}`);
        //   }
        //   result = await paymentServiceLocal.sync(location, syncOptions, selectedRecords, syncedAll);
        //   break;
        // case "pricing_schemes_local":
        //   if (!locationUrl) {
        //     throw new Error(`Cannot sync pricing scheme: No location URL found for location ${location?.name}`);
        //   }
        //   result = await pricingServiceLocal.sync(location, syncOptions, selectedRecords, syncedAll);
        //   break;
        // case "taxing_schemes_local":
        //   if (!locationUrl) {
        //     throw new Error(`Cannot sync taxing scheme: No location URL found for location ${location?.name}`);
        //   }
        //   result = await taxingSchemeServiceLocal.map(location, syncOptions, selectedRecords, syncedAll);
        //   break;
        // case "customers_local":
        //   if (!locationUrl) {
        //     throw new Error(`Cannot sync customer: No location URL found for location ${location?.name}`);
        //   }
        //   result = await customerServiceLocal.sync(location, syncOptions, selectedRecords, syncedAll);
        //   break;
        // case "locations_local":
        //   if (!locationUrl) {
        //     throw new Error(`Cannot sync product: No location URL found for location ${location?.name}`);
        //   }
        //   result = await sublocationServiceLocal.sync(location, syncOptions, selectedRecords, syncedAll);
        //   break;
        // case "products_local":
        //   if (!locationUrl) {
        //     throw new Error(`Cannot sync product: No location URL found for location ${location?.name}`);
        //   }
        //   result = await productServiceLocal.sync(location, syncOptions, selectedRecords, syncedAll, "custom7");
        //   break;
        // case "inventory_lines_local":
        //   if (!locationUrl) {
        //     throw new Error(`Cannot sync inventory: No location URL found for location ${location?.name}`);
        //   }
        //   result = await inventoryLocalSyncService.sync(location, syncOptions, selectedRecords, syncedAll, after);
        //   break;

        // Cloud Sync
        case "categories":
          result = await categoryService.sync(syncOptions, after, selectedRecords, syncedAll);
          break;
        case "product_groups":
          result = await productGroupService.sync(syncOptions, includes);
          break;
        case "products":
          result = await productService.syncBatch(syncOptions, includes, brandCustomName, selectedRecords, syncedAll, after);
          break;
        case "product_boms":
          result = await productService.sync(syncOptions, ["itemBoms"]);
          break;
        case "customers":
          result = await customerService.sync(syncOptions);
          break;
        case "vendors":
          result = await vendorService.sync(syncOptions, includes);
          break;          
        case "inventory":
          result = await cloudInventorySyncService.batchSync(syncOptions, after, [], includes, syncedAll);
          break;
        case "single_inventory":
          console.log("worker ", selectedRecords[0], includes)
          result = await inventoryService.syncSingle(selectedRecords[0], includes);
          break;
        case "locations":
          result = await locationService.sync(syncOptions, selectedRecords, syncedAll);
          break;
        case "team_members":
          result = await teamMemberService.sync(syncOptions);
          break;
        case "taxing_schemes":
          result = await taxingSchemeService.sync(syncOptions);
          break;
        case "currencies":
          result = await currencyService.sync(syncOptions);
          break;
        case "pricing_schemes":
          result = await pricingSchemeService.sync(syncOptions);
          break;
        case "payment_terms":
          result = await paymentTermService.sync(syncOptions);
          break;
        case "adjustment_reasons":
          result = await adjustmentReasonService.sync(syncOptions);
          break;
        case "product_cost_adjustments":
          result = await productCostAdjustmentService.sync(syncOptions);
          break;
        case "sales_orders":
          result = await salesOrderService.sync(syncOptions);
          break;
        case "purchase_orders":
          result = await purchaseOrderService.sync(syncOptions);
          break;
        // cloud outsync
        case "cloudsync_inventory_levels":
          result = await inventoryCloudSyncService.sync(syncOptions, selectedLocations[0], selectedRecords);
          break;
        case "cloudsync_product_inventory":
          result = await productInventoryOutSyncService.syncNoCheckCloudSync(syncOptions, ["e4cc6c9a-9d2b-49eb-a331-361ef582fc7f"], brandCustomName);
          break;
        case "cloudsync_products":
          result = await productOutSyncService.sync(syncOptions, brandCustomName, []);
          break;

        case "cloudsync_vendors":
          result = await localVendorSyncService(syncOptions, []);
          break;

        // Mid Sync
        case "sync_locations_inventory": // Mid Process - cloning inventory from global sync to main location connected to cloud
          result = await inventoryStockLocationSyncService.syncToCloud(syncOptions, selectedLocations, selectedRecords, syncedAll);
          break;

          
        case "test":
          result = await testService.sync(source, syncOptions);
          break;
        default:
          throw new Error(
            `Unsupported sync source: ${source}`
          );
      }

      // await prisma.syncJob.update({
      //   where: { id: jobId },
      //   data: {
      //     status: "completed",
      //     progress: 100,
      //     data: JSON.parse(JSON.stringify(result)),
      //   },
      // });

      // Safely check if 'failedCount' exists on the returned result object
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
      // Handle user-initiated cancellation: exit cleanly without triggering worker retries
      // if (error instanceof SyncCancelledError) {
      //   console.log(`[Sync Worker] Job ${jobId} was safely aborted mid-process.`);
      //   await job.discard();
      //   return { cancelled: true };
      // }
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

      // const maxAttempts = job.opts.attempts || 1;
      // const isFinalAttempt = job.attemptsMade >= maxAttempts;
      // const errorMessage = error instanceof Error ? error.message : "Unknown error";

      // await prisma.syncJob.update({
      //   where: { id: jobId },
      //   data: {
      //     status: isFinalAttempt ? "failed" : "retrying",
      //     error: isFinalAttempt
      //       ? errorMessage
      //       : `Attempt ${job.attemptsMade}/${maxAttempts} failed. Retrying... (${errorMessage})`,
      //   },
      // });

      // throw error; // Re-throw standard runtime errors so BullMQ schedules retries
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
  console.error("Worker error:", error);
});

console.log("🚀 Manual Sync Worker started. Listening for 'sync' jobs...");

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down worker...");
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
});



function sync(options: any, SyncOptions: any, arg2: any, arg3: any, arg4: any, arg5: any) {
  throw new Error("Function not implemented.");
}
 // } catch (error) {
    //   await prisma.syncJob.update({
    //     where: { id: jobId },
    //     data: {
    //       status: "failed",
    //       error:
    //         error instanceof Error
    //           ? error.message
    //           : "Unknown error",
    //     },
    //   });

    //   throw error;
    // }