import { BranchClient } from "../location.client";
import { LocalCurrency } from "../types";

export async function getCurrency(
  batchId: string,
  url: string
) {
 const apiClient = new BranchClient(url)
  return await apiClient.get<LocalCurrency>(
    `/inflow-local/payload/${batchId}`,
  );
}

export async function getCurrencies(url: string) {
 const apiClient = new BranchClient(url)
  return await apiClient.get<LocalCurrency[]>(
    `/inflow-local/currencies`,
  );
}

export async function getLocalBatchCurrencies(
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
  return apiClient.get<LocalCurrency[]>(
    `/inflow-local/currencies?${params.toString()}`
  );
}
