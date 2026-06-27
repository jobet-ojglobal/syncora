import { InflowSalesOrder } from "@/lib/inflow/types";
import { partnerApi } from "../partner.client"

export async function getSalesOrder(
  batchId: string
) {
  return partnerApi.get<InflowSalesOrder>(
    `/transactions/open/sales/${batchId}`,
  );
}
