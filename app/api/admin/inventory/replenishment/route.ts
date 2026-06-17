import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// This API acts as an automated agent. When evaluated (via a cron scheduler like Vercel Crons
//  or a background worker), it scans for line variations where 
// quantityAvailable <= reorderThreshold and creates a DRAFT or PENDING Transfer Order automatically.

export async function POST(request: NextRequest) {
  try {
    // 1. Fetch lines running below safety limits with auto-reorder active
    const strainedStocks = await prisma.inventory.findMany({
      where: {
        isAutoReorderEnabled: true,
        preferredSourceLocationId: { not: null },
        OR: [
          { quantityAvailable: { lte: prisma.inventory.fields.reorderThreshold } },
          { quantityAvailable: null } // Safety net for uninitialized fields
        ]
      },
      include: {
        product: { select: { name: true, slug: true } }
      }
    });

    if (strainedStocks.length === 0) {
      return NextResponse.json({ message: "All stocks optimal. No replenishment orders required." }, { status: 200 });
    }

    // 2. Group items by source -> target pairs so we don't open 50 separate orders for the same warehouses
    const orderGroups: Record<string, any[]> = {};
    
    strainedStocks.forEach((item) => {
      const key = `${item.preferredSourceLocationId}_to_${item.locationId}`;
      if (!orderGroups[key]) orderGroups[key] = [];
      orderGroups[key].push(item);
    });

    const createdOrdersCount = { transferOrders: 0, linesCreated: 0 };

    // 3. Process batches using secure database transactions
    await prisma.$transaction(async (tx) => {
      for (const [routeKey, items] of Object.entries(orderGroups)) {
        const sourceLocId = items[0].preferredSourceLocationId;
        const targetLocId = items[0].locationId;

        // Skip execution if default sizes aren't populated correctly
        const validItems = items.filter(i => Number(i.reorderQuantity) > 0);
        if (validItems.length === 0) continue;

        const uniqueOrderNumber = `AUTO-TR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        // Instantiation of the top-level Transfer Order shell
        await tx.transferOrder.create({
          data: {
            transferNumber: uniqueOrderNumber,
            sourceLocationId: sourceLocId,
            targetLocationId: targetLocId,
            status: "PENDING", // Enters queue for fulfillment review
            remarks: "System generated automated replenishment requisition due to low stock limit breach.",
            lines: {
              create: validItems.map(item => ({
                productId: item.productId,
                quantity: item.reorderQuantity
              }))
            }
          }
        });

        createdOrdersCount.transferOrders++;
        createdOrdersCount.linesCreated += validItems.length;
      }
    });

    return NextResponse.json({
      message: "Replenishment run processed successfully.",
      summary: createdOrdersCount
    }, { status: 200 });

  } catch (error: any) {
    console.error("Replenishment engine pipeline breakdown:", error);
    return NextResponse.json({ error: error.message || "Automation transaction runtime error." }, { status: 500 });
  }
}