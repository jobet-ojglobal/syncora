import { inflow } from "@/lib/inflow/inflow.client";
import { InflowTaxCode } from "../types";

export async function getTaxCodes() {
  const response =
    await inflow.get<InflowTaxCode[]>(
      "/tax-codes"
    );

  return response;
}

export async function getTaxCode(taxID: string) {
  return inflow.get<InflowTaxCode>(`/tax-codes/${taxID}`);
}