import { inflow } from "@/lib/inflow/inflow.client";
import { InflowAdjustmentReason } from "../types";

export async function getAdjustmentReasons() {
  const response =
    await inflow.get<InflowAdjustmentReason[]>(
      "/adjustment-reasons"
    );

  return response;
}

export async function getAdjustmentReason(adjustmenID: string) {
  return inflow.get<InflowAdjustmentReason>(`/adjustment-reasons/${adjustmenID}`);
}
