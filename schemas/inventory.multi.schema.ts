import { z } from "zod";

export const binAllocationSchema = z.object({
  id: z.string().optional(),
  sublocationId: z.string().min(1, "Must select a sublocation zone slot"),
  quantity: z
    .number({ error: "Must be a number" })
    .min(0, "Bin volume cannot be less than zero"),
});

export const inventoryLineSchema = z
  .object({
    id: z.string().optional(),
    productId: z.string().min(1, "Product is required"),
    quantityOnHand: z
      .number({ error: "Must be a number" })
      .min(0, "Stock balance cannot be negative"),
    quantityReserved: z
      .number({ error: "Must be a number" })
      .min(0, "Reserved values cannot be negative"),
    quantityAvailable: z.number(),
    bins: z.array(binAllocationSchema),
  })
  // .refine((data) => data.quantityReserved <= data.quantityOnHand, {
  //   message: "Reserved quantity cannot exceed On Hand quantity",
  //   path: ["quantityReserved"],
  // });
  .superRefine((data, ctx) => {
    // 1. Reserved vs On Hand Validation
    if (data.quantityReserved > data.quantityOnHand) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Reserved quantity cannot exceed On Hand quantity",
        path: ["quantityReserved"],
      });
    }

    // 2. Enforce Unique Sublocation per Line (within this line's bins)
    const seenSublocations = new Set<string>();

    data.bins.forEach((bin, binIndex) => {
      if (!bin.sublocationId) return;

      if (seenSublocations.has(bin.sublocationId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "This sublocation has already been added to this line item",
          path: ["bins", binIndex, "sublocationId"], // Highlights exact duplicate bin select
        });
      } else {
        seenSublocations.add(bin.sublocationId);
      }
    });
  });

export const inventorySchema = z.object({
  id: z.string().optional(),
  locationId: z.string().min(1, "Target facility is required"),
  remarks: z.string().optional(),
  lines: z
    .array(inventoryLineSchema)
    .min(1, "At least one product line is required"),
});

export type InventoryInput = z.infer<typeof inventorySchema>;
export type InventoryLineInput = z.infer<typeof inventoryLineSchema>;