// workers/partner-webhook.worker.ts
import { Worker, Job } from "bullmq";
import { prisma } from "@/lib/prisma";
import { connection } from "@/lib/redis";
import { upsertCustomer as upsertCloudCustomer } from "../inflow/data/customers";
import { upsertVendor as upsertCloudVendor } from "../inflow/data/vendors";
import { upsertCustomer as upsertPartnerCustomer } from "../partner/data/customers";
import { upsertTestCustomer as upsertPartnerTestCustomer } from "../partner/data/customers";


interface MidWebhookJobData {
  source: string;
  model: string;
  payload: any;
  timestamp: string;
}

const midWorker = new Worker<MidWebhookJobData>(
  "mid_sync", // Ties this worker explicitly to the mid_sync queue
  async (job: Job<MidWebhookJobData>) => {
    const { source, model, payload, timestamp } = job.data;

    console.log(`[Mid Worker] Processing job ${job.id} for source: ${source} (model: ${model}) at ${timestamp}`);

    try {
      switch (source) {
        // ========= CUSTOMER ============
        case "CUSTOMER_SYNC_API":
          await upsertCloudCustomer(payload);
          // await upsertPartnerCustomer(payload); 
          break;
        case "CUSTOMER_SYNC_BULK":
          // await upsertCloudCustomer(payload);
          await upsertPartnerCustomer(payload); 
          break;
        case "UPSERT_CLOUD_CUSTOMER":
          await upsertCloudCustomer(payload);
          break;
        case "UPSERT_PARTNER_CUSTOMER":
          await upsertPartnerTestCustomer(payload);
          break;
        // ========= VENDOR ============
        case "VENDOR_SYNC_API":
          await upsertCloudVendor(payload);
          // await upsertPartnerCustomer(payload); 
          break;
        case "VENDOR_SYNC_BULK":
          await upsertCloudVendor(payload);
          // await upsertPartnerCustomer(payload); 
          break;
        case "UPSERT_CLOUD_VENDOR":
          await upsertCloudVendor(payload);
          break;
        case "UPSERT_PARTNER_VENDOR":
          // await upsertPartnerVendor(payload);
          break;

        default:
          throw new Error(`Unsupported mid sync source: ${source}`);
      }


      console.log(`[Mid Worker] Successfully synced ${model} ${payload.id} to inFlow.`);

    } catch (apiError: any) {
      console.error(`[Mid Worker API Error] Failed pushing to inFlow:`, apiError.response?.data || apiError.message);
    }
  },
  { 
    connection,
    concurrency: 5 
  }
);

// Worker Lifecycle Events
midWorker.on("completed", (job) => {
  console.log(`✓ [Mid Worker] Job ${job.id} completed successfully.`);
});

midWorker.on("failed", (job, err) => {
  console.error(`✗ [Mid Worker] Job ${job?.id} failed:`, err.message);
});

midWorker.on("error", (error) => {
  console.error("!! [Mid Worker Critical Error]:", error);
});

console.log("🚀 Mid Worker started. Listening for 'mid_sync' jobs...");

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("Shutting down mid worker...");
  await midWorker.close();
  await prisma.$disconnect();
  process.exit(0);
});