import { BranchClient } from "../location.client";
import { LocalProduct, LocalProductInventory } from "../types";

export async function getLocalProducts(url: string) {
  const apiClient = new BranchClient(url)
  return await apiClient.get<LocalProduct[]>(
    `/inflow-local/products`,
  );
}

export async function getLocalInventoryLines(
  url: string,
  count = 30,
  after?: string,
  retries: number =  5,
) {
   const params = new URLSearchParams({
    count: String(count),
    // prodId: String(25326)
  });

  if (after) {
    params.append("after", after);
  }

  const apiClient = new BranchClient(url)
  return await apiClient.get<LocalProductInventory[]>(
    `/inflow-local/product-inventory?${params.toString()}`,
  );
}

export async function getLocalBatchProducts(
  url: string,
  count = 30,
  after?: string,
  includes: string[] = [],
  retries: number =  5,
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
    params.append("includes", mergedIncludes);
  }

  if (after) {
    params.append("after", after);
  }

  const apiClient = new BranchClient(url);
  return apiClient.get<LocalProduct[]>(
    `/inflow-local/products?${params.toString()}`
  );
}