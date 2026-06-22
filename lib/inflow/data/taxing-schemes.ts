import { inflow } from "@/lib/inflow/inflow.client";

export async function getTaxingSchemes() {
  return inflow.get("/taxing-schemes");
}

export async function getTaxingScheme(taxSchemeId: string) {
  return inflow.get(`/taxing-schemes/${taxSchemeId}`);
}

export async function upsertTaxingScheme(payload: any) {
  return inflow.put(`/taxing-schemes`, payload);
}