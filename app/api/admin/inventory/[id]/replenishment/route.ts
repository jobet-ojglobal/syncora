// app/api/admin/inventory/[id]/replenishment/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

/**
 * ⚙️ UPDATE REPLENISHMENT AUTOMATION PARAMETERS
 */
interface Props {
  params: Promise<{
    id: string;
  }>;
}

export async function PATCH(
  request: NextRequest,
  { params }: Props
) {
  try {
    const { id: inventoryId } = await params;

    if (!inventoryId) {
      return NextResponse.json(
        { error: "Missing inventory allocation target token." },
        { status: 400 }
      );
    }

    // 1. Parse payload out of incoming data request stream
    const body = await request.json();
    const { 
      reorderThreshold, 
      reorderQuantity, 
      isAutoReorderEnabled, 
      preferredSourceLocationId 
    } = body;

    // 2. Validate input constraints and presence check
    const itemExists = await prisma.inventory.findUnique({
      where: { id: inventoryId },
      select: { id: true, productId: true, locationId: true }
    });

    if (!itemExists) {
      return NextResponse.json(
        { error: "Target inventory tracking ledger row does not exist." },
        { status: 404 }
      );
    }

    // 3. Optional validation: Verify source location exists if enabled
    if (isAutoReorderEnabled && preferredSourceLocationId) {
      const sourceLocationExists = await prisma.location.findUnique({
        where: { inflowId: preferredSourceLocationId },
        select: { id: true }
      });

      if (!sourceLocationExists) {
        return NextResponse.json(
          { error: "The designated fallback hub location ID does not exist in logistics databases." },
          { status: 422 }
        );
      }
      
      // Stop loop configurations where a warehouse attempts to order from itself
      if (preferredSourceLocationId === itemExists.locationId) {
        return NextResponse.json(
          { error: "Invalid operational rule: Target location cannot serve as its own automated supply hub." },
          { status: 400 }
        );
      }
    }

    // 4. Cast JS values to native Prisma Decimals to prevent field mismatch
    const thresholdDecimal = new Prisma.Decimal(reorderThreshold ?? 0);
    const quantityDecimal = new Prisma.Decimal(reorderQuantity ?? 0);

    if (thresholdDecimal.isNegative() || quantityDecimal.isNegative()) {
      return NextResponse.json(
        { error: "Automation safety metrics (thresholds/quantities) cannot look negative." },
        { status: 400 }
      );
    }

    // 5. Update database deployment row
    const updatedInventory = await prisma.inventory.update({
      where: { id: inventoryId },
      data: {
        reorderThreshold: thresholdDecimal,
        reorderQuantity: quantityDecimal,
        isAutoReorderEnabled: !!isAutoReorderEnabled,
        preferredSourceLocationId: preferredSourceLocationId || null
      }
    });

    return NextResponse.json(
      {
        message: "Inventory automation rules adjusted successfully.",
        data: {
          id: updatedInventory.id,
          isAutoReorderEnabled: updatedInventory.isAutoReorderEnabled,
          reorderThreshold: Number(updatedInventory.reorderThreshold),
          reorderQuantity: Number(updatedInventory.reorderQuantity),
          preferredSourceLocationId: updatedInventory.preferredSourceLocationId
        }
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error("Critical failure during replenishment ledger write operation:", error);
    return NextResponse.json(
      { error: error.message || "Internal server crash while executing configuration adjustments." },
      { status: 500 }
    );
  }
}