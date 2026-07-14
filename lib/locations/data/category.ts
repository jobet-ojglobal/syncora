import { BranchClient } from "../location.client";

export interface InflowCategory {
  categoryId: string;
  parentCategoryId: string | null;
  name: string;
  timestamp: string;
  syncedAt: string;
}

export async function getCategories(url: string) {
 const apiClient = new BranchClient(url)
  return await apiClient.get<InflowCategory[]>(
    `/inflow-local/categories`,
  );
}

export interface UpsertResult {
  success: boolean;
  message?: string;
  data?: any; 
}

export async function upsertCategory(
  payload: InflowCategory,
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