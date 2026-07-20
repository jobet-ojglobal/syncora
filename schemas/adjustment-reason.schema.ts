import { z } from "zod";

export const adjustmentReasonSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or less"),
  isActive: z.boolean(),
  isInternal: z.boolean(),
});

export type AdjustmentReasonInput = z.infer<typeof adjustmentReasonSchema>;