import { InflowPurchaseOrder } from "@/lib/inflow/types";
import { partnerApi } from "../partner.client"

export async function getPurchaseOrder(
  batchId: string
) {
  return partnerApi.get<InflowPurchaseOrder>(
    `/transactions/open/purchase/${batchId}`,
  );
}
