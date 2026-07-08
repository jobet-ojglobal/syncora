import { InflowTaxingScheme } from "@/lib/inflow/types";
import { BranchClient } from "../location.client";
import { taxingSchemeSchema } from "@/schemas/taxing-scheme.schema";

export interface UpsertResult {
  success: boolean;
  message?: string;
  data?: any; 
}

export async function upsertTaxingScheme(
  payload: InflowTaxingScheme,
  url: string
) {
  const apiClient = new BranchClient(url)
  return await apiClient.post<UpsertResult>(
    `/inbound/receive`, {
        "eventType": "taxingScheme",
        "transactionType": "TAXING_SCHEME",
        "batch_id": `TXSCM-${crypto.randomUUID().toLowerCase()}`,
        "sourceSystem": "MID",
        "sourceKey": payload.taxingSchemeId,
        "payload": payload 
      }
  );
}

export async function getTaxingScheme(
  batchId: string,
  url: string
) {
 const apiClient = new BranchClient(url)
  return await apiClient.get<InflowTaxingScheme>(
    `/inflow-local/payload/${batchId}`,
  );
}
