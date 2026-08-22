import { BranchClient } from "../location.client";
import { LocalPricingScheme } from "../types";


export async function getPricingScheme(
  batchId: string,
  url: string
) {
 const apiClient = new BranchClient(url)
  return await apiClient.get<LocalPricingScheme>(
    `/inflow-local/payload/${batchId}`,
  );
}

export async function getPricingSchemes(url: string) {
 const apiClient = new BranchClient(url)
  return await apiClient.get<LocalPricingScheme[]>(
    `/inflow-local/pricing-schemes`,
  );
}

export interface UpsertResult {
  success: boolean;
  message?: string;
  data?: any; 
}

export async function upsertPricingScheme(
  payload: LocalPricingScheme,
  url: string
) {
  const apiClient = new BranchClient(url)
  return await apiClient.post<UpsertResult>(
    `/inbound/receive`, {
        "eventType": "pricingSchemeLocal",
        "transactionType": "PRICING_SCHEME",
        "batch_id": `PRCNGSCHM-${crypto.randomUUID().toLowerCase()}`,
        "sourceSystem": "MID",
        "sourceKey": payload.pricingSchemeId,
        "payload": payload 
      }
  );
}

export async function getLocalBatchPricingSchemes(
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
  return apiClient.get<LocalPricingScheme[]>(
    `/inflow-local/pricing-schemes?${params.toString()}`
  );
}