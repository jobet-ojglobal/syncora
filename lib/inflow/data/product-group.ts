import { inflow } from "@/lib/inflow/inflow.client";
import { InflowProduct, InflowProductGroupResponse } from "../types";
import { InflowGroupPayload } from "../services/product-group.upsert";

export async function fetchProductGroup() {
  const data = await inflow.get<InflowProductGroupResponse[]>(
    "/product-groups?include=productVariants.product.images&include=category&include=images.image&include=options.optionValues"
  );
  return data;
}

export async function getProductGroup(groupId: string) {
  const data = await inflow.get<InflowProductGroupResponse>(
    `/product-groups/${groupId}?include=productVariants.product.images&include=category&include=images.image&include=options.optionValues`
  );
  return data;
}

export async function upsertProductGroup(payload: Partial<InflowProduct>) {
  return await inflow.put<InflowProductGroupResponse>("/product-groups", payload);
}