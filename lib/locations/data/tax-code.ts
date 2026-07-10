import { BranchClient } from "../location.client";

export interface InflowTaxCode {
  taxCodeId: string;
  taxingSchemeId: string;
  name: string;
  isActive: number;
  tax1Rate: string;
  tax2Rate: string;
  lastModUserId: number;
  lastModDttm: string;
  timestamp: string;
  syncedAt: string;
}

export async function getTaxCode(
  batchId: string,
  url: string
) {
 const apiClient = new BranchClient(url)
  return await apiClient.get<InflowTaxCode>(
    `/inflow-local/payload/${batchId}`,
  );
}

export async function getTaxCodes(url: string) {
 const apiClient = new BranchClient(url)
  return await apiClient.get<InflowTaxCode[]>(
    `/inflow-local/tax-codes`,
  );
}