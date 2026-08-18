import { inflow } from "@/lib/inflow/inflow.client";
import { InflowProduct, InflowStockAdjustInput } from "../types";
import { inflow as inflowLimit } from "@/lib/inflow/inflow.client.limit";

export async function getInventoryLevels(
  count = 100,
  after?: string,
  retries: number =  5,
  delayMs: number = 1000
) {
  const params = new URLSearchParams({
    count: String(count),
    include: "inventoryLines.location",
    "filter[isActive]": "true"
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
  return inflowLimit.put<InflowStockAdjustInput>("/stock-adjustments", payload);
}

export async function upsertStockAdjustBulk(payload: InflowStockAdjustInput[]) {
  return inflowLimit.put<InflowStockAdjustInput>("/stock-adjustments", payload,
    {
      headers: {
        "X-OverrideAllowNegativeInventory": "TRUE",
      },
    }
  );
}