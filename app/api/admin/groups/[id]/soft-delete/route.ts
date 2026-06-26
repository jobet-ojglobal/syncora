import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Missing required product id identifier key token." }, { status: 400 });
    }

    // 🛑 INTEGRITY CHECK: Verify the item is not tied to active warehouse positions
    const activeInventoryCount = await prisma.inventory.count({
      where: {
        productId: id,
        quantityOnHand: { gt: 0 }
      }
    });

    if (activeInventoryCount > 0) {
      return NextResponse.json({
        error: "Cannot remove this product variant. Active physical inventory balances are currently registered across logistics hubs."
      }, { status: 422 });
    }

    // Apply logical soft-delete to protect historic ledger consistency
    const archivedItem = await prisma.productGroup.update({
      where: { id },
      data: { 
        deletedAt: new Date(),
        isActive: false 
      }
    });

    return NextResponse.json({ success: true, groupName: archivedItem.name }, { status: 200 });
  } catch (error) {
    console.error("Critical failure during product catalog record deletion:", error);
    return NextResponse.json({ error: "Internal Database transaction pipeline modification failure." }, { status: 500 });
  }
}