import { listWebhooks } from "@/lib/inflow/services/webhook.service";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { NextResponse } from 'next/server';

export async function POST(
  request: NextRequest
) {
  const payload =
    await request.json();

  await prisma.inflowWebhookEvent.create({
    data: {
      eventType:
        payload.eventType ??
        "unknown",

      payload,
    },
  });

  return Response.json({
    success: true,
  });
}

export async function GET() {
  try {
    const data =
        await listWebhooks();

    return NextResponse.json({
      success: true,
      message: "Connected to inFlow Cloud",
      data,
    })
 
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}