// // lib/inflow/services/webhook.service.ts
// import { inflow } from "@/lib/inflow/inflow.client";
// import { randomUUID } from "crypto";
// import { prisma } from "@/lib/prisma";
// import { InflowWebhook } from "../types/inflow";

// const WEBHOOK_URL = `${process.env.APP_URL}/api/webhooks/inflow`;

// export type InflowEvent =
//   | "customer.created" | "customer.updated"
//   | "vendor.created" | "vendor.updated"
//   | "purchaseOrder.created" | "purchaseOrder.updated"
//   | "salesOrder.created" | "salesOrder.updated"
//   | "product.created" | "product.updated";

// export const INFLOW_EVENTS: InflowEvent[] = [
//   "customer.created", "customer.updated",
//   "vendor.created", "vendor.updated",
//   "purchaseOrder.created", "purchaseOrder.updated",
//   "salesOrder.created", "salesOrder.updated",
//   "product.created", "product.updated",
// ];

// export async function listWebhooks() {
//   return inflow.get<InflowWebhook[]>("/webhooks");
// }

// /**
//  * Finds the webhook registration. Falls back to finding ANY webhook 
//  * ending in our path if APP_URL (like localhost vs ngrok) mismatch.
//  */
// export async function findWebhook() {
//   const webhooks = await listWebhooks();
  
//   // Try exact match first
//   let match = webhooks.find(w => w.url === WEBHOOK_URL);
  
//   // Dev fallback: match by path suffix if running through ngrok tunnels
//   if (!match) {
//     match = webhooks.find(w => w.url.endsWith("/api/webhooks/inflow"));
//   }
//   return match;
// }

// export async function syncWebhooks() {
//   const webhooks = await listWebhooks();

//   for (const webhook of webhooks) {
//     await prisma.inflowWebhook.upsert({
//       // We look up by URL now to prevent creating side-by-side duplicates
//       where: { url: webhook.url }, 
//       create: {
//         id: webhook.webHookSubscriptionId,
//         url: webhook.url,
//         events: webhook.events,
//         secret: webhook.secret ?? null,
//         isDisabled: webhook.isDisabled ?? false,
//         consecutiveFailureCount: webhook.consecutiveFailureCount ?? 0,
//       },
//       update: {
//         // If it exists, update the fields but preserve your secret if inFlow doesn't send it back
//         id: webhook.webHookSubscriptionId, 
//         events: webhook.events,
//         isDisabled: webhook.isDisabled ?? false,
//         consecutiveFailureCount: webhook.consecutiveFailureCount ?? 0,
//         ...(webhook.secret ? { secret: webhook.secret } : {}),
//       },
//     });
//   }
//   return webhooks;
// }

// export async function createOrUpdateWebhook(events: InflowEvent[]) {
//   const existing = await findWebhook();
  
//   // If we already have a record locally or remotely, re-use its ID. 
//   // Otherwise, fallback to a fresh UUID.
//   const webhookId = existing?.webHookSubscriptionId ?? randomUUID();
  
//   const updatedWebhook = await inflow.put<InflowWebhook>("/webhooks", {
//     webHookSubscriptionId: webhookId,
//     webHookSubscriptionRequestId: randomUUID(),
//     url: existing?.url ?? WEBHOOK_URL,
//     events,
//   });

//   // Database Upsert safely keyed off the unique URL field
//   await prisma.inflowWebhook.upsert({
//     where: { url: updatedWebhook.url },
//     create: {
//       id: updatedWebhook.webHookSubscriptionId,
//       url: updatedWebhook.url,
//       events: updatedWebhook.events,
//       secret: updatedWebhook.secret ?? null,
//       isDisabled: updatedWebhook.isDisabled ?? false,
//       consecutiveFailureCount: updatedWebhook.consecutiveFailureCount ?? 0,
//     },
//     update: {
//       id: updatedWebhook.webHookSubscriptionId,
//       events: updatedWebhook.events,
//       isDisabled: updatedWebhook.isDisabled ?? false,
//       consecutiveFailureCount: updatedWebhook.consecutiveFailureCount ?? 0,
//     },
//   });

//   return updatedWebhook;
// }


// export async function deleteWebhook(webhookId: string) {
//   // Use the raw delete or handle the empty response
//   await inflow.delete<void>(`/webhooks/${webhookId}`);
  
//   // Clean up local DB registration
//   try {
//     await prisma.inflowWebhook.deleteMany({
//       where: { id: webhookId }
//     });
//   } catch (e) {
//     console.error("Local DB cleanup failed, but remote was deleted", e);
//   }
// }


// export async function getWebhook(
//   id: string
// ) {
//   return inflow.get<InflowWebhook>(
//     `/webhooks/${id}`
//   );
// }

// export async function ensureWebhook() {
//   let webhook =
//     await findWebhook();

//   if (!webhook) {
//     webhook =
//       await createWebhook([
//         "product.updated",
//         "salesOrder.updated",
//       ]);
//   }

//   return webhook;
// }

// export async function createWebhook(
//   events: InflowEvent[]
// ) {
//   return inflow.put<InflowWebhook>(
//     "/webhooks",
//     {
//       webHookSubscriptionId:
//         randomUUID(),

//       webHookSubscriptionRequestId:
//         randomUUID(),

//       url: WEBHOOK_URL,

//       events,
//     }
//   );
// }

// export async function updateWebhook(
//   webhookId: string,
//   events: InflowEvent[]
// ) {
//   return inflow.put<InflowWebhook>(
//     "/webhooks",
//     {
//       webHookSubscriptionId:
//         webhookId,

//       webHookSubscriptionRequestId:
//         randomUUID(),

//       url: WEBHOOK_URL,

//       events,
//     }
//   );
// }

// export async function subscribeWebhook() {
//   return inflow.put<InflowWebhook>(
//     "/webhooks",
//     {
//       webHookSubscriptionId:
//         randomUUID(),

//       webHookSubscriptionRequestId:
//         randomUUID(),

//       url: WEBHOOK_URL,

//       events: INFLOW_EVENTS,
//     }
//   );
// }



// export async function createOrUpdateWebhook(events: InflowEvent[]) {
//   const existing = await findWebhook();
//   const webhookId = existing?.webHookSubscriptionId ?? randomUUID();
  
//   // inFlow uses PUT for both creation and updates
//   const updatedWebhook = await inflow.put<InflowWebhook>("/webhooks", {
//     webHookSubscriptionId: webhookId,
//     webHookSubscriptionRequestId: randomUUID(),
//     url: existing?.url ?? WEBHOOK_URL, // Keep existing remote URL if matched via fallback
//     events,
//   });

//   console.log('update web hook')

//   // Sync locally to DB
//   await prisma.inflowWebhook.upsert({
//     where: { id: updatedWebhook.webHookSubscriptionId },
//     create: {
//       id: updatedWebhook.webHookSubscriptionId,
//       url: updatedWebhook.url,
//       events: updatedWebhook.events,
//       isDisabled: updatedWebhook.isDisabled ?? false,
//       consecutiveFailureCount: updatedWebhook.consecutiveFailureCount ?? 0,
//     },
//     update: {
//       url: updatedWebhook.url,
//       events: updatedWebhook.events,
//       isDisabled: updatedWebhook.isDisabled ?? false,
//       consecutiveFailureCount: updatedWebhook.consecutiveFailureCount ?? 0,
//     },
//   });

//   return updatedWebhook;
// }


// export async function listWebhooks() {
//   return inflow.get<InflowWebhook[]>(
//     "/webhooks"
//   );
// }

// export async function findWebhook() {
//   const webhooks =
//     await inflow.get<InflowWebhook[]>(
//       "/webhooks"
//     );

//   return webhooks.find(
//     webhook =>
//       webhook.url === WEBHOOK_URL
//   );
// }

// export async function syncWebhooks() {
//   const webhooks = await listWebhooks();

//   for (const webhook of webhooks) {
//     await prisma.inflowWebhook.upsert({
//       where: { id: webhook.webHookSubscriptionId },
//       create: {
//         id: webhook.webHookSubscriptionId,
//         url: webhook.url,
//         events: webhook.events,
//         // Make sure these match what the inFlow API sends down
//         isDisabled: webhook.isDisabled ?? false,
//         consecutiveFailureCount: webhook.consecutiveFailureCount ?? 0,
//       },
//       update: {
//         url: webhook.url,
//         events: webhook.events,
//         isDisabled: webhook.isDisabled ?? false,
//         consecutiveFailureCount: webhook.consecutiveFailureCount ?? 0,
//       },
//     });
//   }
//   return webhooks;
// }

// export async function deleteWebhook(
//   webhookId: string
// ) {
//   return inflow.delete<void>(
//     `/webhooks/${webhookId}`
//   );
// }


// export async function syncWebhooks() {
//   const webhooks =
//     await listWebhooks();

//   for (const webhook of webhooks) {
//     await prisma.inflowWebhook.upsert({
//       where: {
//         id:
//           webhook.webHookSubscriptionId,
//       },

//       create: {
//         id:
//           webhook.webHookSubscriptionId,
//         url: webhook.url,
//         events: webhook.events,
//       },

//       update: {
//         url: webhook.url,
//         events: webhook.events,
//       },
//     });
//   }

//   return webhooks;
// }