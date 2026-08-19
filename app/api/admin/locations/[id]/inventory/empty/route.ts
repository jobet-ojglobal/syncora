import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface Props {
  params: Promise<{
    id: string;
  }>;
}

const BATCH_SIZE = 500;
const DELAY_MS = 300;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(
  request: NextRequest, 
  { params }: Props
) {
  try {
    const { id: locationId } = await params;

    // 1. Verify location exists
    const location = await prisma.location.findUnique({
      where: { inflowId: locationId },
      select: { id: true, inflowId: true, name: true },
    });

    if (!location) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    // 2. Batch delete InventoryBinItem
    let deletedBinItems = 0;
    while (true) {
      const items = await prisma.inventoryBinItem.findMany({
        where: { locationId: location.inflowId },
        select: { id: true },
        take: BATCH_SIZE,
      });

      if (items.length === 0) break;

      const ids = items.map((item) => item.id);
      const result = await prisma.inventoryBinItem.deleteMany({
        where: { id: { in: ids } },
      });

      deletedBinItems += result.count;
      await delay(DELAY_MS);
    }

    // 3. Batch delete Inventory (cascades to InventoryBin and InventoryReservation)
    let deletedInventories = 0;
    while (true) {
      const records = await prisma.inventory.findMany({
        where: { locationId: location.inflowId },
        select: { id: true },
        take: BATCH_SIZE,
      });

      if (records.length === 0) break;

      const ids = records.map((record) => record.id);
      const result = await prisma.inventory.deleteMany({
        where: { id: { in: ids } },
      });

      deletedInventories += result.count;
      await delay(DELAY_MS);
    }

    return NextResponse.json({
      success: true,
      message: `Inventory successfully cleared for location: ${location.name}`,
      stats: {
        deletedBinItems,
        deletedInventories,
      },
    });
  } catch (error) {
    console.error("Failed to empty location inventory:", error);
    return NextResponse.json(
      { error: "An error occurred while clearing inventory." },
      { status: 500 }
    );
  }
}