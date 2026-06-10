// schemas/product.schema.ts
import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  sku: z.string().min(1, "SKU is required"),
  description: z.string().optional(),
  brandId: z.string().nullable().optional(),
  
  // Logistics Dimensions
  weight: z.coerce.number().positive("Weight must be positive").optional(),
  width: z.coerce.number().positive("Width must be positive").optional(),
  height: z.coerce.number().positive("Height must be positive").optional(),
  length: z.coerce.number().positive("Length must be positive").optional(),
  
  // Tracking & States
  isActive: z.boolean().default(true),
  trackExpiry: z.boolean().default(false),
  trackLots: z.boolean().default(false),
  trackSerials: z.boolean().default(false),
  
  // Variant Setup Meta-fields (Crucial for the architecture)
  productGroupId: z.string().min(1, "Assigning a Product Group is required to tie variants"),
  defaultPrice: z.coerce.number().min(0, "Price cannot be negative").default(0),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;