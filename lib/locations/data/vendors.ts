import { BranchClient } from "../location.client";
import { LocationClient } from "../location-client.limit";
import { VendorPayload } from "../types";

export async function getLocalBatchVendors(
  url: string,
  count = 50,
  after?: string,
  includes: string[] = []
) {
  // 1. Specify base relation includes here if needed
  const baseIncludes: string[] = [];

  // 2. Filter empty strings to prevent trailing/leading commas in the query string
  const mergedIncludes = Array.from(new Set([...baseIncludes, ...includes]))
    .filter(Boolean)
    .join(",");

  const params = new URLSearchParams({
    count: String(count),
  });

  if (mergedIncludes) {
    params.append("include", mergedIncludes);
  }

  if (after) {
    params.append("after", after);
  }

  const apiClient = new LocationClient(url);
  return apiClient.get<VendorPayload[]>(
    `/inflow-local/vendors?${params.toString()}`
  );
}