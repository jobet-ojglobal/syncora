import { inflow } from "@/lib/inflow/inflow.client";

export async function getVendors() {
  return inflow.get("/vendors");
}

export async function getVendor(vendorId: string) {
  return inflow.get(`/vendors/${vendorId}`);
}

export async function createVendor(data: any) {
  return inflow.post("/vendors", data);
}