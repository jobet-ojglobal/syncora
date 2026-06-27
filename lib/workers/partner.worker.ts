// workers/partner-webhook.worker.ts
import { Worker, Job } from "bullmq";
import { prisma } from "@/lib/prisma";
import { connection } from "@/lib/redis";
import { partnerApi } from "@/lib/partner/partner.client";
import { InflowSalesOrderWebhookService } from "@/lib/partner/webhooks/webhook-sales-order.service";
import { InflowProductWebhookService } from "../inflow/webhooks/webhook-product.service";

interface PartnerWebhookJobData {
  source: "inflow_sales_order" | "inflow_product";
  action: "create" | "update";
  dataId: string;
  loggedEventId: string;
  outboundAuditId: string;
}

const partnerWorker = new Worker<PartnerWebhookJobData>(
  "partner_sync", // Ties this worker explicitly to the partner_sync queue
  async (job: Job<PartnerWebhookJobData>) => {
    const { source, action, dataId, loggedEventId, outboundAuditId } = job.data;

    console.log(`[Partner Worker] Processing job ${job.id} for source: ${source} (${action})`);

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

        default:
          throw new Error(`Unsupported webhook sync source: ${source}`);
      }

      // 1. Check sync results and execute partner API cloud-ack acknowledgement
      if (result && (result.success || (result as any).success)) {
        if(outboundAuditId && outboundAuditId !== "") {
          await partnerApi.post("/transactions/sales/cloud-ack", {
            batch_id: dataId,
            outbound_audit_id: outboundAuditId,
            cloud_status: "SUCCESS",
            message: "Processed successfully via dedicated partner worker queue",
          });
        }
        
        return result;
      } else {
        const errMsg = (result as any)?.message || "Sync operation returned unsuccessful state";
        throw new Error(errMsg);
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