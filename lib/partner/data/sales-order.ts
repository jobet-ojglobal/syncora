import { partnerApi } from "../partner.client"

export async function getSalesOrder(
  batchId: string
) {
  return partnerApi.get(
    `/transactions/open/sales/${batchId}`,
  );
}
