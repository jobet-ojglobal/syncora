import { inflow } from "@/lib/inflow/inflow.client";
import { InflowSalesOrder } from "../types";

export async function getSalesOrders(
  count = 100,
  after?: string,
) {
  const params = new URLSearchParams({
    count: String(count),
    include: "customer,lines.product,shipLines,restockLines,pickLines,pickAllocationLines,pickAllocationFailures,paymentLines,packLines,attachments,salesRepTeamMember,pricingScheme,taxingScheme,paymentTerms,currency,costOfGoodsSold,location,lastModifiedBy,confirmerTeamMember,assignedToTeamMember",
  });

  if (after) {
    params.append("after", after);
  }

  return inflow.get<InflowSalesOrder[]>(
    `/sales-orders?${params.toString()}`
  );
}

export async function getSalesOrder(
  salesOrderId: string
) {
  return inflow.get<InflowSalesOrder>(
    `/sales-orders/${salesOrderId}?include=customer,lines.product,shipLines,restockLines,pickLines,pickAllocationLines,pickAllocationFailures,paymentLines,packLines,attachments,salesRepTeamMember,pricingScheme,taxingScheme,paymentTerms,currency,costOfGoodsSold,location,lastModifiedBy,confirmerTeamMember,assignedToTeamMember`
  );
}

export async function upsertSalesOrder(
  data: any
) {
  try {
    return await inflow.put(
      "/sales-orders",
      data
    );
  } catch (e: any) {
    console.log(e)
  }
}
