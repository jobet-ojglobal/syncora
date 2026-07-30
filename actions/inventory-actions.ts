"use server";

import { revalidatePath } from "next/cache";
import { InventoryTransactionType, AdjustmentStatus } from "@/generated/prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const adjustmentSchema = z.object({
  inventoryId: z.string().min(1),
  adjustmentType: z.enum(["SET", "DELTA"]), // SET to fixed amount, or DELTA (+/- change)
  quantity: z.number(),
  inventoryBinId: z.string().optional().nullable(),
  remarks: z.string().min(1, "Please provide a reason for this adjustment."),
  performedById: z.string().optional(), // Pass user ID if auth is integrated
});

export type AdjustmentInput = z.infer<typeof adjustmentSchema>;

export async function adjustStockAction(input: AdjustmentInput) {
  const validation = adjustmentSchema.safeParse(input);

  if (!validation.success) {
    return {
      success: false,
      error: validation.error.flatten().fieldErrors,
    };
  }

  const { inventoryId, adjustmentType, quantity, inventoryBinId, remarks, performedById } = validation.data;

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Fetch current inventory record
      const currentInventory = await tx.inventory.findUnique({
        where: { id: inventoryId },
        include: { product: true },
      });

      if (!currentInventory) {
        throw new Error("Inventory record not found.");
      }

      const currentOnHand = Number(currentInventory.quantityOnHand);
      let deltaQuantity = 0;
      let newOnHand = 0;

      if (adjustmentType === "SET") {
        newOnHand = quantity;
        deltaQuantity = newOnHand - currentOnHand;
      } else {
        deltaQuantity = quantity;
        newOnHand = currentOnHand + deltaQuantity;
      }

      if (newOnHand < 0) {
        throw new Error("Adjustment result cannot bring On-Hand quantity below 0.");
      }

      // Calculate available quantity delta (maintaining reserve invariant)
      const currentReserved = Number(currentInventory.quantityReserved || 0);
      const newAvailable = Math.max(0, newOnHand - currentReserved);

      // 2. Update parent Inventory record
      await tx.inventory.update({
        where: { id: inventoryId },
        data: {
          quantityOnHand: newOnHand,
          quantityAvailable: newAvailable,
          lastCountedAt: new Date(),
          lastMovementAt: new Date(),
        },
      });

      // 3. Handle Bin updates if a bin was selected
      if (inventoryBinId) {
        const bin = await tx.inventoryBin.findUnique({
          where: { id: inventoryBinId },
        });

        if (bin) {
          const currentBinQty = Number(bin.quantity);
          const newBinQty = adjustmentType === "SET" ? quantity : currentBinQty + deltaQuantity;

          if (newBinQty < 0) {
            throw new Error("Bin quantity cannot drop below 0.");
          }

          await tx.inventoryBin.update({
            where: { id: inventoryBinId },
            data: { quantity: newBinQty },
          });
        }
      }

      // 4. Create Stock Adjustment Header & Line
      const adjustmentNumber = `ADJ-${Date.now().toString().slice(-6)}`;
      
      const adjustment = await tx.inventoryAdjustment.create({
        data: {
          adjustmentNumber,
          remarks,
          status: AdjustmentStatus.POSTED,
          performedById: performedById ?? "system", // Fallback if no user context
          lines: {
            create: {
              inventoryId: currentInventory.id,
              productId: currentInventory.productId,
              locationId: currentInventory.locationId,
              inventoryBinId: inventoryBinId || null,
              quantityBefore: currentOnHand,
              quantityAdjusted: deltaQuantity,
              quantityAfter: newOnHand,
              remarks,
            },
          },
        },
      });

      // 5. Log entry into Inventory Ledger for full audit history
      await tx.inventoryLedger.create({
        data: {
          productId: currentInventory.productId,
          locationId: currentInventory.locationId,
          transactionType: InventoryTransactionType.ADJUSTMENT,
          referenceType: "ADJUSTMENT",
          referenceId: adjustment.id,
          performedById: performedById || null,
          quantityChange: deltaQuantity,
          quantityBefore: currentOnHand,
          quantityAfter: newOnHand,
          remarks: `Quick Adjustment: ${remarks}`,
        },
      });
    });

    revalidatePath(`/dashboard/inventory/${inventoryId}`);
    return { success: true };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to adjust stock.";
    return { success: false, error: { _form: [errorMessage] } };
  }
}