import { inflow } from "@/lib/inflow/inflow.client";

export async function getStockTransfers() {
  return inflow.get("/stock-transfers");
}

export async function getStockTransfer(
  transferId: string
) {
  return inflow.get(
    `/stock-transfers/${transferId}`
  );
}

export async function upsertStockTransfer(
  data: any
) {
  return await inflow.put(
    "/stock-transfers",
    data
  );
}