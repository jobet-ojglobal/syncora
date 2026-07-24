import { inflow } from "@/lib/inflow/inflow.client";
import { InflowProduct } from "../types";

export async function getInventoryLevels(
  count = 100,
  after?: string
) {
  const params = new URLSearchParams({
    count: String(count),
    include: "inventoryLines.location",
  });

  if (after) {
    params.append("after", after);
  }

 return await inflow.get<InflowProduct[]>(
    `/products?${params.toString()}`
  );
}

export async function getInventoryByProduct(
  productId: string
) {
  const data = await inflow.get<InflowProduct>(
    `/products/${productId}?include=inventoryLines.location`
  );
  return data;
}