import { z } from "zod";

export const paymentTermsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Display title name is required")
    .max(100, "Name must be 100 characters or fewer"),
  
  // By using z.union, the resolver can statically see that the input 
  // can accept a string, number, or null, and correctly map it to a null value.
  daysDue: z
    .union([
      z.string().transform((val) => (val === "" ? null : Number(val))),
      z.number(),
      z.null(),
    ])
    .pipe(z.number().int().min(0, "Days due must be a non-negative integer").nullable())
    .optional(),
    
  isActive: z.boolean(),
});

export type PaymentTermsInput = z.infer<typeof paymentTermsSchema>;