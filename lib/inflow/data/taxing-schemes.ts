import { inflow } from "@/lib/inflow/inflow.client";
import { InflowTaxingScheme } from "../types";

export async function getTaxingSchemes() {
  const response =
    await inflow.get<InflowTaxingScheme[]>(
      "/taxing-schemes?include=taxCodes"
    );

  return response;
}

export async function getTaxingScheme(taxSchemeId: string) {
  return await inflow.get<InflowTaxingScheme>(`/taxing-schemes/${taxSchemeId}?include=taxCodes`);
}

export async function upsertTaxingScheme(payload: any) {
  return await inflow.put<InflowTaxingScheme>(`/taxing-schemes`, payload);
}