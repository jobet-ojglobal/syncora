import { inflow } from "@/lib/inflow/inflow.client";
import { InflowCategory, InflowProduct } from "../types";

export async function getCategories() {
  const products = await inflow.get<
    InflowProduct[]
  >("/products?include=category");

  const categories = products
    .map(product => product.category)
    .filter(
      (
        category
      ): category is InflowCategory =>
        category !== null
    );

  return Array.from(
    new Map(
      categories.map(category => [
        category.categoryId,
        category,
      ])
    ).values()
  );
}

export async function getCategory(categoryId: string) {
  return inflow.get(`/products?include=category/${categoryId}`);
}

export async function createCategory(data: any) {
  return inflow.post("/products?include=category", data);
}

export async function updateCategory(
  categoryId: string,
  data: any
) {
  return inflow.put(`/products?include=category/${categoryId}`, data);
}