import { inflow } from "@/lib/inflow/inflow.client";
import { InflowCurrency } from "../types";

// export async function getCurrencies(
//   count = 100,
//   after?: string,
//   retries: number =  5,
//   delayMs: number = 1000
// ) {
//   const response =
//     await inflow.get<InflowCurrency[]>(
//       "/currencies?include=currencyConversions"
//     );

//   return response;
// }

export async function getCurrencies(
  count = 100,
  after?: string,
  retries: number =  5,
  delayMs: number = 1000
) {
  const params = new URLSearchParams({
    count: String(count),
    include: "currencyConversions"
  });

  if (after) {
    params.append("after", after);
  }

 return await inflow.get<InflowCurrency[]>(
    `/currencies?${params.toString()}`,
    retries,
    delayMs
  );
}


export async function getCurrency(currID: string) {
  return inflow.get<InflowCurrency>(`/currencies/${currID}`);
}