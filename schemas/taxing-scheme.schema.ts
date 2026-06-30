// schemas/taxing-scheme.schema.ts
import { z } from "zod";

export const taxingSchemeSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Taxing scheme group name designation is required"),
  isActive: z.boolean(),
  isDefault: z.boolean(),
  calculateTax2OnTax1: z.boolean(),
  
  tax1Name: z.string().nullable().optional().or(z.literal("")),
  tax1OnShipping: z.boolean(),
  
  tax2Name: z.string().nullable().optional().or(z.literal("")),
  tax2OnShipping: z.boolean(),
  
  defaultTaxCodeId: z.string().nullable().optional().or(z.literal("")),

  // ⛓️ Inline Nested Multi-Tax Rate Components Matrix Array
  taxCodes: z.array(
    z.object({
      id: z.string().optional(),
      name: z.string().min(1, "Tax bracket or jurisdiction label name is required"),
      isActive: z.boolean(),
      tax1Rate: z.number().min(0, "Tax rate percentages cannot be negative").max(100, "Tax rate cannot exceed 100%"),
      tax2Rate: z.number().min(0, "Tax rate percentages cannot be negative").max(100, "Tax rate cannot exceed 100%"),
    })
  ),
});

export type TaxingSchemeInput = z.infer<typeof taxingSchemeSchema>;