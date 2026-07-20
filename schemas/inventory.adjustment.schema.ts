import { z } from "zod";

export const AdjustmentReasonEnum = z.enum([
  "DISCREPANCY_FOUND",
  "DAMAGED_EXPIRED",
  "CYCLE_COUNT_RECOUNT",
  "THEFT_LOSS",
  "INVENTORY_FOUND",
  "OTHER",
]);

export const adjustmentLineSchema = z.object({
  id: z.string().optional(),
  productId: z.string().min(1, "Product selection is required"),
  productName: z.string().optional(),
  sublocationId: z.string().optional(),
  sublocationName: z.string().optional(),
  currentQuantity: z.number().min(0, "Current quantity must be non-negative"),
  adjustedQuantity: z.number().min(0, "Adjusted count must be non-negative"),
  delta: z.number(), // Automatically computed (adjustedQuantity - currentQuantity)
  reasonNote: z.string().optional(),
});

export const inventoryAdjustmentSchema = z.object({
  id: z.string().optional(),
  locationId: z.string().min(1, "Warehouse location is required"),
  reason: AdjustmentReasonEnum,
  remarks: z.string().max(500, "Remarks must be 500 characters or less").optional(),
  lines: z
    .array(adjustmentLineSchema)
    .min(1, "At least one adjustment line item is required"),
});

export type InventoryAdjustmentInput = z.infer<typeof inventoryAdjustmentSchema>;
export type AdjustmentLineInput = z.infer<typeof adjustmentLineSchema>;