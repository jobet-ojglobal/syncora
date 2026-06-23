import { inflow } from "@/lib/inflow/inflow.client";
import { InflowPaymentTerms } from "../types";

export async function getPaymentTerms() {
  const response =
    await inflow.get<InflowPaymentTerms[]>(
      "/payment-terms"
    );

  return response;
}

export async function getPaymentTerm(termID: string) {
  return inflow.get<InflowPaymentTerms>(`/payment-terms/${termID}`);
}
