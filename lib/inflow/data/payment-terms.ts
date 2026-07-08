import { inflow } from "@/lib/inflow/inflow.client";
import { InflowPaymentTerm } from "../types";

export async function getPaymentTerms() {
  const response =
    await inflow.get<InflowPaymentTerm[]>(
      "/payment-terms"
    );

  return response;
}

export async function getPaymentTerm(termID: string) {
  return inflow.get<InflowPaymentTerm>(`/payment-terms/${termID}`);
}
