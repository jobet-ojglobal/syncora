// workers/partner-webhook.worker.ts
import { Worker, Job } from "bullmq";
import { prisma } from "@/lib/prisma";
import { connection } from "@/lib/redis";
import { upsertCustomer as upsertCloudCustomer } from "../inflow/data/customers";
import { upsertVendor as upsertCloudVendor } from "../inflow/data/vendors";
import { upsertCustomer as upsertLocationCustomer } from "../locations/data/customer";

interface MidWebhookJobData {
  source: string;
  model: string;
  payload: any;
  timestamp: string;
  locationId?: string
}

export interface UpsertResult {
  success: boolean;
  message?: string;
  data?: any; 
}


const midWorker = new Worker<MidWebhookJobData>(
  "mid_sync", // Ties this worker explicitly to the mid_sync queue
  async (job: Job<MidWebhookJobData>) => {
    const { source, model, payload, timestamp, locationId } = job.data;

    console.log(`[Mid Worker] Processing job ${job.id} for source: ${source} (model: ${model}) at ${timestamp}`);

    const location = await prisma.location.findUnique({
      where: { inflowId: locationId },
      select: { inflowId: true, url: true, name: true }
    });

    const locationUrl = location?.url;

    try {
      let result: UpsertResult | undefined;

      switch (source) {
        // ========= CUSTOMER ============
        case "CUSTOMER_SYNC_API":
        case "CUSTOMER_SYNC_BULK":
        case "UPSERT_LOCAL_CUSTOMER":
          if (!locationUrl) {
            throw new Error(`Cannot sync customer: No location URL found for locationId ${locationId}`);
          }
          result = await upsertLocationCustomer(payload, locationUrl);
          break;

        case "UPSERT_CLOUD_CUSTOMER":
          await upsertCloudCustomer(payload);
          // Cloud upsert doesn't return an UpsertResult for local, so we simulate a basic success tracking object
          result = { success: true }; 
          break;

        // ========= VENDOR ============
        case "VENDOR_SYNC_API":
        case "VENDOR_SYNC_BULK":
        case "UPSERT_CLOUD_VENDOR":
          await upsertCloudVendor(payload);
          result = { success: true };
          break;

        case "UPSERT_PARTNER_VENDOR":
          console.log(`[Mid Worker] UPSERT_PARTNER_VENDOR not implemented yet.`);
          result = { success: false, message: "Not implemented" };
          break;

        default:
          throw new Error(`Unsupported mid sync source: ${source}`);
      }

      if (result?.success) {
        console.log(`[Mid Worker] Successfully synced ${model} ID:${payload.payload.id} to Inflow ${location?.name}.`);
      } else if (result) {
        console.error(`[Mid Worker Sync Warn] API did not return success for ${model} ID:${payload.payload.id}. Message: ${result.message}`);
      }

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