import { inflow } from "@/lib/inflow/inflow.client";
import { InflowProduct, InflowStockAdjustInput } from "../types";
import { inflow as inflowLimit } from "@/lib/inflow/inflow.client.limit";

export async function getInventoryLevels(
  count = 100,
  after?: string,
) {
  const params = new URLSearchParams({
    count: String(count),
    include: "inventoryLines.location",
  });

  if (after) {
    params.append("after", after);
  }

 return await inflowLimit.get<InflowProduct[]>(
    `/products?${params.toString()}`
  );
}

export async function getInventoryByProduct(
  productId: string
) {
  const data = await inflowLimit.get<InflowProduct>(
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