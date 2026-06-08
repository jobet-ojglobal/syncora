"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { 
  syncWebhooks, 
  subscribeWebhook, 
  deleteWebhook, 
  ensureWebhook, 
  InflowEvent 
} from "@/lib/inflow/services/webhook.service";

export async function getIntegrationState() {
  const integration = await prisma.inflowIntegration.findFirst() || await prisma.inflowIntegration.create({
    data: { isConnected: false }
  });

  const syncedWebhooks = await prisma.inflowWebhook.findMany({
    orderBy: { createdAt: "desc" }
  });

  return { integration, syncedWebhooks };
}

export async function connectIntegration() {
  try {
    // 1. Setup the mandatory webhooks via the service
    const webhook = await ensureWebhook();
    
    // 2. Clear out existing connection configs, then build the new one
    await prisma.inflowIntegration.updateMany({
      data: {
        isConnected: true,
        webhookId: webhook.webHookSubscriptionId,
        webhookUrl: webhook.url,
        secret: webhook.secret || null
      }
    });

    await syncWebhooks();
    revalidatePath("/settings/inflow");
    return { success: true };
  } catch (error) {
    console.error("Failed to connect inFlow:", error);
    return { success: false, error: "Connection initialization failed." };
  }
}

export async function disconnectIntegration(webhookId: string | null) {
  try {
    if (webhookId) {
      await deleteWebhook(webhookId).catch(() => {
        console.warn(`Webhook ${webhookId} couldn't be deleted from inFlow API, forcing local disconnect.`);
      });
      await prisma.inflowWebhook.delete({ where: { id: webhookId } }).catch(() => {});
    }

    await prisma.inflowIntegration.updateMany({
      data: {
        isConnected: false,
        webhookId: null,
        webhookUrl: null,
        secret: null
      }
    });

    revalidatePath("/settings/inflow");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to cleanly disconnect." };
  }
}

export async function triggerManualSync() {
  try {
    await syncWebhooks();
    revalidatePath("/settings/inflow");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Sync failed." };
  }
}