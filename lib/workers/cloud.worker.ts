// // workers/cloud.worker.ts
// import { Worker, Job } from "bullmq";
// import { prisma } from "@/lib/prisma";
// import { connection } from "@/lib/redis";
// import { InflowProductWebhookService } from "../inflow/webhooks/webhook-product.service";

// interface PartnerWebhookJobData {
//   source: "inflow_product";
//   action: "create" | "update";
//   dataId: string;
//   loggedEventId: string;
//   outboundAuditId?: string;
// }

// const cloudWorker = new Worker<PartnerWebhookJobData>(
//   "partner_sync", // Ties this worker explicitly to the partner_sync queue
//   async (job: Job<PartnerWebhookJobData>) => {
//     const { source, action, dataId, loggedEventId, outboundAuditId } = job.data;

//     console.log(`[Cloud Worker] Processing job ${job.id} for source: ${source} (${action})`);

//     try {
//       let result;

//       switch (source) {
//         case "inflow_product":
//           if (action === "create") {
//             result = await InflowProductWebhookService.handleProductCreate(dataId, loggedEventId);
//           } else if (action === "update") {
//             result = await InflowProductWebhookService.handleProductUpdate(dataId, loggedEventId);
//           } else {
//             throw new Error(`Unsupported action: ${action} for source ${source}`);
//           }
//           break;

//         default:
//           throw new Error(`Unsupported webhook sync source: ${source}`);
//       }

//       // 1. Check sync results 
//       if (result && (result.success || (result as any).success)) {
//        return result;
//       } else {
//         const errMsg = (result as any)?.message || "Sync operation returned unsuccessful state";
//         throw new Error(errMsg);
//       }
//     } catch (error) {
//       console.error(`[Cloud Worker Error] Failed processing job ${job.id}:`, error);
      
//       // We throw the error so BullMQ knows the job failed and can handle automatic retries
//       throw error;
//     }
//   },
//   { 
//     connection,
//     // Concurrency controls how many webhooks this worker processes simultaneously.
//     // Webhooks are fast, so you can safely handle multiple concurrently.
//     concurrency: 5 
//   }
// );

// // Worker Lifecycle Events
// cloudWorker.on("completed", (job) => {
//   console.log(`✓ [Cloud Worker] Job ${job.id} completed successfully.`);
// });

// cloudWorker.on("failed", (job, err) => {
//   console.error(`✗ [Cloud Worker] Job ${job?.id} failed:`, err.message);
// });

// cloudWorker.on("error", (error) => {
//   console.error("!! [Cloud Worker Critical Error]:", error);
// });

// console.log("🚀 Inflow Cloud Webhook Worker started. Listening for 'partner_sync' jobs...");

// // Graceful shutdown
// process.on("SIGTERM", async () => {
//   console.log("Shutting down cloud worker...");
//   await cloudWorker.close();
//   await prisma.$disconnect();
//   process.exit(0);
// });