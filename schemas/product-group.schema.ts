// schemas/product-group.schema.ts
import { z } from "zod";

export const createProductGroupSchema = z.object({
  name: z.string().min(1, "Product Group name is required"),
  categoryId: z.string().min(1, "Assigning a Category is required"),
  isActive: z.boolean(),

  // Array of options (e.g., Color, Size)
  options: z.array(
    z.object({
      name: z.string().min(1, "Option name cannot be empty"), // e.g., "Color"
      attributeId: z.string().optional(), // Maps to the global Attribute record if matched
      values: z.array(
        z.object({
          value: z.string().min(1, "Value cannot be empty"), // e.g., "Red"
        })
      ).min(1, "At least one value required per option"),
    })
  ),
});

export type CreateProductGroupInput = z.infer<typeof createProductGroupSchema>;