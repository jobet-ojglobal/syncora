import { z } from "zod";

export const binAllocationSchema = z.object({
  id: z.string().optional(),
  sublocationId: z.string().min(1, "Must select a sublocation zone slot"),
  quantity: z
    .number({ error: "Must be a number" })
    .min(0, "Bin volume cannot be less than zero"),
  serials: z.array(z.string()),
});

export const inventoryLineSchema = z
  .object({
    id: z.string().optional(),
    productId: z.string().min(1, "Product is required"),
    trackSerials: z.boolean(),
    quantityOnHand: z
      .number({ error: "Must be a number" })
      .min(0, "Stock balance cannot be negative"),
    quantityReserved: z
      .number({ error: "Must be a number" })
      .min(0, "Reserved values cannot be negative"),
    quantityAvailable: z.number(),
    bins: z.array(binAllocationSchema),
    serials: z.array(z.string()),
  })
  .refine((data) => data.quantityReserved <= data.quantityOnHand, {
    message: "Reserved quantity cannot exceed On Hand quantity",
    path: ["quantityReserved"],
  })
  .refine(
    (data) => {
      if (data.bins && data.bins.length > 0) {
        const totalBinSum = data.bins.reduce((acc, bin) => acc + (bin.quantity || 0), 0);
        return totalBinSum <= data.quantityOnHand;
      }
      return true;
    },
    {
      message: "Allocated bin quantity cannot exceed total Quantity On Hand.",
      path: ["quantityOnHand"],
    }
  )
  .superRefine((data, ctx) => {
    // 1. Reserved vs On Hand Validation
    if (data.quantityReserved > data.quantityOnHand) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Reserved quantity cannot exceed On Hand quantity",
        path: ["quantityReserved"],
      });
    }

    // 2. Conditional Serial Tracking Validation
    if (data.trackSerials) {
      // Clean trimmed serial strings
      const cleanedSerials = data.serials.map((s) => s.trim()).filter(Boolean);

      // Check if serial count matches Quantity On Hand
      if (cleanedSerials.length !== data.quantityOnHand) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Expected exactly ${data.quantityOnHand} serial number(s) for tracked item, but got ${cleanedSerials.length}.`,
          path: ["serials"],
        });
      }

      // Serial Number Duplicates
      const uniqueSerials = new Set(cleanedSerials);
      if (uniqueSerials.size !== cleanedSerials.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Duplicate serial numbers detected in this product line.",
          path: ["serials"],
        });
      }
    }

    // 3. Enforce Unique Sublocation per Line
    const seenSublocations = new Set<string>();
    data.bins.forEach((bin, binIndex) => {
      if (!bin.sublocationId) return;

      if (seenSublocations.has(bin.sublocationId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "This sublocation has already been added to this line item",
          path: ["bins", binIndex, "sublocationId"],
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



// export const inventoryLineSchema = z
//   .object({
//     id: z.string().optional(),
//     productId: z.string().min(1, "Product is required"),
//     trackSerials: z.boolean(),
//     quantityOnHand: z
//       .number({ error: "Must be a number" })
//       .min(0, "Stock balance cannot be negative"),
//     quantityReserved: z
//       .number({ error: "Must be a number" })
//       .min(0, "Reserved values cannot be negative"),
//     quantityAvailable: z.number(),
//     bins: z.array(binAllocationSchema),
//     serials: z.array(z.string()),
//   })
//   .refine((data) => data.quantityReserved <= data.quantityOnHand, {
//     message: "Reserved quantity cannot exceed On Hand quantity",
//     path: ["quantityReserved"],
//   })
//   .refine(
//     (data) => {
//       if (data.bins && data.bins.length > 0) {
//         const totalBinSum = data.bins.reduce((acc, bin) => acc + (bin.quantity || 0), 0);
//         return totalBinSum <= data.quantityOnHand;
//       }
//       return true;
//     },
//     {
//       message: "Allocated bin quantity cannot exceed total Quantity On Hand. The remainder represents bulk/unassigned floor stock.",
//       path: ["quantityOnHand"],
//     }
//   )
//   .superRefine((data, ctx) => {
//     // 1. Reserved vs On Hand Validation
//     if (data.quantityReserved > data.quantityOnHand) {
//       ctx.addIssue({
//         code: z.ZodIssueCode.custom,
//         message: "Reserved quantity cannot exceed On Hand quantity",
//         path: ["quantityReserved"],
//       });
//     }

//     // 2. Enforce Unique Sublocation per Line
//     const seenSublocations = new Set<string>();
//     data.bins.forEach((bin, binIndex) => {
//       if (!bin.sublocationId) return;

//       if (seenSublocations.has(bin.sublocationId)) {
//         ctx.addIssue({
//           code: z.ZodIssueCode.custom,
//           message: "This sublocation has already been added to this line item",
//           path: ["bins", binIndex, "sublocationId"],
//         });
//       } else {
//         seenSublocations.add(bin.sublocationId);
//       }
//     });

//     // 3. Serial Number Duplicates within same line
//     const uniqueSerials = new Set(data.serials.map((s) => s.trim()));
//     if (uniqueSerials.size !== data.serials.length) {
//       ctx.addIssue({
//         code: z.ZodIssueCode.custom,
//         message: "Duplicate serial numbers detected in this product line.",
//         path: ["serials"],
//       });
//     }
//   });
