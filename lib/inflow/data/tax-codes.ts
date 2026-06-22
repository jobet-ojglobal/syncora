import { inflow } from "@/lib/inflow/inflow.client";

export async function getTaxCodes() {
  return inflow.get("/tax-codes");
}

export async function getTaxCode(taxID: string) {
  return inflow.get(`/tax-codes/${taxID}`);
}