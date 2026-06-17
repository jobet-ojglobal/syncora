// schemas/tag.schema.ts
import { z } from "zod";

export const tagSchema = z.object({
  id: z.string().optional(), // Present during updates
  name: z.string()
    .min(1, "Tag categorization label is required")
    .max(50, "Tag names should be restricted to under 50 characters")
    .transform((val) => val.trim()),
});

export type TagInput = z.infer<typeof tagSchema>;