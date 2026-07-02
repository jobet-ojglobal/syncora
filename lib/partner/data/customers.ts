import { InflowCustomer } from "@/lib/inflow/types";
import { partnerApi } from "../partner.client"

export async function getCustomer(
  batchId: string
) {
  return await partnerApi.get<InflowCustomer>(
    `/customers/${batchId}`,
  );
}

export async function upsertCustomer(
  data: InflowCustomer
) {
  return await partnerApi.put<InflowCustomer>(
    `/customers`,
    data
  );
}