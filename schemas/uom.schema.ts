// schemas/uom.schema.ts
import { z } from "zod";

export const UomCategoryEnum = z.enum(["COUNT", "WEIGHT", "VOLUME", "LENGTH", "AREA"]);

export const uomSchema = z.object({
  id: z.string().optional(),
  // 🟢 Change: Avoid inline .transform() here to stop form lifecycle lockups
  code: z.string()
    .min(1, "UOM code identifier is required (e.g., KG, BOX)")
    .max(10, "Code token must be under 10 characters"),
  name: z.string().min(1, "Display name label is required (e.g., Kilogram)"),
  category: UomCategoryEnum,
  baseFactor: z.number()
    .gt(0, "The scaling baseline calculation factor must be greater than 0"),
  isActive: z.boolean(),

  conversions: z.array(
    z.object({
      id: z.string().optional(),
      toUomId: z.string().min(1, "Target cross-conversion unit selection is required"),
      factor: z.number().gt(0, "Conversion multiplier scale value must be positive"),
    })
  ),
});

export type UomInput = z.infer<typeof uomSchema>;