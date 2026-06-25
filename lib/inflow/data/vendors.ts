import { inflow } from "@/lib/inflow/inflow.client";
import { InflowVendor } from "../types";

export async function getVendors(
  count = 100,
  after?: string
) {
  const params = new URLSearchParams({
    count: String(count),
    include: "addresses,attachments,balances,credits,currency,dues,lastModifiedBy,taxingScheme,vendorItems",
  });

  if (after) {
    params.append("after", after);
  }

 return await inflow.get<InflowVendor[]>(
    `/vendors?${params.toString()}`
  );
}

export async function getVendor(vendorId: string) {
  return await inflow.get<InflowVendor>(
    `/vendors/${vendorId}`
  );
}

export async function upsertVendor(
  vendorId: string,
  data: any
) {
  return await inflow.put<InflowVendor>(
    `/vendors/${vendorId}`,
    data
  );
}


