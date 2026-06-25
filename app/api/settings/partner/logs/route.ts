// app/api/settings/inflow/logs/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const logs = await prisma.partnerWebhookEvent.findMany({
      take: 50,
      orderBy: {
        receivedAt: "desc",
      },
    });

    return NextResponse.json({ success: true, logs });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to fetch logs" 
      },
      { status: 500 }
    );
  }
}