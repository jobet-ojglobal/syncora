// schemas/brand.schema.ts
import { z } from "zod";

export const brandSchema = z.object({
  id: z.string().optional(), // Provided only during Edit mode
  name: z.string().min(1, "Brand name is required").max(100, "Name too long"),
  description: z.string().optional().nullable(),
  logoUrl: z.string().url("Must be a valid image URL").or(z.literal("")).optional().nullable(),
  websiteUrl: z.string().url("Must be a valid URL (e.g., https://...)").or(z.literal("")).optional().nullable(),
});

export type BrandInput = z.infer<typeof brandSchema>;