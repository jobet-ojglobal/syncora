// app/api/admin/business-partners/empty/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const BATCH_SIZE = 500;
const DELAY_MS = 200;
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(request: NextRequest) {
  try {
    const { role } = await request.json();

    // Define query condition based on role
    const whereCondition: any = {};
    if (role === "CUSTOMER") {
      whereCondition.customer = { isNot: null };
    } else if (role === "VENDOR") {
      whereCondition.vendor = { isNot: null };
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (data: Record<string, any>) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          let totalDeleted = 0;

          while (true) {
            // Find IDs to delete in batches
            const records = await prisma.businessPartner.findMany({
              where: whereCondition,
              select: { id: true },
              take: BATCH_SIZE,
            });

            if (records.length === 0) break;

            const ids = records.map((r) => r.id);

            // Execute delete (Cascade auto-cleans BusinessPartnerAddress)
            const result = await prisma.businessPartner.deleteMany({
              where: { id: { in: ids } },
            });

            totalDeleted += result.count;

            sendEvent({
              type: "progress",
              phase: role === "ALL" ? "business_partners" : `${role.toLowerCase()}s`,
              batchCount: result.count,
              totalDeleted,
            });

            await delay(DELAY_MS);
          }

          sendEvent({
            type: "complete",
            stats: { totalDeleted },
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
  } catch (err: any) {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }
}