import { BranchClient } from "../location.client";



export interface InflowCurrency {
  currencyId: string;
  code: string;
  description: string;
  symbol: string;
  timestamp: string;
  isActive: number;
  decimalPlaces: number;
  decimalSeparator: string;
  thousandsSeparator: string;
  cRCurrencyPositionType: string;
  cRNegativeType: string;
  syncedAt: string;
}



export async function getCurrency(
  batchId: string,
  url: string
) {
 const apiClient = new BranchClient(url)
  return await apiClient.get<InflowCurrency>(
    `/inflow-local/payload/${batchId}`,
  );
}

export async function getCurrencies(url: string) {
 const apiClient = new BranchClient(url)
  return await apiClient.get<InflowCurrency[]>(
    `/inflow-local/currencies`,
  );
}
