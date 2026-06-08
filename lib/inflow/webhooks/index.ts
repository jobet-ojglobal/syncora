import { env } from "@/lib/env";
import { inflow } from "../inflow.client";

export async function createWebhook() {
  return inflow.post("/webhooks", {
    url: `${env.APP_URL}/api/webhooks/inflow`,
    events: [
      "product.updated",
      "stock.updated",
      "sales_order.created",
    ],
  });
}