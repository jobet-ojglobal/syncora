import { BranchClient } from "../location.client";

export interface InflowPricingScheme {
  pricingSchemeId: string;
  name: string;
  lastModUserId: number;
  lastModDttm: string;
  isActive: number;
  isTaxInclusive: number;
  currencyId: string;
  timestamp: string;
  syncedAt: string;
}

export async function getPricingScheme(
  batchId: string,
  url: string
) {
 const apiClient = new BranchClient(url)
  return await apiClient.get<InflowPricingScheme>(
    `/inflow-local/payload/${batchId}`,
  );
}

export async function getPricingSchemes(url: string) {
 const apiClient = new BranchClient(url)
  return await apiClient.get<InflowPricingScheme[]>(
    `/inflow-local/pricing-schemes`,
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