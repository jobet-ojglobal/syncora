import { inflow } from "@/lib/inflow/inflow.client";
import { InflowPurchaseOrder } from "../types";

export async function getPurchaseOrders(
  count = 100,
  after?: string,
) {
  const params = new URLSearchParams({
    count: String(count),
    include: "vendor,lines.product,unstockLines,receiveLines,attachments,taxingScheme,paymentTerms,paymentLines,currency,location,lastModifiedBy,approverTeamMember,assignedToTeamMember",
  });

  if (after) {
    params.append("after", after);
  }

  return inflow.get<InflowPurchaseOrder[]>(
    `/purchase-orders?${params.toString()}`
  );
}

export async function getPurchaseOrder(
  purchaseOrderId: string
) {
  return inflow.get<InflowPurchaseOrder>(
    `/purchase-orders/${purchaseOrderId}?include=vendor,lines.product,unstockLines,receiveLines,attachments,taxingScheme,paymentTerms,paymentLines,currency,location,lastModifiedBy,approverTeamMember,assignedToTeamMembe`
  );
}

export async function upsertPurchaseOrder(
  data: any
) {
  return inflow.post(
    "/purchase-orders",
    data
  );
}