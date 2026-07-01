// "use server";

// import { inflow } from "@/lib/inflow/inflow.client";
// import { findWebhook, subscribeWebhook } from "@/lib/inflow/webhooks/webhook.service";
// import { prisma } from "@/lib/prisma";

// export type ConnectionResult =
//   | {
//       success: true;
//       connected: true;
//       subscribed: boolean;
//       webhookId: string;
//       disabled: boolean;
//       failures: number;
//     }
//   | {
//       success: false;
//       connected: false;
//       error: string;
//     };

// export async function testInflowConnection() {
//   try {
//     const webhooks = await inflow.get<
//       {
//         webHookSubscriptionId: string;
//         url: string;
//         isDisabled: boolean;
//       }[]
//     >("/webhooks");

//     return {
//       success: true,
//       connected: true,
//       webhookCount: webhooks.length,
//       activeWebhookCount: webhooks.filter(
//         webhook => !webhook.isDisabled
//       ).length,
//     };
//   } catch (error) {
//     return {
//       success: false,
//       connected: false,
//       message:
//         error instanceof Error
//           ? error.message
//           : "Connection failed",
//     };
//   }
// }

// export async function testConnection(): Promise<ConnectionResult> {
//   try {
//     let webhook =
//       await findWebhook();

//     if (!webhook) {
//       webhook =
//         await subscribeWebhook();

//       await prisma.inflowWebhook.upsert({
//         where: {
//           id: webhook.webHookSubscriptionId,
//         },
//         create: {
//           id: webhook.webHookSubscriptionId,
//           url: webhook.url,
//           secret: webhook.secret ?? null,
//           events: webhook.events,
//         },
//         update: {},
//       });
//     }

//     return {
//       success: true,
//       connected: true,
//       subscribed: true,
//       webhookId: webhook.webHookSubscriptionId,
//       disabled: webhook.isDisabled,
//       failures: webhook.consecutiveFailureCount,
//     };
//   } catch (error) {
//     return {
//       success: false,
//       connected: false,
//       error:
//         error instanceof Error
//           ? error.message
//           : "Unknown error",
//     };
//   }
// }