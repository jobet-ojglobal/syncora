import { BranchClient } from "../location.client";

export interface InflowTaxCode {
  taxCodeId: string;
  taxingSchemeId: string;
  name: string;
  isActive: boolean;
  tax1Rate: string;
  tax2Rate: string;
  syncedAt: string;
}

export interface InflowTaxingScheme {
    taxingSchemeId: string;
    name: string;
    tax1Name: string;
    tax2Name: string;
    calculateTax2OnTax1: number;
    lastModUserId: number;
    lastModDttm: string;
    timestamp: string;
    isActive: number;
    tax1OnShipping: number;
    defaultTaxCodeId: number;
    tax2OnShipping: number;
    syncedAt: string;
    taxCodes?: InflowTaxCode[]
  }

  
  
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
  return await apiClient.get<InflowTaxingScheme[]>(
    `/inflow-local/taxing-schemes`,
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

