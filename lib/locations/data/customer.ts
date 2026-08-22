import { BranchClient } from "../location.client";
import { InflowCustomer as CloudCustomerType } from "@/lib/inflow/types";
import { LocalCustomer } from "../types";

export async function getCustomer(
  batchId: string,
  url: string
) {
 const apiClient = new BranchClient(url)
  return await apiClient.get<CloudCustomerType>(
    `/inflow-local/payload/${batchId}`,
  );
}

export interface UpsertResult {
  success: boolean;
  message?: string;
  data?: any; 
}

export async function upsertCustomer(
  payload: LocalCustomer,
  url: string
) {
  const apiClient = new BranchClient(url)
  const { success, ...data } = await apiClient.post<UpsertResult>(
    `/inbound/receive`, {
        "eventType": "customerLocal",
        "transactionType": "CUSTOMER",
        "batch_id": `CSTMR-${crypto.randomUUID().toLowerCase()}`,
        "sourceSystem": "MID",
        "sourceKey": payload.customerId,
        "payload": payload
      }
  );
  return { success, data };
}

export async function getCustomers(url: string) {
 const apiClient = new BranchClient(url)
  return await apiClient.get<LocalCustomer[]>(
    `/inflow-local/customers`,
  );
}

export async function getLocalBatchCustomers(
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
  return apiClient.get<LocalCustomer[]>(
    `/inflow-local/customers?${params.toString()}`
  );
}
