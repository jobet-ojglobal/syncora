// workers/cloud-webhook.worker.ts
import { Worker, Job } from "bullmq";
import { prisma } from "@/lib/prisma";
import { connection } from "@/lib/redis";
import { InflowSalesOrderWebhookService } from "@/lib/inflow/webhooks/webhook-sales-order.service";
import { InflowCustomerWebhookService, CustomerSyncResult } from "@/lib/inflow/webhooks/webhook-customer.service";
import { InflowProductWebhookService } from "@/lib/inflow/webhooks/webhook-product.service";
import { getMidSyncQueue } from "../queues/sync.queue";
import { LocalSyncDispatcher } from "../queues/local-dispatcher.helper";
import { CustomerSyncPayload, splitBusinessPartnerPayload } from "@/helpers/businessPartnerSplitPayload";
import { WebhookService } from "@/services/webhook.service";


interface CloudWebhookJobData {
  source: "inflow_sales_order" | "inflow_product" | "inflow_customer" | "inflow_vendor";
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
            console.log(`[Cloud Worker] Dispatching customer downstream job to midSyncQueue for ID: ${dataId}`);
            const { businessPartner, ...payload } = customerResult.inflowPayload;
            // return { businessPartner, savedAddresses, customerPayloadData, vendorPayloadData };

            const result = {  
              businessPartner,
              savedAddresses: businessPartner?.addresses,
              customerPayloadData: payload,
              vendorPayloadData: null
            } 

            const splitPayloads = splitBusinessPartnerPayload(
              result
            );

            const localJobs = await LocalSyncDispatcher.prepareLocalBusinessPartnerSyncJobs(
              customerResult.inflowPayload?.businessPartnerId,
              ["a87dfdcb-10af-4cb2-a8e5-0fb37ed75682", "ee762546-27e5-46c6-9b8b-6bddc37f3ccc"],
              splitPayloads,
              prisma,
              WebhookService
            );

        
            // Map and execute queue insertions concurrently
            if (localJobs.length > 0) {
              const localQueue = getMidSyncQueue();
              await Promise.all(
                localJobs.map(job => 
                  localQueue.add(
                    job.name, 
                    job.data, 
                    { attempts: 3, backoff: { type: "exponential", delay: 2000 }, removeOnComplete: true }
                  )
                )
              );
            }
           
          }
        }
      }

    } catch (error) {
      console.error(`[Cloud Worker Error] Failed processing job ${job.id}:`, error);
      
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