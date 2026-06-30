import { inflow } from "@/lib/inflow/inflow.client";
import { InflowPricingScheme } from "../types";

export async function getPricingSchemes(
  count = 100,
  after?: string
) {
  const params = new URLSearchParams({
    count: String(count),
    include: "productPrices.product,currency",
  });

  if (after) {
    params.append("after", after);
  }

 return await inflow.get<InflowPricingScheme[]>(
    `/pricing-schemes?${params.toString()}`
  );
}

export async function getPricingScheme(pricingID: string) {
  return await inflow.get<InflowPricingScheme>(`/pricing-schemes/${pricingID}`);
}