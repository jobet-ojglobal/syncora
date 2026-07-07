// workers/partner-webhook.worker.ts
import { Worker, Job } from "bullmq";
import { prisma } from "@/lib/prisma";
import { connection } from "@/lib/redis";
import { partnerApi } from "@/lib/partner/partner.client";
import { CustomerSyncResult } from "@/lib/partner/webhooks/webhook-customer.service";
import { InflowSalesOrderWebhookService } from "@/lib/partner/webhooks/webhook-sales-order.service";
import { InflowCustomerWebhookService } from "@/lib/partner/webhooks/webhook-customer.service";
import { InflowProductWebhookService } from "../inflow/webhooks/webhook-product.service";
import { getMidSyncQueue } from "../queues/sync.queue";

interface PartnerWebhookJobData {
  source: "inflow_sales_order" | "inflow_product" | "inflow_customer";
  action: "create" | "update";
  dataId: string;
  loggedEventId: string;
  outboundAuditId: string;
  eventType?: "SalesOrderCreated" | "SalesOrderUpdated" | "CustomerCreated" | "CustomerUpdated";
}

const partnerWorker = new Worker<PartnerWebhookJobData>(
  "partner_sync", // Ties this worker explicitly to the partner_sync queue
  async (job: Job<PartnerWebhookJobData>) => {
    const { source, action, dataId, loggedEventId, outboundAuditId, eventType } = job.data;

    console.log(`[Partner Worker] Processing job ${job.id} for source: ${source} (${action})`);

    try {
      let result;

      switch (source) {
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
        if (source === "inflow_customer") {
          const customerResult = result as CustomerSyncResult;
          
          if (customerResult.inflowPayload) {
            console.log(`[Partner Worker] Dispatching customer downstream job to midSyncQueue for ID: ${dataId}`);
            await getMidSyncQueue().add(
              "customer_sync_job",
              {
                source: "UPSERT_CLOUD_CUSTOMER",
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

        // Cloud acknowledgement fallback protection
        if (outboundAuditId) {
          try {
            await partnerApi.post("/cloud/ack", {
              eventType,
              batch_id: dataId,
              cloud_status: "SUCCESS",
              outbound_audit_id: outboundAuditId,
              message: "Processed and queued downstream successfully via partner worker"
            });
          } catch (ackError) {
            console.error(`⚠️ [Partner Worker] DB Save/Queue successful, but cloud acknowledgment failed:`, ackError);
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
partnerWorker.on("completed", (job) => {
  console.log(`✓ [Partner Worker] Job ${job.id} completed successfully.`);
});

partnerWorker.on("failed", (job, err) => {
  console.error(`✗ [Partner Worker] Job ${job?.id} failed:`, err.message);
});

partnerWorker.on("error", (error) => {
  console.error("!! [Partner Worker Critical Error]:", error);
});

console.log("🚀 Partner Webhook Worker started. Listening for 'partner_sync' jobs...");

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("Shutting down partner worker...");
  await partnerWorker.close();
  await prisma.$disconnect();
  process.exit(0);
});