import { inflow } from "@/lib/inflow/inflow.client";
import { inflow as inflowLimit } from "@/lib/inflow/inflow.client.limit";
import { InflowProduct } from "../types";

export async function getEntireCatalogs(
  count = 30,
  after?: string,
  filterName?: string,
  includes: string[] = [],
) {
  const params = new URLSearchParams({
    count: String(count),
    include: "images,productBarcodes,taxCodes.taxCode,taxCodes.taxingScheme,reorderSettings.vendor,reorderSettings.location,reorderSettings.fromLocation,productOperations,prices,cost,itemBoms,attachments,productVariant.productGroup.category,productVariant.productGroup.options.optionValues,productVariant.productGroup.images.image,lastVendor,inventoryLines.location",
  });

  if (after) {
    params.append("after", after);
  }

  if(filterName) {
    params.append("filter[name]", filterName);
  }

  return inflow.get<InflowProduct[]>(
    `/products?${params.toString()}`
  );
}

export async function getProducts(
  count = 30,
  after?: string,
  includes: string[] = [],
  retries: number =  5,
  delayMs: number = 1000
) {
  // 1. Filter out empty strings to prevent leading/trailing/double commas in URL params
  const validIncludes = includes.filter((inc) => Boolean(inc) && inc.trim() !== "");
  const mergedIncludes = Array.from(new Set(validIncludes)).join(",");

  const params = new URLSearchParams({
    count: String(count),
  });

  if (mergedIncludes) {
    params.append("include", mergedIncludes);
  }

  if (after) {
    params.append("after", after);
  }

  return inflow.get<InflowProduct[]>(
    `/products?${params.toString()}`,
  );
}

export async function getSingleProduct(
  productId: string,
  includes: string[] = [],
  retries: number =  5,
  delayMs: number = 1000
) {
  const validIncludes = includes.filter((inc) => Boolean(inc) && inc.trim() !== "");
  const mergedIncludes = Array.from(new Set(validIncludes)).join(",");

  const params = new URLSearchParams({});

  if (mergedIncludes) {
    params.append("include", mergedIncludes);
  }
  
  return inflow.get<InflowProduct>(
    `/products/${productId}?${params.toString()}`,
  );
}

  // filter: "filter[isActive]=true"   &${filter}


export async function getProductsInclude(
  count = 30,
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

export async function checkCloudProduct(productId: string) {
  return inflow.get<InflowProduct>(
    `/products/${productId}`
  );
}

// lib\inflow\data\products.ts
export async function upsertProduct(payload: Partial<InflowProduct>) {
  return inflowLimit.put<InflowProduct>("/products", payload);
}

export async function upsertProductBulk(payload: Partial<InflowProduct>[]) {
  return inflowLimit.put<InflowProduct[]>("/products", payload);
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
