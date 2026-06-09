import { inflow } from "@/lib/inflow/inflow.client";

export async function getCategories() {
  return inflow.get("/product-categories");
}

export async function getCategory(categoryId: string) {
  return inflow.get(`/product-categories/${categoryId}`);
}

export async function createCategory(data: any) {
  return inflow.post("/product-categories", data);
}

export async function updateCategory(
  categoryId: string,
  data: any
) {
  return inflow.put(`/product-categories/${categoryId}`, data);
}