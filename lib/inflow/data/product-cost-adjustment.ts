import { inflow } from "@/lib/inflow/inflow.client";
import { InflowProductCostAdjustment } from "../types";

export async function getProductCostAdjustments(
  count = 100,
  after?: string
) {
  const params = new URLSearchParams({
    count: String(count),
    include: "lastModifiedBy,product",
  });

  if (after) {
    params.append("after", after);
  }

 return await inflow.get<InflowProductCostAdjustment[]>(
    `/product-cost-adjustments?${params.toString()}`
  );
}

export async function getProductCostAdjustment(costAdjustmentID: string) {
  return inflow.get<InflowProductCostAdjustment>(`/product-cost-adjustments/${costAdjustmentID}`);
}
