// actions/inflow-actions.ts
"use server";

import { 
  findWebhook, 
  createOrUpdateWebhook, 
  deleteWebhook, 
  INFLOW_EVENTS,
  InflowEvent
} from "@/lib/inflow/services/webhook.service";
import { revalidatePath } from "next/cache";

export async function getWebhookStatus() {
  try {
    const webhook = await findWebhook();
    return { success: true, webhook: webhook ?? null };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to fetch status" };
  }
}

export async function connectWebhook() {
  try {
    // Connect initial setup with default core events
    const defaultEvents: InflowEvent[] = ["product.updated", "salesOrder.updated"];
    const webhook = await createOrUpdateWebhook(defaultEvents);
    revalidatePath("/settings/inflow");
    return { success: true, webhook };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to connect" };
  }
}

export async function disconnectWebhook(webhookId: string) {
  try {
    await deleteWebhook(webhookId);
    revalidatePath("/settings/inflow");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to disconnect" };
  }
}

export async function updateSubscriptionEvents(events: InflowEvent[]) {
  try {
    const webhook = await createOrUpdateWebhook(events);
    revalidatePath("/settings/inflow");
    return { success: true, webhook };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update events" };
  }
}