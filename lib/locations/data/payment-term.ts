import { BranchClient } from "../location.client";

export interface InflowPaymentTerm {
  paymentTermsId: string;
  name: string;
  daysDue: number;
  isActive: number;
  timestamp: string;
}

export async function getPaymentTerm(
  batchId: string,
  url: string
) {
 const apiClient = new BranchClient(url)
  return await apiClient.get<InflowPaymentTerm>(
    `/inflow-local/payload/${batchId}`,
  );
}

export async function getPaymentTerms(url: string) {
 const apiClient = new BranchClient(url)
  return await apiClient.get<InflowPaymentTerm[]>(
    `/inflow-local/payment-terms`,
  );
}
