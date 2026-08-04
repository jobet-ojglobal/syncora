import { BranchClient } from "../location.client";
import { LocalProduct } from "../types";

export async function getLocalProducts(url: string) {
 const apiClient = new BranchClient(url)
  return await apiClient.get<LocalProduct[]>(
    `/inflow-local/products`,
  );
}