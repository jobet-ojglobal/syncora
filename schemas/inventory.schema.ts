// schemas/inventory.schema.ts
import { z } from "zod";

export const inventorySchema = z
  .object({
    id: z.string().optional(),
    productId: z.string().min(1, "Target product mapping is required"),
    locationId: z.string().min(1, "Target logistics warehouse location is required"),

    // Stock Balance Controls
    quantityOnHand: z.number().min(0, "Stock balance cannot be negative"),
    quantityReserved: z.number().min(0, "Reserved values cannot be negative"),
    quantityAvailable: z.number(),

    // Nested 1:Many Storage Bin Allocations
    // Using z.array(...).default([]) directly inside object
    bins: z
      .array(
        z.object({
          id: z.string().optional(),
          sublocationId: z.string().min(1, "Must select a sublocation zone slot"),
          quantity: z.number().min(0, "Bin volume cannot be less than zero"),
        })
      )
      .default([]),
  })
  .refine(
    (data) => data.quantityReserved <= data.quantityOnHand,
    {
      message: "Reserved stock cannot exceed total Quantity On Hand.",
      path: ["quantityReserved"],
    }
  )
  .refine(
    (data) => {
      if (data.bins && data.bins.length > 0) {
        const totalBinSum = data.bins.reduce((acc, bin) => acc + (bin.quantity || 0), 0);
        return totalBinSum <= data.quantityOnHand;
      }
      return true;
    },
    {
      message: "Allocated bin quantity cannot exceed total Quantity On Hand. The remainder represents bulk/unassigned floor stock.",
      path: ["quantityOnHand"],
    }
  );

// Define separate Input and Output types if needed, or pass InventoryInput to useForm
export type InventoryInput = z.input<typeof inventorySchema>;
export type InventoryOutput = z.output<typeof inventorySchema>;

// import { z } from "zod";

// export const inventorySchema = z.object({
//   id: z.string().optional(), // Present during existing edits
//   productId: z.string().min(1, "Target product mapping is required"),
//   locationId: z.string().min(1, "Target logistics warehouse location is required"),
  
//   // 🔢 Stock Balance Controls
//   quantityOnHand: z.number().min(0, "Stock balance cannot be negative"),
//   quantityReserved: z.number().min(0, "Reserved values cannot be negative"),
//   quantityAvailable: z.number(), // Calculated reactively by UI / Server

//   // 📦 Nested 1:Many Storage Bin Allocations
//   bins: z.array(
//     z.object({
//       id: z.string().optional(),
//       sublocationId: z.string().min(1, "Must select a sublocation zone slot"),
//       quantity: z.number().min(0, "Bin volume cannot be less than zero"),
//     })
//   ),
// }).refine(
//   (data) => {
//     // If there are specific storage bins mapped, enforce structural data integrity alignment
//     if (data.bins.length > 0) {
//       const totalBinSum = data.bins.reduce((acc, bin) => acc + bin.quantity, 0);
//       return totalBinSum === data.quantityOnHand;
//     }
//     return true;
//   },
//   {
//     message: "The sum of all individual storage bin volumes must exactly match total Quantity On Hand.",
//     path: ["quantityOnHand"], // Attach error flag ring directly onto absolute total text inputs
//   }
// );

// export type InventoryInput = z.output<typeof inventorySchema>;

// Managing this component is highly technical because it relies on complex math calculations: Quantity On Hand must equal the sum of your allocated sublocation Bin Quantities ($QuantityOnHand = \sum QuantityBin$). Additionally, the form calculates the allocation math: Quantity Available equals Quantity On Hand minus Quantity Reserved ($QuantityAvailable = QuantityOnHand - QuantityReserved$).