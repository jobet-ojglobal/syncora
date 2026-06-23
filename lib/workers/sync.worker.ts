// workers/product.worker.ts

import { Worker } from "bullmq";
import { prisma } from "@/lib/prisma";
import { connection } from "@/lib/redis";

import { TestSyncService } from "@/lib/inflow/services/test-sync.service"
import { ProductSyncService } from "@/lib/inflow/services/product-sync.service";
import { CustomerSyncService } from "@/lib/inflow/services/customer-sync.service";
import { InventorySyncService } from "@/lib/inflow/services/inventory-sync.service";
import { LocationSyncService } from "@/lib/inflow/services/location-sync.service";
import { CategorySyncService } from "../inflow/services/category-sync.service";
import { TeamMemberSyncService } from "../inflow/services/team-members-sync.service";
import { TaxingSchemeSyncService } from "../inflow/services/taxing-scheme-sync.service";
import { CurrencySyncService } from "../inflow/services/currency-sync.service";
import { AdjustmentReasonSyncService } from "../inflow/services/adjustment-sync.service";
import { PricingSchemeSyncService } from "../inflow/services/pricing-scheme-syn.service";
import { ProductCostAdjustmentSyncService } from "../inflow/services/product-cost-adjustment-sync.service";
import { PaymentTermSyncService } from "../inflow/services/payment-term-sync.service";

const testService = new TestSyncService();
const categoryService = new CategorySyncService();
const productService = new ProductSyncService();
const customerService = new CustomerSyncService();
const inventoryService = new InventorySyncService();
const locationService = new LocationSyncService();
const teamMemberService = new TeamMemberSyncService();
const taxingSchemeService = new TaxingSchemeSyncService();
const currencyService = new CurrencySyncService();
const adjustmentReasonService = new AdjustmentReasonSyncService();
const pricingSchemeService = new PricingSchemeSyncService();
const productCostAdjustmentService = new ProductCostAdjustmentSyncService();
const paymentTermService = new PaymentTermSyncService();


type SyncOptions = {
  onProgress?: (progress: number) => Promise<void>;
};

const worker = new Worker(
  "sync",
  async (job) => {
    const { jobId, source } = job.data;
    
    const syncOptions: SyncOptions = {
      onProgress: async (progress) => {
        await job.updateProgress(progress);

        await prisma.syncJob.update({
          where: { id: jobId },
          data: { progress },
        });

        // console.log(`  Progress: ${progress}%`);
      },
    };

    try {
      await prisma.syncJob.update({
        where: { id: jobId },
        data: {
          status: "processing",
          progress: 0,
        },
      });

      let result;

      switch (source) {
         case "categories":
          result = await categoryService.sync(syncOptions);
          break;

        case "products":
          result = await productService.sync(syncOptions);
          break;

        case "customers":
          result = await customerService.sync(syncOptions);
          break;

        case "inventory":
          result = await inventoryService.sync(syncOptions);
          break;
        
        case "locations":
          result = await locationService.sync(syncOptions);
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
        
        case "test":
          result = await testService.sync(source, syncOptions);
          break;

        default:
          throw new Error(
            `Unsupported sync source: ${source}`
          );
      }

      await prisma.syncJob.update({
        where: { id: jobId },
        data: {
          status: "completed",
          progress: 100,
          data: JSON.parse(JSON.stringify(result)),
        },
      });

      return result;
    } catch (error) {
      await prisma.syncJob.update({
        where: { id: jobId },
        data: {
          status: "failed",
          error:
            error instanceof Error
              ? error.message
              : "Unknown error",
        },
      });

      throw error;
    }
  },
  { connection }
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

console.log("Sync Worker started. Listening for sync jobs...");

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down worker...");
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
});
