import { inflow } from "@/lib/inflow/inflow.client";
import { InflowVendor } from "../types";

export async function getVendors(
  count = 100,
  after?: string
) {
  const params = new URLSearchParams({
    count: String(count),
    include: "addresses,attachments,balances,credits,currency,dues,lastModifiedBy,taxingScheme,vendorItems.product,defaultPaymentTerms,defaultAddress",
  });

  if (after) {
    params.append("after", after);
  }

 return await inflow.get<InflowVendor[]>(
    `/vendors?${params.toString()}`
  );
}

export async function getVendorIncludes(
  count = 100,
  after?: string,
  includes: string[] = []
) {
  // 1. Core nesting fields required by your system architecture
  const baseIncludes = [
    "addresses,attachments,balances,credits,currency,dues,defaultAddress",
  ];

  // 2. Merge unique structural values & join them as a comma-separated string
  const mergedIncludes = Array.from(new Set([...baseIncludes, ...includes])).join(",");

  const params = new URLSearchParams({
    count: String(count),
    include: mergedIncludes,
  });

  if (after) {
    params.append("after", after);
  }

  return await inflow.get<InflowVendor[]>(
    `/vendors?${params.toString()}`
  );
}

export async function getVendorItems(
  count = 100,
  after?: string
) {
  const params = new URLSearchParams({
    count: String(count),
    include: "vendorItems",
  });

  if (after) {
    params.append("after", after);
  }
  const vendor = await inflow.get<InflowVendor[]>(
    `/vendors?${params.toString()}`
  );

  const vendorItems  = vendor.map((v) => ({
    vendorItems: v.vendorItems
  }));

 return vendorItems;
}

export async function getVendor(vendorId: string) {
  return await inflow.get<InflowVendor>(
    `/vendors/${vendorId}?include=addresses,attachments,balances,credits,currency,dues,lastModifiedBy,taxingScheme,vendorItems.product,defaultPaymentTerms,defaultAddress`
  );
}

export async function getEnsureVendor(vendorId: string) {
  return await inflow.get<InflowVendor>(
    `/vendors/${vendorId}?include=addresses,attachments,balances,credits,currency,dues,lastModifiedBy,taxingScheme,defaultPaymentTerms,defaultAddress`
  );
}

export async function upsertVendor(
  data: any
) {
  return await inflow.put<InflowVendor>(
    `/vendors?include=addresses,attachments,balances,credits,currency,dues,lastModifiedBy,taxingScheme,vendorItems.product,defaultPaymentTerms,defaultAddress`,
    data
  );
}

export async function upsertBulkVendors(
  data: InflowVendor[]
) {
  return await inflow.put<InflowVendor>(
    `/vendors?include=addresses,attachments,balances,credits,currency,dues,lastModifiedBy,taxingScheme,vendorItems.product,defaultPaymentTerms,defaultAddress`,
    data
  );
}



