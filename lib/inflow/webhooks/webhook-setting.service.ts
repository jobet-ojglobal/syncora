// lib/inflow/services/webhook.service.ts
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { InflowEvent, InflowWebhook } from "../types/inflow";
import { inflow } from "../inflow.client";

const CLOUD_WEBHOOK_URL = `${process.env.APP_URL}/api/webhooks/inflow`;

export async function listWebhooks() {
  return inflow.get<InflowWebhook[]>("/webhooks");
}

/**
 * Finds the webhook registration. Falls back to finding ANY webhook 
 * ending in our path if APP_URL (like localhost vs ngrok) mismatch.
 */
export async function findWebhook() {
  const webhooks = await listWebhooks();
  
  // Try exact match first
  let match = webhooks.find(w => w.url === CLOUD_WEBHOOK_URL);
  
  // Dev fallback: match by path suffix if running through ngrok tunnels
  if (!match) {
    match = webhooks.find(w => w.url.endsWith("/api/webhooks/inflow"));
  }
  return match;
}

export async function findInflowWebhook() {
  try {
    const webhooks = await inflow.get<InflowWebhook[]>("/webhooks");
    let match = webhooks.find(w => w.url === CLOUD_WEBHOOK_URL);
    if (!match) {
      match = webhooks.find(w => w.url.endsWith("/api/webhooks/inflow"));
    }
    return match;
  } catch (error) {
    console.error("Failed to list remote inflow webhooks", error);
    return null;
  }
}

export async function createOrUpdateInflowWebhook(events: InflowEvent[]) {
  const existing = await findInflowWebhook();
  const webHookSubscriptionId = existing?.webHookSubscriptionId ?? randomUUID();

  const updatedWebhook = await inflow.put<InflowWebhook>("/webhooks", {
    webHookSubscriptionId: webHookSubscriptionId,
    webHookSubscriptionRequestId: randomUUID(),
    url: existing?.url ?? CLOUD_WEBHOOK_URL,
    events,
  });

  // Database Upsert safely keyed off the unique URL field
  await prisma.inflowWebhook.upsert({
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

export async function deleteInflowWebhook(webHookSubscriptionId: string) {
  await inflow.delete(`/webhooks/${webHookSubscriptionId}`);
  try {
    await prisma.inflowWebhook.deleteMany({
      where: { id: webHookSubscriptionId },
    });
  } catch (e) {
    console.error("Mid DB cleanup failed", e);
  }
}