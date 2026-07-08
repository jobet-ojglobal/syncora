import { InflowCurrency} from "@/lib/inflow/types";
import { BranchClient } from "../location.client";

export async function getCurrency(
  batchId: string,
  url: string
) {
 const apiClient = new BranchClient(url)
  return await apiClient.get<InflowCurrency>(
    `/inflow-local/payload/${batchId}`,
  );
}

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
  const { success, ...data } = await apiClient.post<UpsertResult>(
    `/inbound/receive`, {
        "eventType": "currency",
        "transactionType": "CURRENCY",
        "batch_id": `CRRNCY-${crypto.randomUUID().toLowerCase()}`,
        "sourceSystem": "MID",
        "sourceKey": "MID",
        "payload": payload
      }
  );
  return { success, data };
}
