// lib/locations/services/webhook.service.ts
import { BranchClient } from "../location.client";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { InflowEvent, LocationWebhook } from "../types/webhook.type";

const getWebhookUrlForLocation = (inflowId: string) => {
  return `${process.env.SITE_URL}/api/webhooks/locations?locationId=${inflowId}`;
};

// Helper helper to get a location-specific API client
async function getClientForLocation(inflowId: string): Promise<{ client: BranchClient; locationName: string }> {
  const location = await prisma.location.findUnique({
    where: { inflowId },
    select: { url: true, name: true }
  });

  if (!location || !location.url) {
    throw new Error(`Location with Inflow ID ${inflowId} does not have a configured location API URL.`);
  }

  return {
    client: new BranchClient(location.url),
    locationName: location.name
  };
}

export async function findLocationWebhookByLocation(inflowId: string) {
  try {
    const { client } = await getClientForLocation(inflowId);
    
    // Pass a shorter 1.5-second timeout override for quick UI rendering
    const webhooks = await client.get<LocationWebhook[]>("/webhooks", { timeout: 1500 });
    const targetUrl = getWebhookUrlForLocation(inflowId);
    
    let match = webhooks.find(w => w.url === targetUrl);
    if (!match) {
      match = webhooks.find(w => w.url.endsWith(`/api/webhooks/locations?locationId=${inflowId}`));
    }
    return match;
  } catch (error) {
    // If it times out or throws, we log it and return null.
    // The UI will safely read webhook: null, hasUrl: true -> Show "Connection Stream Offline"
    console.error(`Failed to list remote location webhooks for location ${inflowId}:`, error);
    return null;
  }
}

export async function createOrUpdateLocationWebhook(inflowId: string, events: InflowEvent[]) {
  const { client, locationName } = await getClientForLocation(inflowId);
  const existing = await findLocationWebhookByLocation(inflowId);
  
  const webHookSubscriptionId = existing?.webHookSubscriptionId ?? randomUUID();
  const targetUrl = existing?.url ?? getWebhookUrlForLocation(inflowId);

  // Send request to the custom location domain
  const updatedWebhook = await client.put<LocationWebhook>("/webhooks", {
    subscriptionId: webHookSubscriptionId,
    partnerName: `Mid Central App - ${locationName}`,
    webHookSubscriptionRequestId: randomUUID(),
    url: targetUrl,
    events,
  });

  // Save changes locally
  await prisma.locationWebhook.upsert({
    where: { url: updatedWebhook.url },
    create: {
      id: updatedWebhook.webHookSubscriptionId,
      locationId: inflowId, 
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

export async function deleteLocationWebhook(inflowId: string, webHookSubscriptionId: string) {
  const { client } = await getClientForLocation(inflowId);
  
  // Delete from the custom location domain
  await client.delete(`/webhooks/${webHookSubscriptionId}`);
  
  try {
    await prisma.locationWebhook.deleteMany({
      where: { id: webHookSubscriptionId },
    });
  } catch (e) {
    console.error("Local location DB cleanup failed", e);
  }
}