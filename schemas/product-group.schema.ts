// schemas/product-group.schema.ts
import { z } from "zod";

export const createProductGroupSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  categoryId: z.string().min(1, "Assigning a Category is required"),
  brandId: z.string().optional().nullable(),
  isActive: z.boolean(),
  generateVariants: z.boolean(),

  // features: z.array(z.object({ text: z.string().min(1, "Feature text cannot be empty") })),
  tags: z.array(z.string()),
  features: z.array(
    z.object({
      key: z.string().min(1, "Label/Key is required"),     // e.g., "Sensor"
      value: z.string().min(1, "Specification is required") // e.g., "Full Frame"
    })
  ),

  // Array of options (e.g., Color, Size)
  options: z.array(
    z.object({
      name: z.string().min(1, "Option name cannot be empty"),
      attributeId: z.string(), // .optional()
      // 🔐 Enforce that every option has at least one tag value (e.g., "Red")
      values: z.array(
        z.object({
          value: z.string().min(1, "Value cannot be empty"),
        })
      ).min(1, "At least one tag value is required for this option"),
    })
  ).min(1, "You must provide at least one variant option attribute to create a group"),
});

export type CreateProductGroupInput = z.infer<typeof createProductGroupSchema>;