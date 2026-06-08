import { inflow } from "@/lib/inflow/inflow.client";
import { InflowProduct } from "../types";

export async function fetchProductInventory() {
  const data = await inflow.get<InflowProduct[]>(
    "/products?include=cost,defaultPrice,inventoryLines"
  );
  return data;
}

