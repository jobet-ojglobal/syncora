// workers/location-webhook.worker.ts
import { Worker, Job } from "bullmq";
import { prisma } from "@/lib/prisma";
import { connection } from "@/lib/redis";
import { CustomerSyncResult, InflowCustomerWebhookService } from "../locations/services/customer-upsert.service";
import { MappingWebhookService } from "../locations/services/mapping.service";

// import { locationApi } from "@/lib/location/location.client";
// import { CustomerSyncResult } from "@/lib/location/webhooks/webhook-customer.service";
// import { InflowSalesOrderWebhookService } from "@/lib/location/webhooks/webhook-sales-order.service";
// import { InflowCustomerWebhookService } from "@/lib/location/webhooks/webhook-customer.service";

interface LocationWebhookJobData {
  source: string;
  dataId: string;
  locationId: string; 
  loggedEventId: string;
  data?: any
}

const locationWorker = new Worker<LocationWebhookJobData>(
  "location_sync", // Ties this worker explicitly to the location_sync queue
  async (job: Job<LocationWebhookJobData>) => {
    const { source, dataId, loggedEventId, locationId, data } = job.data;

    console.log(`[Location Worker] Processing job ${job.id} for source: ${source}`);

    try {
      let result;

      switch (source) {
        case "customer":
          result = await InflowCustomerWebhookService.handleCustomerUpsert(dataId, loggedEventId, locationId);
          break;
        case "salesOrder":
          result = { success: true};
          break;

        // Local map (inflowId, localId, eventId, locationId)
        // case "categoriesLocal":
        //   result = await MappingWebhookService.handleCustomerMap(data.customerId, dataId, loggedEventId, locationId); 
        //   break;
        // case "taxCodeLocal":
        //   result = await MappingWebhookService.handleTaxCodeMap(data.currencyId, dataId, loggedEventId, locationId);
        //   break;
        case "taxingSchemeLocal":
          result = await MappingWebhookService.handleTaxingSchemeMap(data.taxingSchemeId, dataId, loggedEventId, locationId);
          break;
        // case "currencyLocal":
        //   result = await MappingWebhookService.handleCurrencyMap(data.currencyId, dataId, loggedEventId, locationId);
        //   break;
        // case "pricingSchemeLocal":
        //   result = await MappingWebhookService.handlePricingSchemeMap(data.currencyId, dataId, loggedEventId, locationId);
        //   break;
         case "customerLocal":
          result = await MappingWebhookService.handleCustomerMap(data.customerId, dataId, loggedEventId, locationId); 
          break;
        

        default:
          throw new Error(`Unsupported webhook sync source: ${source}`);
      }

      if (result?.success) {
        if (source === "customer") {
          const customerResult = result as CustomerSyncResult;
          
          if (customerResult.inflowPayload) {
            console.log(`[Location Worker] Dispatching customer downstream job to midSyncQueue for ID: ${dataId}`);
            // await getMidSyncQueue().add(
            //   "customer_sync_job",
            //   {
            //     source: "UPSERT_CLOUD_CUSTOMER",
            //     model: "CUSTOMER",
            //     payload: customerResult.inflowPayload, // 3. TypeScript is happy now!
            //     timestamp: new Date().toISOString()
            //   },
            //   { 
            //     attempts: 3, 
            //     backoff: { type: "exponential", delay: 2000 },
            //     removeOnComplete: true
            //   }
            // );
          }
        }
      }

    } catch (error) {
      console.error(`[Location Worker Error] Failed processing job ${job.id}:`, error);
      
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
locationWorker.on("completed", (job) => {
  console.log(`✓ [Location Worker] Job ${job.id} completed successfully.`);
});

locationWorker.on("failed", (job, err) => {
  console.error(`✗ [Location Worker] Job ${job?.id} failed:`, err.message);
});

locationWorker.on("error", (error) => {
  console.error("!! [Location Worker Critical Error]:", error);
});

console.log("🚀 Location Webhook Worker started. Listening for 'location_sync' jobs...");

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("Shutting down location worker...");
  await locationWorker.close();
  await prisma.$disconnect();
  process.exit(0);
});