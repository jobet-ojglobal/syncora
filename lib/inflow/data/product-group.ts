import { inflow } from "@/lib/inflow/inflow.client";
import {  InflowProductGroup } from "../types";

// // Extended types reflecting the structural changes
export interface InflowOptionValuePayload {
  lineNum: string;
  productGroupOptionValueId: string;
  value: string;
}

export interface InflowOptionPayload {
  lineNum: string;
  name: string;
  productGroupOptionId: string;
  optionValues: InflowOptionValuePayload[];
}

export interface InflowProductVariantPayload {
  defaultPrice: string;
  productGroupId: string;
  productId: string;
  productVariantId: string;
  // inFlow expects a flat string-to-string dictionary record mapping optionId to valueId
  variantOption: Record<string, string>; 
  product: Record<string, any>;
  productGroup: Record<string, any>;
}

export interface InflowGroupPayload {
  productGroupId: string;
  categoryId: string; // 👈 CRITICAL: Must be explicitly provided at the root level
  name: string;
  isActive: boolean;
  options: InflowOptionPayload[];
  productVariants: InflowProductVariantPayload[];
  defaultImageId?: string | null;
  defaultProductId?: string | null;
}

export async function upsertProductGroup(payload: Partial<InflowGroupPayload>) {
  return inflow.put<InflowProductGroup>("/product-groups", payload);
}

export async function getProductGroups(
  count = 100,
  after?: string,
  includes: string[] = []
) {
  // 1. Core nesting fields required by your system architecture
  const baseIncludes = [
    "options.optionValues",
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

  return inflow.get<InflowProductGroup[]>(
    `/product-groups?${params.toString()}`
  );
}

export async function getProductGroupsInclude(
  count = 100,
  after?: string,
  includes: string[] = []
) {
  // 1. Core structural include required to access variants inside the group
  const baseIncludes = ["category"];
  
  // 2. Append any dynamic sub-relations passed down from the client checklist
  const mergedIncludes = Array.from(new Set([...baseIncludes, ...includes])).join(",");

  const params = new URLSearchParams({
    count: String(count),
    include: mergedIncludes,
  });

  if (after) {
    params.append("after", after);
  }

  return inflow.get<InflowProductGroup[]>(
    `/product-groups?${params.toString()}`
  );
}

export async function getVariantProductGroup(groupId: string) {
  const data = await inflow.get<InflowProductGroup>(
    `/product-groups/${groupId}?include=defaultProduct,category,images.image,options.optionValues`
  );
  return data;
}

export async function getProductGroup(groupId: string) {
  const data = await inflow.get<InflowProductGroup>(
    `/product-groups/${groupId}?include=defaultProduct,category,images.image,options.optionValues,productVariants.product.images`
  );
  return data;
}


// "products": [
//     { id: "images", label: "Product Images", apiField: "images" },
//     { id: "productBarcodes", label: "Barcodes & Identifiers", apiField: "productBarcodes" },
//     { id: "taxCodes", label: "Tax Codes & Schemes", apiField: "taxCodes" },
//     { id: "reorderSettings", label: "Location Reorder Settings", apiField: "reorderSettings" },
//     { id: "productOperations", label: "Manufacturing Operations", apiField: "productOperations" },
//     { id: "prices", label: "Price Schemes & Matrix Lists", apiField: "prices" },
//     { id: "itemBoms", label: "Bill of Materials (BOM Components)", apiField: "itemBoms" },
//     { id: "attachments", label: "File Attachments", apiField: "attachments" },
//     { 
//       id: "resolveGroupRelations", 
//       label: "Link & Sync Parent Variant Groups", 
//       apiField: "productVariant.productGroup.category,productVariant.productGroup.options.optionValues" 
//     }
//   ],
//   "product_groups": [
//     { id: "groupImages", label: "Product Group Shared Gallery", apiField: "images.image" },
//     { id: "defaultProduct", label: "Default Product Fallback Reference", apiField: "defaultProduct" },
//     { id: "groupVariants", label: "Deep Variant Tree Resolution", apiField: "productVariants.product" },
//   ]