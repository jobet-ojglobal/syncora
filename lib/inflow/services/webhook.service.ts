// lib/inflow/services/webhook.service
import { inflow } from "@/lib/inflow/inflow.client";
import { randomUUID } from "crypto";
import { InflowWebhook } from "../types";
import { prisma } from "@/lib/prisma";

const WEBHOOK_URL =
  `${process.env.APP_URL}/api/webhooks/inflow`;

export type InflowEvent =
  | "customer.created"
  | "customer.updated"
  | "vendor.created"
  | "vendor.updated"
  | "purchaseOrder.created"
  | "purchaseOrder.updated"
  | "salesOrder.created"
  | "salesOrder.updated"
  | "product.created"
  | "product.updated";

export const INFLOW_EVENTS: InflowEvent[] = [
  "customer.created",
  "customer.updated",
  "vendor.created",
  "vendor.updated",
  "purchaseOrder.created",
  "purchaseOrder.updated",
  "salesOrder.created",
  "salesOrder.updated",
  "product.created",
  "product.updated",
];

export async function listWebhooks() {
  return inflow.get<InflowWebhook[]>(
    "/webhooks"
  );
}

export async function findWebhook() {
  const webhooks =
    await inflow.get<InflowWebhook[]>(
      "/webhooks"
    );

  return webhooks.find(
    webhook =>
      webhook.url === WEBHOOK_URL
  );
}

export async function getWebhook(
  id: string
) {
  return inflow.get<InflowWebhook>(
    `/webhooks/${id}`
  );
}

export async function syncWebhooks() {
  const webhooks =
    await listWebhooks();

  for (const webhook of webhooks) {
    await prisma.inflowWebhook.upsert({
      where: {
        id:
          webhook.webHookSubscriptionId,
      },

      create: {
        id:
          webhook.webHookSubscriptionId,
        url: webhook.url,
        events: webhook.events,
      },

      update: {
        url: webhook.url,
        events: webhook.events,
      },
    });
  }

  return webhooks;
}

export async function ensureWebhook() {
  let webhook =
    await findWebhook();

  if (!webhook) {
    webhook =
      await createWebhook([
        "product.updated",
        "salesOrder.updated",
      ]);
  }

  return webhook;
}

export async function createWebhook(
  events: InflowEvent[]
) {
  return inflow.put<InflowWebhook>(
    "/webhooks",
    {
      webHookSubscriptionId:
        randomUUID(),

      webHookSubscriptionRequestId:
        randomUUID(),

      url: WEBHOOK_URL,

      events,
    }
  );
}

export async function updateWebhook(
  webhookId: string,
  events: InflowEvent[]
) {
  return inflow.put<InflowWebhook>(
    "/webhooks",
    {
      webHookSubscriptionId:
        webhookId,

      webHookSubscriptionRequestId:
        randomUUID(),

      url: WEBHOOK_URL,

      events,
    }
  );
}

export async function subscribeWebhook() {
  return inflow.put<InflowWebhook>(
    "/webhooks",
    {
      webHookSubscriptionId:
        randomUUID(),

      webHookSubscriptionRequestId:
        randomUUID(),

      url: WEBHOOK_URL,

      events: INFLOW_EVENTS,
    }
  );
}

export async function deleteWebhook(
  webhookId: string
) {
  return inflow.delete<void>(
    `/webhooks/${webhookId}`
  );
}