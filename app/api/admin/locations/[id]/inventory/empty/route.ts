import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface Props {
  params: Promise<{ id: string }>;
}

const BATCH_SIZE = 500;
const DELAY_MS = 300;
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(request: NextRequest, { params }: Props) {
  const { id: locationId } = await params;

  const location = await prisma.location.findUnique({
    where: { inflowId: locationId },
    select: { id: true, inflowId: true, name: true },
  });

  if (!location) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: Record<string, any>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        let deletedBinItems = 0;
        let deletedInventories = 0;

        // Batch delete InventoryBinItem
        while (true) {
          const items = await prisma.inventoryBinItem.findMany({
            where: { locationId: location.inflowId },
            select: { id: true },
            take: BATCH_SIZE,
          });

          if (items.length === 0) break;

          const result = await prisma.inventoryBinItem.deleteMany({
            where: { id: { in: items.map((i) => i.id) } },
          });

          deletedBinItems += result.count;

          sendEvent({
            type: "progress",
            phase: "bin_items",
            batchCount: result.count,
            totalDeleted: deletedBinItems,
          });

          await delay(DELAY_MS);
        }

        // Batch delete Inventory
        while (true) {
          const records = await prisma.inventory.findMany({
            where: { locationId: location.inflowId },
            select: { id: true },
            take: BATCH_SIZE,
          });

          if (records.length === 0) break;

          const result = await prisma.inventory.deleteMany({
            where: { id: { in: records.map((r) => r.id) } },
          });

          deletedInventories += result.count;

          sendEvent({
            type: "progress",
            phase: "inventories",
            batchCount: result.count,
            totalDeleted: deletedInventories,
          });

          await delay(DELAY_MS);
        }

        sendEvent({
          type: "complete",
          stats: { deletedBinItems, deletedInventories },
        });

        controller.close();
      } catch (err: any) {
        sendEvent({ type: "error", error: err.message || "Deletion failed" });
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}