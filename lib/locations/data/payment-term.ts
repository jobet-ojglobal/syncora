import { BranchClient } from "../location.client";
import { LocalPaymentTerm } from "../types";

export async function getPaymentTerm(
  batchId: string,
  url: string
) {
 const apiClient = new BranchClient(url)
  return await apiClient.get<LocalPaymentTerm>(
    `/inflow-local/payload/${batchId}`,
  );
}

export async function getPaymentTerms(url: string) {
 const apiClient = new BranchClient(url)
  return await apiClient.get<LocalPaymentTerm[]>(
    `/inflow-local/payment-terms`,
  );
}

export async function getLocalBatchPaymentTerms(
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
  return apiClient.get<LocalPaymentTerm[]>(
    `/inflow-local/payment-terms?${params.toString()}`
  );
}