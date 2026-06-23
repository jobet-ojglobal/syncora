import { inflow } from "@/lib/inflow/inflow.client";
import { InflowCurrency } from "../types";

export async function getCurrencies() {
  const response =
    await inflow.get<InflowCurrency[]>(
      "/currencies?include=currencyConversions"
    );

  return response;
}

export async function getCurrency(currID: string) {
  return inflow.get<InflowCurrency>(`/currencies/${currID}`);
}