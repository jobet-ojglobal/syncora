import { inflow } from "@/lib/inflow/inflow.client";
import { InflowCustomer } from "../types";

export async function getCustomers(
  count = 100,
  after?: string
) {
  const params = new URLSearchParams({
    count: String(count),
    include: "addresses,attachments,balances,credits,defaultBillingAddress,defaultLocation,defaultPaymentTerms,defaultSalesRepTeamMember,defaultShippingAddress,dues,lastModifiedBy,pricingScheme,taxingScheme,orderHistory",
  });

  if (after) {
    params.append("after", after);
  }

 return await inflow.get<InflowCustomer[]>(
    `/customers?${params.toString()}`
  );
}

export async function getCustomer(customerId: string) {
  return await inflow.get<InflowCustomer>(
    `/customers/${customerId}`
  );
}

export async function upsertCustomer(
  customerId: string,
  data: any
) {
  return await inflow.put<InflowCustomer>(
    `/customers/${customerId}`,
    data
  );
}


