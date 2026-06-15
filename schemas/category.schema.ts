// schemas/category.schema.ts
import { z } from "zod";

export const categorySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Category name is required").max(100, "Name too long"),
  description: z.string().optional().nullable(),
  imageUrl: z.string().url("Must be a valid image URL").or(z.literal("")).optional().nullable(),
  parentId: z.string().optional().nullable(),
});

export type CategoryInput = z.infer<typeof categorySchema>;