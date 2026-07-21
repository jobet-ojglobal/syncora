import { inflow } from "@/lib/inflow/inflow.client";
import { InflowProduct } from "../types";

export async function getEntireCatalogs(
  count = 100,
  after?: string,
  includes: string[] = []
) {
  const params = new URLSearchParams({
    count: String(count),
    include: "images,productBarcodes,taxCodes,reorderSettings,productOperations,prices,cost,itemBoms,attachments,productVariant.productGroup.category,productVariant.productGroup.options.optionValues,productVariant.productGroup.images.image,lastVendor",
  });

  if (after) {
    params.append("after", after);
  }

  return inflow.get<InflowProduct[]>(
    `/products?${params.toString()}`
  );
}

export async function getProducts(
  count = 100,
  after?: string,
  includes: string[] = []
) {
  // 1. Core nesting fields required by your system architecture
  const baseIncludes = [
    "cost",
  ];

  // 2. Merge unique structural values & join them as a comma-separated string
  const mergedIncludes = Array.from(new Set([...baseIncludes, ...includes])).join(",");

  const params = new URLSearchParams({
    count: String(count),
    include: mergedIncludes,
  });

  if (after) {
    params.append("after", after);
  }

  return inflow.get<InflowProduct[]>(
    `/products?${params.toString()}`
  );
}

export async function getProductsInclude(
  count = 100,
  after?: string,
  includes: string[] = []
) {
  const baseIncludes = [
    "cost"
  ];

  // 2. Merge unique structural values & join them as a comma-separated string
  const mergedIncludes = Array.from(new Set([...baseIncludes, ...includes])).join(",");

  const params = new URLSearchParams({
    count: String(count),
    include: mergedIncludes,
  });

  if (after) {
    params.append("after", after);
  }

  return inflow.get<InflowProduct[]>(
    `/products?${params.toString()}`
  );
}

export async function getProductVariantGroup(productId: string) {
  return inflow.get<InflowProduct>(
    `/products/${productId}?include=images,productBarcodes,taxCodes,reorderSettings,productOperations,prices,cost,itemBoms,attachments,productVariant.productGroup.category,productVariant.productGroup.options.optionValues,productVariant.productGroup.images.image,lastVendor`
  );
}

export async function getProduct(productId: string) {
  return inflow.get<InflowProduct>(
    `/products/${productId}?include=images,productBarcodes,taxCodes,reorderSettings,productOperations,prices,cost,itemBoms,attachments,productVariant.productGroup.category,productVariant.productGroup.options.optionValues,productVariant.productGroup.images.image,lastVendor`
  );
}

export async function upsertProduct(payload: Partial<InflowProduct>) {
  console.log("OUTBOUND INFLOW PRODUCT PAYLOAD:", JSON.stringify(payload, null, 2));
  return inflow.put<InflowProduct>("/products", payload);
}

export async function deleteProduct(productId: string) {
  return inflow.delete(`/products/${productId}`);
}


  // "images,productBarcodes,taxCodes,reorderSettings,productOperations,prices,cost,itemBoms,attachments,productVariant.productGroup.category,productVariant.productGroup.options.optionValues,productVariant.productGroup.images.image"


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
