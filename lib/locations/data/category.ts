import { BranchClient } from "../location.client";

export interface LocalCategory {
  categoryId: string;
  parentCategoryId: string | null;
  name: string;
  timestamp: string;
  syncedAt: string;
}

export async function getCategories(url: string) {
 const apiClient = new BranchClient(url)
  return await apiClient.get<LocalCategory[]>(
    `/inflow-local/categories`,
  );
}

export async function getLocalBatchCategories(
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
  return apiClient.get<LocalCategory[]>(
    `/inflow-local/categories?${params.toString()}`
  );
}

export interface UpsertResult {
  success: boolean;
  message?: string;
  data?: any; 
}

export async function upsertCategory(
  payload: LocalCategory,
  url: string
) {
  const apiClient = new BranchClient(url)
  return await apiClient.post<UpsertResult>(
    `/inbound/receive`, {
        "eventType": "categoryLocal",
        "transactionType": "CATEGORY",
        "batch_id": `CTGRY-${crypto.randomUUID().toLowerCase()}`,
        "sourceSystem": "MID",
        "sourceKey": payload.categoryId,
        "payload": payload 
      }
  );
}