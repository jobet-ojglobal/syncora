import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Adjust according to your Prisma client path
import { inventoryAdjustmentSchema } from "@/schemas/inventory.adjustment.schema";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validatedData = inventoryAdjustmentSchema.parse(body);

    // Execute atomic transaction for inventory adjustments
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create adjustment log entry
      const adjustmentHeader = await tx.inventoryAdjustment.create({
        data: {
          locationId: validatedData.locationId,
          reason: validatedData.reason,
          remarks: validatedData.remarks,
          lines: {
            create: validatedData.lines.map((line) => ({
              productId: line.productId,
              sublocationId: line.sublocationId || null,
              previousQuantity: line.currentQuantity,
              newQuantity: line.adjustedQuantity,
              delta: line.delta,
              reasonNote: line.reasonNote,
            })),
          },
        },
      });

      // 2. Adjust physical inventory balances
      for (const line of validatedData.lines) {
        await tx.inventoryItem.upsert({
          where: {
            productId_locationId: {
              productId: line.productId,
              locationId: validatedData.locationId,
            },
          },
          update: {
            quantityOnHand: {
              increment: line.delta,
            },
          },
          create: {
            productId: line.productId,
            locationId: validatedData.locationId,
            quantityOnHand: line.adjustedQuantity,
          },
        });

        // 3. Record audit ledger transaction
        await tx.inventoryLedger.create({
          data: {
            productId: line.productId,
            locationId: validatedData.locationId,
            sublocationId: line.sublocationId || null,
            transactionType: "ADJUSTMENT",
            quantityChange: line.delta,
            referenceId: adjustmentHeader.id,
            notes: line.reasonNote || validatedData.remarks,
          },
        });
      }

      return adjustmentHeader;
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: any) {
    console.error("Adjustment processing error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process stock adjustment" },
      { status: 400 }
    );
  }
}