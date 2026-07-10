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