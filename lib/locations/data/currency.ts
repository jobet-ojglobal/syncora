import { InflowCurrency } from "@/lib/inflow/types";
import { BranchClient } from "../location.client";

export interface UpsertResult {
  success: boolean;
  message?: string;
  data?: any; 
}

export async function upsertCurrency(
  payload: InflowCurrency,
  url: string
) {
  const apiClient = new BranchClient(url)
  return await apiClient.post<UpsertResult>(
    `/inbound/receive`, {
        "eventType": "currencyLocal",
        "transactionType": "CURRENCY",
        "batch_id": `CRRNCY-${crypto.randomUUID().toLowerCase()}`,
        "sourceSystem": "MID",
        "sourceKey": payload.currencyId,
        "payload": payload 
      }
  );
}

export async function getCurrency(
  batchId: string,
  url: string
) {
 const apiClient = new BranchClient(url)
  return await apiClient.get<InflowCurrency>(
    `/inflow-local/payload/${batchId}`,
  );
}
