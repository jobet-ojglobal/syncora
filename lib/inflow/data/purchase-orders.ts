import { inflow } from "@/lib/inflow/inflow.client";

export async function getPurchaseOrders() {
  return inflow.get(
    "/purchase-orders?include=vendor,lines.product"
  );
}

export async function getPurchaseOrder(
  purchaseOrderId: string
) {
  return inflow.get(
    `/purchase-orders/${purchaseOrderId}?include=vendor,lines.product`
  );
}

export async function createPurchaseOrder(
  data: any
) {
  return inflow.post(
    "/purchase-orders",
    data
  );
}