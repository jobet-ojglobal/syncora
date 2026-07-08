import { InflowPaymentTerm} from "@/lib/inflow/types";
import { BranchClient } from "../location.client";

export async function getPaymentTerm(
  batchId: string,
  url: string
) {
 const apiClient = new BranchClient(url)
  return await apiClient.get<InflowPaymentTerm>(
    `/inflow-local/payload/${batchId}`,
  );
}

export interface UpsertResult {
  success: boolean;
  message?: string;
  data?: any; 
}

export async function upsertPaymentTerm(
  payload: InflowPaymentTerm,
  url: string
) {
  const apiClient = new BranchClient(url)
  const { success, ...data } = await apiClient.post<UpsertResult>(
    `/inbound/receive`, {
        "eventType": "paymentTerm",
        "transactionType": "PAYMENT_TERM",
        "batch_id": `PYMNTTRM-${crypto.randomUUID().toLowerCase()}`,
        "sourceSystem": "MID",
        "sourceKey": "MID",
        "payload": payload
      }
  );
  return { success, data };
}
