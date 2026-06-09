import { inflow } from "@/lib/inflow/inflow.client";
import { InflowProductGroupResponse } from "../types";

export async function fetchProductGroup() {
  const data = await inflow.get<InflowProductGroupResponse[]>(
    "/product-groups?include=productVariants.product.images&include=category&include=images.image&include=options.optionValues"
  );
  return data;
}
