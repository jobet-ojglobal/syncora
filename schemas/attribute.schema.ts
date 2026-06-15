// schemas/attribute.schema.ts
import { z } from "zod";

export const attributeSchema = z.object({
  id: z.string().optional(), // Provided only during Edit mode
  name: z.string().min(1, "Attribute name is required (e.g., Color, Size)").max(50),
  values: z.array(
    z.object({
      id: z.string().optional(), // Present if updating an existing child value
      value: z.string().min(1, "Option value cannot be empty (e.g., Red, Large)"),
      hexCode: z
        .string()
        .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Must be a valid hex color code (e.g., #FF0000)")
        .or(z.literal(""))
        .nullable()
        .optional(),
    })
  ).min(1, "You must provide at least one variant option value"),
});

export type AttributeInput = z.infer<typeof attributeSchema>;