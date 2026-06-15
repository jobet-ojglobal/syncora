import { inflow } from "@/lib/local001/local.client";

export async function getLocalProducts(
  count = 100,
  after?: string
) {
  const params = new URLSearchParams({
    count: String(count),
    include: "",
  });

  if (after) {
    params.append("after", after);
  }

  return inflow.get(
    `/products?${params.toString()}`
  );
}