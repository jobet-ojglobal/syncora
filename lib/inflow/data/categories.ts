import { inflow } from "@/lib/inflow/inflow.client";
import { InflowCategory } from "../types";

export async function getCategories(
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

  return inflow.get<InflowCategory[]>(
    `/categories?${params.toString()}`
  );
}

export async function getCategory(categoryID: string) {
  return await inflow.get<InflowCategory>(`/categories/${categoryID}`);
}


// import { InflowCategory, InflowProduct } from "../types";

// export async function getCategories() {
//   const products = await inflow.get<
//     InflowProduct[]
//   >("/products?include=category");

//   const categories = products
//     .map(product => product.category)
//     .filter(
//       (
//         category
//       ): category is InflowCategory =>
//         category !== null
//     );

//   return Array.from(
//     new Map(
//       categories.map(category => [
//         category.categoryId,
//         category,
//       ])
//     ).values()
//   );
// }

// export async function getCategory(categoryId: string) {
//   return inflow.get(`/products?include=category/${categoryId}`);
// }

// export async function createCategory(data: any) {
//   return inflow.post("/products?include=category", data);
// }

// export async function updateCategory(
//   categoryId: string,
//   data: any
// ) {
//   return inflow.put(`/products?include=category/${categoryId}`, data);
// }