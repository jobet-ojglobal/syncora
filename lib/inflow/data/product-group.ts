import { inflow } from "@/lib/inflow/inflow.client";
import {  InflowProductGroupResponse } from "../types";

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
  return inflow.put<InflowProductGroupResponse>("/product-groups", payload);
}

export async function fetchProductGroup() {
  const data = await inflow.get<InflowProductGroupResponse[]>(
    "/product-groups?include=defaultProduct,productVariants.product.images&include=category&include=images.image&include=options.optionValues"
  );
  return data;
}

export async function getProductGroup(groupId: string) {
  const data = await inflow.get<InflowProductGroupResponse>(
    `/product-groups/${groupId}?include=defaultProduct,productVariants.product.images&include=category&include=images.image&include=options.optionValues`
  );
  return data;
}
