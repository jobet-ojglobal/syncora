// workers/partner-webhook.worker.ts
import { Worker, Job } from "bullmq";
import { prisma } from "@/lib/prisma";
import { connection } from "@/lib/redis";
import { InflowSalesOrderWebhookService } from "@/lib/inflow/webhooks/webhook-sales-order.service";
import { InflowCustomerWebhookService, CustomerSyncResult } from "@/lib/inflow/webhooks/webhook-customer.service";
import { InflowProductWebhookService } from "@/lib/inflow/webhooks/webhook-product.service";
import { getMidSyncQueue } from "../queues/sync.queue";


interface CloudWebhookJobData {
  source: "inflow_sales_order" | "inflow_product" | "inflow_customer";
  action: "create" | "update";
  dataId: string;
  loggedEventId: string;
}

const cloudWorker = new Worker<CloudWebhookJobData>(
  "cloud_sync", // Ties this worker explicitly to the cloud_sync queue
  async (job: Job<CloudWebhookJobData>) => {
    const { source, action, dataId, loggedEventId } = job.data;

    console.log(`[Cloud Worker] Processing job ${job.id} for source: ${source} (${action})`);

    try {
      let result;

      switch (source) {
        case "inflow_sales_order":
          if (action === "create") {
            result = await InflowSalesOrderWebhookService.handleSalesOrderCreate(dataId, loggedEventId);
          } else if (action === "update") {
            result = await InflowSalesOrderWebhookService.handleSalesOrderUpdate(dataId, loggedEventId);
          } else {
            throw new Error(`Unsupported action: ${action} for source ${source}`);
          }
          break;
        case "inflow_product":
          if (action === "create") {
            result = await InflowProductWebhookService.handleProductCreate(dataId, loggedEventId);
          } else if (action === "update") {
            result = await InflowProductWebhookService.handleProductUpdate(dataId, loggedEventId);
          } else {
            throw new Error(`Unsupported action: ${action} for source ${source}`);
          }
          break;
        case "inflow_customer":
          if (action === "create") {
            result = await InflowCustomerWebhookService.handleCustomerCreate(dataId, loggedEventId);
          } else if (action === "update") {
            result = await InflowCustomerWebhookService.handleCustomerUpdate(dataId, loggedEventId);
          } else {
            throw new Error(`Unsupported action: ${action} for source ${source}`);
          }
          break;

        

        default:
          throw new Error(`Unsupported webhook sync source: ${source}`);
      }

      if (result?.success) {
        // upsert to parter app
        if (source === "inflow_customer") {
          const customerResult = result as CustomerSyncResult;
          
          if (customerResult.inflowPayload) {
            console.log(`[Partner Worker] Dispatching customer downstream job to midSyncQueue for ID: ${dataId}`);
            await getMidSyncQueue().add(
              "customer_sync_job",
              {
                source: "UPSERT_PARTNER_CUSTOMER",
                model: "CUSTOMER",
                payload: customerResult.inflowPayload, // 3. TypeScript is happy now!
                timestamp: new Date().toISOString()
              },
              { 
                attempts: 3, 
                backoff: { type: "exponential", delay: 2000 },
                removeOnComplete: true
              }
            );
          }
        }
      }

    } catch (error) {
      console.error(`[Partner Worker Error] Failed processing job ${job.id}:`, error);
      
      // We throw the error so BullMQ knows the job failed and can handle automatic retries
      throw error;
    }
  },
  { 
    connection,
    // Concurrency controls how many webhooks this worker processes simultaneously.
    // Webhooks are fast, so you can safely handle multiple concurrently.
    concurrency: 5 
  }
);

// Worker Lifecycle Events
cloudWorker.on("completed", (job) => {
  console.log(`✓ [Cloud Worker] Job ${job.id} completed successfully.`);
});

cloudWorker.on("failed", (job, err) => {
  console.error(`✗ [Cloud Worker] Job ${job?.id} failed:`, err.message);
});

cloudWorker.on("error", (error) => {
  console.error("!! [Cloud Worker Critical Error]:", error);
});

console.log("🚀 Cloud Webhook Worker started. Listening for 'cloud_sync' jobs...");

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("Shutting down cloud worker...");
  await cloudWorker.close();
  await prisma.$disconnect();
  process.exit(0);
});