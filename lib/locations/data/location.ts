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

