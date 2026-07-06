// app/api/settings/partner/route.ts
import { NextResponse } from "next/server";
import { 
  findPartnerWebhook, 
  createOrUpdatePartnerWebhook, 
  deletePartnerWebhook,
} from "@/lib/partner/services/webhook.service";
import { InflowEvent } from "@/lib/partner/types/webhook";

export async function GET() {
  try {
    const webhook = await findPartnerWebhook();
    return NextResponse.json({ success: true, webhook: webhook ?? null });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, webhookId, events } = body;

    if (action === "connect") {
      const defaultEvents: InflowEvent[] = ["customer", "salesOrder"]; 
      const webhook = await createOrUpdatePartnerWebhook(defaultEvents);
      return NextResponse.json({ success: true, webhook });
    }

    if (action === "disconnect") {
      if (!webhookId) {
        const current = await findPartnerWebhook();
        if (current) await deletePartnerWebhook(current.webHookSubscriptionId);
      } else {
        await deletePartnerWebhook(webhookId);
      }
      return NextResponse.json({ success: true });
    }

    if (action === "update_events") {
      if (!events) throw new Error("Missing events array");
      const webhook = await createOrUpdatePartnerWebhook(events);
      return NextResponse.json({ success: true, webhook });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Mutation failed" },
      { status: 500 }
    );
  }
}