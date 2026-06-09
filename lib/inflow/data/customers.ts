import { inflow } from "@/lib/inflow/inflow.client";

export async function getCustomers() {
  return inflow.get("/customers");
}

export async function getCustomer(customerId: string) {
  return inflow.get(
    `/customers/${customerId}`
  );
}

export async function createCustomer(data: any) {
  return inflow.post("/customers", data);
}

export async function updateCustomer(
  customerId: string,
  data: any
) {
  return inflow.put(
    `/customers/${customerId}`,
    data
  );
}