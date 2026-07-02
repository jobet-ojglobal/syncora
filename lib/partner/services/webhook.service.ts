// lib/partner/services/webhook.service.ts
import { partnerApi } from "../partner.client";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { InflowEvent, PartnerWebhook } from "../types/webhook";

const PARTNER_WEBHOOK_URL = `${process.env.APP_URL}/api/webhooks/partner`;

// export type PartnerEvent = "order.created" | "order.shipped" | "inventory.updated";

// export interface PartnerWebhookResponse {
//   subscriptionId: string;
//   url: string;
//   events: string[];
//   secret?: string;
// }

export async function listWebhooks() {
  return partnerApi.get<PartnerWebhook[]>("/webhooks");
}

/**
 * Finds the webhook registration. Falls back to finding ANY webhook 
 * ending in our path if APP_URL (like localhost vs ngrok) mismatch.
 */
export async function findWebhook() {
  const webhooks = await listWebhooks();
  
  // Try exact match first
  let match = webhooks.find(w => w.url === PARTNER_WEBHOOK_URL);
  
  // Dev fallback: match by path suffix if running through ngrok tunnels
  if (!match) {
    match = webhooks.find(w => w.url.endsWith("/api/webhooks/partner"));
  }
  return match;
}

export async function findPartnerWebhook() {
  try {
    const webhooks = await partnerApi.get<PartnerWebhook[]>("/webhooks");
    let match = webhooks.find(w => w.url === PARTNER_WEBHOOK_URL);
    if (!match) {
      match = webhooks.find(w => w.url.endsWith("/api/webhooks/partner"));
    }
    return match;
  } catch (error) {
    console.error("Failed to list remote partner webhooks", error);
    return null;
  }
}

export async function createOrUpdatePartnerWebhook(events: InflowEvent[]) {
  const existing = await findPartnerWebhook();
  const webHookSubscriptionId = existing?.webHookSubscriptionId ?? randomUUID();

  const updatedWebhook = await partnerApi.put<PartnerWebhook>("/webhooks", {
      subscriptionId: webHookSubscriptionId,
      partnerName: "Mid Central App",
      webHookSubscriptionRequestId: randomUUID(),
      url: existing?.url ?? PARTNER_WEBHOOK_URL,
      events,
  });

  // Database Upsert safely keyed off the unique URL field
  await prisma.partnerWebhook.upsert({
      where: { url: updatedWebhook.url },
      create: {
        id: updatedWebhook.webHookSubscriptionId,
        url: updatedWebhook.url,
        events: updatedWebhook.events,
        secret: updatedWebhook.secret ?? null,
        isDisabled: updatedWebhook.isDisabled ?? false,
        consecutiveFailureCount: updatedWebhook.consecutiveFailureCount ?? 0,
      },
      update: {
        id: updatedWebhook.webHookSubscriptionId,
        events: updatedWebhook.events,
        isDisabled: updatedWebhook.isDisabled ?? false,
        consecutiveFailureCount: updatedWebhook.consecutiveFailureCount ?? 0,
      },
  });

  return updatedWebhook;
}

export async function deletePartnerWebhook(webHookSubscriptionId: string) {
  await partnerApi.delete(`/webhooks/${webHookSubscriptionId}`);
  try {
    await prisma.partnerWebhook.deleteMany({
      where: { id: webHookSubscriptionId },
    });
  } catch (e) {
    console.error("Local partner DB cleanup failed", e);
  }
}