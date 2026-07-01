import { z } from "zod";

export const paymentTermsSchema = z.object({
  name: z
    .string()
    .min(1, "Display title name is required")
    .max(100, "Name must be 100 characters or fewer"),
  daysDue: z.number().nullable(),
  isActive: z.boolean(),
}).refine((data) => data.daysDue === null || (data.daysDue !== null && data.daysDue >= 0), {
  message: "Days due must be a non-negative number or null",
  path: ["daysDue"],
});

export type PaymentTermsInput = z.infer<typeof paymentTermsSchema>;