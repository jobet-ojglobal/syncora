import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(request: NextRequest) {
  try {
    const { inflowId } = await request.json(); // Map directly into your targeting identification parameters

    if (!inflowId) {
      return NextResponse.json({ error: "Missing required stock ledger record pointer target ID." }, { status: 400 });
    }

    // 🛑 RELATION BLOCKER SAFEGUARD:
    // Prevent deletion if the stock node contains reserved stock values allocated to pending shipments.
    const activeLockCheck = await prisma.inventory.findUnique({
      where: { id: inflowId },
      select: { quantityReserved: true }
    });

    if (activeLockCheck && Number(activeLockCheck.quantityReserved) > 0) {
      return NextResponse.json({
        error: "Cannot drop this stock tracking node. It contains active product allocations reserved for pending sales or transfer orders."
      }, { status: 422 });
    }

    // Perform atomic cleanup execution
    await prisma.$transaction(async (tx) => {
      // 1. Wipe out any cascading internal storage layout picking bins rows
      await tx.inventoryBin.deleteMany({
        where: { inventoryId: inflowId }
      });

      // 2. Drop the primary master parent stock tracking row record
      await tx.inventory.delete({
        where: { id: inflowId }
      });
    });

    return NextResponse.json({ success: true, removedStockLineId: inflowId }, { status: 200 });
  } catch (error) {
    console.error("Critical error clearing system inventory entry records:", error);
    return NextResponse.json({ error: "Internal Database execution cleanup transaction failure." }, { status: 500 });
  }
}