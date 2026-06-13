// schemas/category.schema.ts
import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(100, "Name too long"),
  description: z.string().optional().nullable(),
  imageUrl: z.string().url("Must be a valid image URL").or(z.literal("")).optional().nullable(),
  parentId: z.string().optional().nullable(), // For self-referencing hierarchy
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const editCategorySchema = z.object({
  id: z.string().min(1, "Target ID reference is required"),
  name: z.string().min(1, "Category name is required").max(100, "Name too long"),
  description: z.string().optional().nullable(),
  imageUrl: z.string().url("Must be a valid image URL").or(z.literal("")).optional().nullable(),
  parentId: z.string().optional().nullable(),
});

export type EditCategoryInput = z.infer<typeof editCategorySchema>;