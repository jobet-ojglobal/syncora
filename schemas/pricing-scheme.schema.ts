// schemas/pricing-scheme.schema.ts
import { z } from "zod";

export const pricingSchemeSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Pricing strategy template designation title name is required"),
  currencyId: z.string().min(1, "Target transactional tracking currency anchor mapping is mandatory"),
  isActive: z.boolean(),
  isDefault: z.boolean(),
  isTaxInclusive: z.boolean(),
});

export type PricingSchemeInput = z.infer<typeof pricingSchemeSchema>;