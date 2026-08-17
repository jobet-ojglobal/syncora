import { inflow } from "@/lib/inflow/inflow.client";
import { InflowProduct, InflowStockAdjustInput } from "../types";

export async function getInventoryLevels(
  count = 100,
  after?: string,
  retries: number =  5,
  delayMs: number = 1000
) {
  const params = new URLSearchParams({
    count: String(count),
    include: "inventoryLines.location"
  });

  if (after) {
    params.append("after", after);
  }

 return await inflow.get<InflowProduct[]>(
    `/products?${params.toString()}`,
    retries,
    delayMs
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

export async function upsertStockAdjust(payload: InflowStockAdjustInput) {
  return inflow.put<InflowStockAdjustInput>("/stock-adjustments", payload);
}

export async function upsertStockAdjustBulk(payload: InflowStockAdjustInput[]) {
  return inflow.put<InflowStockAdjustInput>("/stock-adjustments", payload);
}