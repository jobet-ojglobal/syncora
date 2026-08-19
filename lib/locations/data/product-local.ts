import { BranchClient } from "../location.client";
import { LocalProduct, LocalProductInventory } from "../types";

export async function getLocalProducts(url: string) {
  const apiClient = new BranchClient(url)
  return await apiClient.get<LocalProduct[]>(
    `/inflow-local/products`,
  );
}

// export async function getLocalInventoryLines(
//   url: string,
//   count = 30,
//   after?: string,
//   retries: number =  5,
// ) {
//    const params = new URLSearchParams({
//     count: String(count),
//   }); 

//   if (after) {
//     params.append("after", after);
//   }

//   const apiClient = new BranchClient(url)
//   return await apiClient.get<LocalProductInventory[]>(
//     `/inflow-local/product-inventory?${params.toString()}`,
//   );
// }

export async function getLocalInventoryLines(
  url: string,
  count = 100,
  after?: string,
  retries: number = 3,
  timeoutMs: number = 10000 // Increase default timeout to 10 seconds
) {
  const params = new URLSearchParams({
    count: String(count),
  });

  if (after) {
    params.append("after", after);
  }

  const apiClient = new BranchClient(url);

  let attempt = 0;
  while (attempt <= retries) {
    try {
      return await apiClient.get<LocalProductInventory[]>(
        `/inflow-local/product-inventory?${params.toString()}`,
        { timeout: timeoutMs } // Pass custom timeout to BranchClient
      );
    } catch (error) {
      attempt++;
      if (attempt > retries) throw error;
      
      // Exponential backoff delay before retrying
      const backoffMs = Math.pow(2, attempt) * 500;
      console.warn(`[getLocalInventoryLines] Attempt ${attempt} failed. Retrying in ${backoffMs}ms...`);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }

  throw new Error("Failed to fetch local inventory lines after max retries.");
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