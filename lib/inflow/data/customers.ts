import { inflow } from "@/lib/inflow/inflow.client";
import { InflowCustomer } from "../types";

export async function getCustomers(
  count = 100,
  after?: string
) {
  const params = new URLSearchParams({
    count: String(count),
    include: "addresses,attachments,balances,credits,defaultBillingAddress,defaultLocation,defaultPaymentTerms,defaultSalesRepTeamMember,defaultShippingAddress,dues,lastModifiedBy,pricingScheme,taxingScheme.taxCodes,orderHistory",
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
    `/customers/${customerId}?include=addresses,attachments,balances,credits,defaultBillingAddress,defaultLocation,defaultPaymentTerms,defaultSalesRepTeamMember,defaultShippingAddress,dues,lastModifiedBy,pricingScheme,taxingScheme.taxCodes,orderHistory`
  );
}

export async function upsertCustomer(
  data: InflowCustomer
) {
  return await inflow.put<InflowCustomer>(
    `/customers?include=addresses,attachments,balances,credits,defaultBillingAddress,defaultLocation,defaultPaymentTerms,defaultSalesRepTeamMember,defaultShippingAddress,dues,lastModifiedBy,pricingScheme,taxingScheme.taxCodes,orderHistory`,
    data
  );
}


