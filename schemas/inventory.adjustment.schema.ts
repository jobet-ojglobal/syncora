import { z } from "zod";

// export const AdjustmentReasonEnum = z.enum([
//   "DISCREPANCY_FOUND",
//   "DAMAGED_EXPIRED",
//   "CYCLE_COUNT_RECOUNT",
//   "THEFT_LOSS",
//   "INVENTORY_FOUND",
//   "OTHER",
// ]);

// export const adjustmentLineSchema = z.object({
//   id: z.string().optional(),
//   productId: z.string().min(1, "Product selection is required"),
//   productName: z.string().optional(),
//   sublocationId: z.string().optional(),
//   sublocationName: z.string().optional(),
//   currentQuantity: z.number().min(0, "Current quantity must be non-negative"),
//   adjustedQuantity: z.number().min(0, "Adjusted count must be non-negative"),
//   delta: z.number(), // Automatically computed (adjustedQuantity - currentQuantity)
//   reasonNote: z.string().optional(),
// });

// export const inventoryAdjustmentSchema = z.object({
//   id: z.string().optional(),
//   locationId: z.string().min(1, "Warehouse location is required"),
//   reason: AdjustmentReasonEnum,
//   remarks: z.string().max(500, "Remarks must be 500 characters or less").optional(),
//   lines: z
//     .array(adjustmentLineSchema)
//     .min(1, "At least one adjustment line item is required"),
// });

// export type InventoryAdjustmentInput = z.infer<typeof inventoryAdjustmentSchema>;
// export type AdjustmentLineInput = z.infer<typeof adjustmentLineSchema>;

export const inventoryAdjustmentReasonEnum = z.enum([
  "STOCK_COUNT",
  "DAMAGE",
  "LOSS",
  "THEFT",
  "EXPIRED",
  "RETURN",
  "CORRECTION",
  "MANUAL",
]);

export const inventoryAdjustmentSerialSchema = z.object({
  inventoryItemId: z.string().optional().nullable(),
  serialNumber: z.string().min(1, "Serial number cannot be empty"),
});

export const inventoryAdjustmentLineSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  locationId: z.string().min(1, "Location is required"),
  sublocationId: z.string().optional().nullable(),
  // The delta change quantity (+ or -)
  quantityAdjusted: z
    .number()
    .refine((val) => val !== 0, "Adjustment quantity cannot be 0"),
  reason: z.string().optional().nullable(),
  serials: z.array(inventoryAdjustmentSerialSchema).optional().default([]),
});

export const createAdjustmentSchema = z.object({
  performedById: z.string().min(1, "Performed by user is required"),
  reason: inventoryAdjustmentReasonEnum,
  notes: z.string().optional().nullable(),
  status: z.enum(["DRAFT", "POSTED"]).default("POSTED"),
  lines: z
    .array(inventoryAdjustmentLineSchema)
    .min(1, "At least one adjustment line is required"),
});

export type CreateAdjustmentInput = z.infer<typeof createAdjustmentSchema>;