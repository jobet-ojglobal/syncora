import * as z from "zod";

// --- Inventory & Bin Schema ---
export const inventoryBinSchema = z.object({
  id: z.string().optional(),
  sublocationId: z.string().min(1, "Sublocation is required"),
  quantity: z.coerce.number().min(0, "Quantity cannot be negative"),
});

export const inventorySchema = z.object({
  id: z.string().optional(),
  productId: z.string().min(1, "Product is required"),
  locationId: z.string().min(1, "Location is required"),
  quantityOnHand: z.coerce.number().min(0, "On-hand stock must be at least 0"),
  quantityAvailable: z.coerce.number().min(0).optional(),
  quantityReserved: z.coerce.number().min(0).optional(),
  reorderThreshold: z.coerce.number().min(0, "Threshold must be 0 or higher"),
  reorderQuantity: z.coerce.number().min(0, "Reorder quantity must be 0 or higher"),
  isAutoReorderEnabled: z.boolean().default(false),
  preferredSourceLocationId: z.string().nullable().optional(),
  bins: z.array(inventoryBinSchema).default([]),
});

export type InventoryInput = z.infer<typeof inventorySchema>;

// --- Inventory Adjustment Schema ---
export const adjustmentReasonEnum = z.enum([
  "STOCK_COUNT",
  "DAMAGE",
  "LOSS",
  "THEFT",
  "EXPIRED",
  "RETURN",
  "CORRECTION",
  "MANUAL",
]);

export const adjustmentStatusEnum = z.enum(["DRAFT", "POSTED", "VOIDED"]);

export const inventoryAdjustmentLineSchema = z.object({
  id: z.string().optional(),
  productId: z.string().min(1, "Product reference is required"),
  locationId: z.string().min(1, "Location reference is required"),
  sublocationId: z.string().nullable().optional(),
  quantityBefore: z.coerce.number(),
  quantityAdjusted: z.coerce.number().refine((val) => val !== 0, {
    message: "Adjustment quantity cannot be zero",
  }),
  quantityAfter: z.coerce.number(),
  reason: z.string().optional(),
});

export const inventoryAdjustmentSchema = z.object({
  id: z.string().optional(),
  adjustmentNumber: z.string().min(1, "Adjustment number is required"),
  reason: adjustmentReasonEnum,
  notes: z.string().optional(),
  performedById: z.string().min(1, "User performing adjustment is required"),
  status: adjustmentStatusEnum.default("DRAFT"),
  lines: z
    .array(inventoryAdjustmentLineSchema)
    .min(1, "At least one adjustment line item is required"),
});

export type InventoryAdjustmentInput = z.infer<typeof inventoryAdjustmentSchema>;