import { BranchClient } from "../location.client";
import { LocalTaxingScheme } from "../types";
  
export interface UpsertResult {
  success: boolean;
  message?: string;
  data?: any; 
}

export async function upsertTaxingScheme(
  payload: LocalTaxingScheme,
  url: string
) {
  const apiClient = new BranchClient(url)
  return await apiClient.post<UpsertResult>(
    `/inbound/receive`, {
        "eventType": "taxingSchemeLocal",
        "transactionType": "TAXING_SCHEME",
        "batch_id": `TXSCM-${crypto.randomUUID().toLowerCase()}`,
        "sourceSystem": "MID",
        "sourceKey": payload.taxingSchemeId,
        "payload": payload 
      }
  );
}

export async function getTaxingSchemes(url: string) {
 const apiClient = new BranchClient(url)
  return await apiClient.get<LocalTaxingScheme[]>(
    `/inflow-local/taxing-schemes`,
  );
}

export async function getTaxingScheme(
  batchId: string,
  url: string
) {
 const apiClient = new BranchClient(url)
  return await apiClient.get<LocalTaxingScheme>(
    `/inflow-local/payload/${batchId}`,
  );
}


export async function getLocalBatchTaxingSchemes(
  url: string,
  count = 50,
  after?: string,
  includes: string[] = []
) {
  // 1. Specify base relation includes here if needed
  const baseIncludes: string[] = [];

  // 2. Filter empty strings to prevent trailing/leading commas in the query string
  const mergedIncludes = Array.from(new Set([...baseIncludes, ...includes]))
    .filter(Boolean)
    .join(",");

  const params = new URLSearchParams({
    count: String(count),
  });

  if (mergedIncludes) {
    params.append("include", mergedIncludes);
  }

  if (after) {
    params.append("after", after);
  }

  const apiClient = new BranchClient(url);
  return apiClient.get<LocalTaxingScheme[]>(
    `/inflow-local/taxing-schemes?${params.toString()}`
  );
}

