import { InflowCustomer } from "@/lib/inflow/types";
import { BranchClient } from "../location.client";

export async function getCustomer(
  batchId: string,
  url: string
) {
 const apiClient = new BranchClient(url)
  return await apiClient.get<InflowCustomer>(
    `/inflow-local/payload/${batchId}`,
  );
}

export interface UpsertResult {
  success: boolean;
  message?: string;
  data?: any; 
}

export async function upsertCustomer(
  payload: InflowCustomer,
  url: string
) {
  const apiClient = new BranchClient(url)
  const { success, ...data } = await apiClient.post<UpsertResult>(
    `/inbound/receive`, {
        "eventType": "customerLocal",
        "transactionType": "CUSTOMER",
        "batch_id": `CSTMR-${crypto.randomUUID().toLowerCase()}`,
        "sourceSystem": "MID",
        "sourceKey": payload.customerId,
        "payload": payload
      }
  );
  return { success, data };
}
