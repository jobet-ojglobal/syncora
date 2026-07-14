import { BranchClient } from "../location.client";

export interface InflowLocation {
  locationId: string;
  name: string;
  timestamp: string;
  isActive: number;
  lastModifiedById: string;
  lastModifiedDttm: string;
}

export async function getLocations(url: string) {
 const apiClient = new BranchClient(url)
  return await apiClient.get<InflowLocation[]>(
    `/inflow-local/locations`,
  );
}

export interface UpsertResult {
  success: boolean;
  message?: string;
  data?: any; 
}

export async function upsertLocation(
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

