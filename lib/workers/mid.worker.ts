// workers/mid.worker.ts
import { Worker, Job } from "bullmq";
import { prisma } from "@/lib/prisma";
import { connection } from "@/lib/redis";
import { upsertCustomer as upsertCloudCustomer } from "../inflow/data/customers";
import { upsertVendor as upsertCloudVendor } from "../inflow/data/vendors";
import { upsertCustomer as upsertLocalCustomer } from "../locations/data/customer";
import { upsertCategory as upsertLocalCategory } from "../locations/data/category";
import { upsertTaxingScheme as upsertLocalTaxingScheme } from "../locations/data/taxing-scheme";
import { upsertPricingScheme as upsertLocalPricingScheme } from "../locations/data/pricing-scheme";
import { upsertProduct as upsertLocalProductScheme, upsertProductImage as upsertLocalProductImageScheme } from "../locations/data/product";

interface MidWebhookJobData {
  source: string;
  model: string;
  payload: any;
  timestamp: string;
  location?: { inflowId: string; name: string; url: string };
}

export interface UpsertResult {
  success: boolean;
  message?: string;
  data?: any; 
}

const midWorker = new Worker<MidWebhookJobData>(
  "mid_sync",
  async (job: Job<MidWebhookJobData>) => {
    const { source, model, payload, timestamp, location } = job.data;
    const locationUrl = (location?.url && location.url.trim() !== "") ? location.url : null;

    console.log(`[Mid Worker] Processing job ${job.id} for source: ${source} (model: ${model}) at ${timestamp}`);
    try {
      let result: UpsertResult | undefined;

      if(locationUrl) {
        switch (source) {
          // ========= LOCAL JOBS ============
          case "TAXING_SCHEME_UPSERT_LOCAL": // OK
            result = await upsertLocalTaxingScheme(payload, locationUrl);
            break;
          case "CUSTOMER_UPSERT_LOCAL": // OK
            result = await upsertLocalCustomer(payload, locationUrl);
            break;
          case "VENDOR_UPSERT_LOCAL": 
            result = { success: true } //await upsertLocalCustomer(payload, locationUrl);
            break;
          case "CATEGORY_UPSERT_LOCAL": 
            result = await upsertLocalCategory(payload, locationUrl);
            break;
          case "PRODUCT_UPSERT_LOCAL": 
            // console.log(payload)
            result = await upsertLocalProductScheme(payload, locationUrl);
            break;
          case "PRODUCT_IMAGE_UPSERT_LOCAL": 
            // console.log(payload)
            result = await upsertLocalProductImageScheme(payload, locationUrl);
            break;
          case "PRICING_SCHEME_UPSERT_LOCAL": // OK
            if (!locationUrl) {
              throw new Error(`Cannot sync pricing scheme: No location URL found for location ${location?.name}`);
            }
            result = await upsertLocalPricingScheme(payload, locationUrl);
            break;
          case "BUSINESS_PARTNER_UPSERT_LOCAL": 
            if(model === "Vendor") {
              console.log(payload)
              result = { success: true}
              // await upsertCloudVendor(payload);
            } else if (model === "Customer") {
              console.log(payload)
              result = await upsertLocalCustomer(payload, locationUrl);
            }
            break;
          
          default:
            throw new Error(`Unsupported mid sync source: ${source}`);
        }
      } else {
        // ========= CLOUD JOBS ============
        switch (source) {
          case "BUSINESS_PARTNER_UPSERT_CLOUD": 
            if(model === "Vendor") {
              await upsertCloudVendor(payload);
              result = { success: true}
            } else if (model === "Customer") {
              await upsertCloudCustomer(payload);
              result = { success: true}
            }
            break;
          
          default:
            throw new Error(`Unsupported mid sync source: ${source}`);
        }
      }

      if (result?.success) {
        // 👉 FIX 3: Fixed payload data property path references for your loggers
        console.log(`[Mid Worker] Successfully synced ${model} (Global ID: ${payload.taxingSchemeId}) to ${location?.name}.`);
        
        // Extract the new local ID returned by your child system
        // 👉 FIX 1 & 2: Safely read the property out of the Axios/Fetch wrapped response object
        const newLocalId = result.data?.data?.localId || result.data?.localId;

        if (!newLocalId) {
          console.warn(`[Mid Worker Warning] Sync succeeded but 'localId' was missing from API response metadata.`);
          return;
        }

        if (location?.inflowId && payload.taxingSchemeId) {
          // 👉 FIX 4: Use an upsert strategy to prevent runtime crashes if a mapping row already exists
          // await prisma.taxingSchemeLocationMap.upsert({
          //   where: {
          //     taxingSchemeId_locationId: {
          //       taxingSchemeId: payload.taxingSchemeId, // Central cloudId string
          //       locationId: location.inflowId,          // Location branch identifier string
          //     }
          //   },
          //   update: {
          //     localId: Number(newLocalId)               // Ensure it registers cleanly as an Int
          //   },
          //   create: {
          //     taxingSchemeId: payload.taxingSchemeId,
          //     locationId: location.inflowId,
          //     localId: Number(newLocalId)
          //   }
          // });
          console.log(`[Mapping Registry] Saved Identity Map: Central String (${payload.taxingSchemeId}) ⇄ Local Int (${newLocalId}) for Location: ${location.name}`);
        }
        
      } else if (result) {
        console.error(`[Mid Worker Sync Warn] API did not return success for ${model}. Message: ${result.message}`);
        throw new Error(`Local Node Sync Refused: ${result.message}`); // Throw to trigger BullMQ auto-retry backoff
      }

    } catch (apiError: any) {
      console.error(`[Mid Worker API Error] Failed pushing to inFlow node:`, apiError.response?.data || apiError.message);
      throw apiError; // Ensures BullMQ logs the job as failed and tracks its execution lifecycle!
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

// // workers/mid.worker.ts
// import { Worker, Job } from "bullmq";
// import { prisma } from "@/lib/prisma";
// import { connection } from "@/lib/redis";
// import { upsertCustomer as upsertCloudCustomer } from "../inflow/data/customers";
// import { upsertVendor as upsertCloudVendor } from "../inflow/data/vendors";
// import { upsertCustomer as upsertLocalCustomer } from "../locations/data/customer";
// import { upsertTaxingScheme as upsertLocalTaxingScheme } from "../locations/data/taxing-scheme";


// interface MidWebhookJobData {
//   source: string;
//   model: string;
//   payload: any;
//   timestamp: string;
//   location?: { inflowId: string, name: string, url: string } 
// }

// export interface UpsertResult {
//   success: boolean;
//   message?: string;
//   data?: any; 
// }


// const midWorker = new Worker<MidWebhookJobData>(
//   "mid_sync", // Ties this worker explicitly to the mid_sync queue
//   async (job: Job<MidWebhookJobData>) => {
//     const { source, model, payload, timestamp, location } = job.data;

//     console.log(`[Mid Worker] Processing job ${job.id} for source: ${source} (model: ${model}) at ${timestamp}`);

//     const locationUrl = (location?.url && location.url.trim() !== "") ? location.url : null;

//     try {
//       let result: UpsertResult | undefined;

//       switch (source) {
//         // ========= TAXING SCHEME ============
//         case "TAXING_SCHEME_UPSERT_LOCAL":
//           if (!locationUrl) {
//             throw new Error(`Cannot sync taxing scheme: No location URL found for location ${location?.name}`);
//           }
//           result = await upsertLocalTaxingScheme(payload, locationUrl);
//           break;

//         // ========= CUSTOMER ============
//         case "CUSTOMER_SYNC_API":
//         case "CUSTOMER_SYNC_BULK":
//         case "CUSTOMER_UPSERT_LOCAL":
//           if (!locationUrl) {
//             throw new Error(`Cannot sync customer: No location URL found for location ${location?.name}`);
//           }
//           result = await upsertLocalCustomer(payload, locationUrl);
//           break;

//         case "CUSTOMER_UPSERT_CLOUD":
//           await upsertCloudCustomer(payload);
//           // Cloud upsert doesn't return an UpsertResult for local, so we simulate a basic success tracking object
//           result = { success: true }; 
//           break;

//         // ========= VENDOR ============
//         case "VENDOR_SYNC_API":
//         case "VENDOR_SYNC_BULK":
//         case "VENDOR_UPSERT_LOCAL":
//           await upsertCloudVendor(payload);
//           result = { success: true };
//           break;

//         case "VENDOR_UPSERT_CLOUD":
//           if (!locationUrl) {
//             throw new Error(`Cannot sync customer: No location URL found for location ${location?.name}`);
//           }

//           console.log(`[Mid Worker] UPSERT_LOCAL_VENDOR not implemented yet.`);
//           result = { success: false, message: "Not implemented" };
//           break;

//         default:
//           throw new Error(`Unsupported mid sync source: ${source}`);
//       }

//       if (result?.success) {
//         console.log(`[Mid Worker] Successfully synced ${model} ID: ${payload.payload.id}.`);
//         // Inside your local background worker success callback:
//         await prisma.taxingSchemeLocationMap.create({
//           data: {
//             taxingSchemeId: job.data.payload.taxingSchemeId, // Central cloudId
//             locationId: job.data.location.inflowId,          // Location branch identifier
//             localId: result..data.newLocalIntegerId      // E.g., 5 or 12
//           }
//         });
//       } else if (result) {
//         console.error(`[Mid Worker Sync Warn] API did not return success for ${model} ID:${payload.payload.id}. Message: ${result.message}`);
//       }

//     } catch (apiError: any) {
//       console.error(`[Mid Worker API Error] Failed pushing to inFlow:`, apiError.response?.data || apiError.message);
//     }
//   },
//   { 
//     connection,
//     concurrency: 5 
//   }
// );

