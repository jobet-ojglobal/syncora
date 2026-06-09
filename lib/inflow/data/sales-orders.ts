import { inflow } from "@/lib/inflow/inflow.client";

export async function getSalesOrders() {
  return inflow.get(
    "/sales-orders?include=customer,lines.product"
  );
}

export async function getSalesOrder(
  salesOrderId: string
) {
  return inflow.get(
    `/sales-orders/${salesOrderId}?include=customer,lines.product`
  );
}

export async function createSalesOrder(
  data: any
) {
  return inflow.post(
    "/sales-orders",
    data
  );
}

export async function updateSalesOrder(
  salesOrderId: string,
  data: any
) {
  return inflow.put(
    `/sales-orders/${salesOrderId}`,
    data
  );
}