import { InflowPricingScheme} from "@/lib/inflow/types";
import { BranchClient } from "../location.client";

export async function getPricingScheme(
  batchId: string,
  url: string
) {
 const apiClient = new BranchClient(url)
  return await apiClient.get<InflowPricingScheme>(
    `/inflow-local/payload/${batchId}`,
  );
}

export interface UpsertResult {
  success: boolean;
  message?: string;
  data?: any; 
}

export async function upsertPricingScheme(
  payload: InflowPricingScheme,
  url: string
) {
  const apiClient = new BranchClient(url)
  const { success, ...data } = await apiClient.post<UpsertResult>(
    `/inbound/receive`, {
        "eventType": "pricingSchemeLocal",
        "transactionType": "PRICING_SCHEME",
        "batch_id": `PRCNGSCHM-${crypto.randomUUID().toLowerCase()}`,
        "sourceSystem": "MID",
        "sourceKey": "MID",
        "payload": payload
      }
  );
  return { success, data };
}
