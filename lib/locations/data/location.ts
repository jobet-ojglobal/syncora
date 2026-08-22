import { InflowLocation } from "@/lib/inflow/types";
import { BranchClient } from "../location.client";
import { LocalLocation } from "../types";

export async function getLocalLocations(url: string) {
 const apiClient = new BranchClient(url)
  return await apiClient.get<LocalLocation[]>(
    `/inflow-local/locations`,
  );
}

export interface UpsertResult {
  success: boolean;
  message?: string;
  data?: any; 
}

export async function upsertLocalLocation(
  payload: InflowLocation,
  url: string
) {
  const apiClient = new BranchClient(url)
  return await apiClient.post<UpsertResult>(
    `/inbound/receive`, {
        "eventType": "locationLocal",
        "transactionType": "LOCATION",
        "batch_id": `LCN-${crypto.randomUUID().toLowerCase()}`,
        "sourceSystem": "MID",
        "sourceKey": payload.locationId,
        "payload": payload 
      }
  );
}

export async function getLocalBatchLocations(
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

  const apiClient = new BranchClient(url);
  return apiClient.get<LocalLocation[]>(
    `/inflow-local/locations?${params.toString()}`
  );
}
