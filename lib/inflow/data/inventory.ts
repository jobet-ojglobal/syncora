import { inflow } from "@/lib/inflow/inflow.client";
import { InflowProduct } from "../types";

export async function getInventory() {
  const products = await inflow.get<InflowProduct[]>(
    "/products?include=inventoryLines.location"
  );
  return products;
}

export async function getInventoryByProduct(
  productId: string
) {
  const data = await inflow.get<InflowProduct>(
    `/products/${productId}?include=inventoryLines.location`
  );
  return data;
}