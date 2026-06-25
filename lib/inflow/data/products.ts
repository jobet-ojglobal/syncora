import { inflow } from "@/lib/inflow/inflow.client";
import { InflowProduct } from "../types";

export async function getProducts(
  count = 100,
  after?: string
) {
  const params = new URLSearchParams({
    count: String(count),
    include: "images,productBarcodes,taxCodes,reorderSettings,productOperations,prices,cost,itemBoms,attachments,productVariant.productGroup.category,productVariant.productGroup.options.optionValues,productVariant.productGroup.images.image",
  });

  if (after) {
    params.append("after", after);
  }

  return inflow.get<InflowProduct[]>(
    `/products?${params.toString()}`
  );
}

export async function getProduct(productId: string) {
  return inflow.get<InflowProduct>(
    `/products/${productId}?include=images,productVariant.productGroup.category,productVariant.productGroup.options.optionValues,productVariant.productGroup.images.image`
  );
}

export async function upsertProduct(payload: Partial<InflowProduct>) {
  console.log("OUTBOUND INFLOW PRODUCT PAYLOAD:", JSON.stringify(payload, null, 2));
  return inflow.put<InflowProduct>("/products", payload);
}

export async function updateProduct(
  productId: string,
  payload: Partial<InflowProduct>
) {
  return inflow.put<InflowProduct>(
    `/products/${productId}`,
    payload
  );
}

export async function deleteProduct(productId: string) {
  return inflow.delete(`/products/${productId}`);
}

// export async function fetchProductInventory() {
//   const data = await inflow.get<InflowProduct[]>(
//     "/products?include=cost,defaultPrice,inventoryLines"
//   );
//   return data;
// }

// export async function getProductByID(productId: string) {
//   const data = await inflow.get<InflowProduct>(
//     `/products/${productId}?include=images&include=productVariant.productGroup.category&include=productVariant.productGroup.options.optionValues&include=productVariant.productGroup.images.image`
//   );
//   return data;
// }
