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