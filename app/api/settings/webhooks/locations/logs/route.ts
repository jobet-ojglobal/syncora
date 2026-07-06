// app/api/settings/webhooks/locations/logs/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("locationId"); // Inflow ID passed from client context

    if (!locationId) {
      return NextResponse.json({ success: false, error: "Missing locationId context" }, { status: 400 });
    }

    // Pull events linked to the specific webhooks active on this location channel
    const logs = await prisma.locationWebhookEvent.findMany({
      where: {
        webhook: {
          locationId: locationId,
        },
      },
      orderBy: {
        receivedAt: "desc",
      },
      take: 50, // Limits payload impact
    });

    return NextResponse.json({ success: true, logs });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch logs" },
      { status: 500 }
    );
  }
}