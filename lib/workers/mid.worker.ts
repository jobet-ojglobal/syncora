// workers/partner-webhook.worker.ts
import { Worker, Job } from "bullmq";
import { prisma } from "@/lib/prisma";
import { connection } from "@/lib/redis";
import { upsertCustomer } from "../inflow/data/customers";

interface PartnerWebhookJobData {
  source: string;
  model: string;
  payload: any;
  timestamp: string;
}

const midWorker = new Worker<PartnerWebhookJobData>(
  "mid_sync", // Ties this worker explicitly to the mid_sync queue
  async (job: Job<PartnerWebhookJobData>) => {
    const { source, model, payload, timestamp } = job.data;

    console.log(`[Mid Worker] Processing job ${job.id} for source: ${source} (model: ${model}) at ${timestamp}`);

    try {
      switch (source) {
        case "CUSTOMER_SYNC_API":
          await upsertCustomer(payload);
          // await upsertPartnerCustomer(payload);  // to partner
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