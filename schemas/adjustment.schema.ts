import { z } from "zod";

export const adjustmentSchema = z
  .object({
    id: z.string().optional(),
    productId: z.string().min(1),
    locationId: z.string().min(1),
    quantityOnHand: z.number().min(0),
    quantityReserved: z.number().min(0),
    quantityAvailable: z.number(),
    reason: z.enum([
      "MANUAL",
      "STOCK_COUNT",
      "CORRECTION",
      "DAMAGE",
      "LOSS",
      "THEFT",
      "EXPIRED",
      "RETURN",
    ]),
    notes: z.string().min(
      1,
      "Adjustment notes are required"
    ),
    performedById: z.string().min(1),
    bins: z.array(
      z.object({
        id: z.string().optional(),
        sublocationId: z.string().min(1),
        quantity: z.number().min(0),
      })
    ),
  })
  .refine(
    (data) => {
      const total = data.bins.reduce(
        (sum, bin) => sum + bin.quantity,
        0
      );

      return (
        data.bins.length === 0 ||
        total === data.quantityOnHand
      );
    },
    {
      message:
        "Bin quantities must equal Quantity On Hand",
      path: ["quantityOnHand"],
    }
  );

export type AdjustmentInput =
  z.infer<typeof adjustmentSchema>;