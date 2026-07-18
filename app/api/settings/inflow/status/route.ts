// app/api/settings/inflow/route.ts
import { NextResponse } from "next/server";
import { getWebhookStatusDetails } from "@/lib/inflow/webhooks/webhook-setting.service";

export async function GET() {
  try {
    const statusData = await getWebhookStatusDetails();
    return NextResponse.json({ success: true, webhook: statusData });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch status" },
      { status: 500 }
    );
  }
}