// app/api/settings/webhooks/locations/route.ts
import { NextResponse } from "next/server";
import { 
  findPartnerWebhookByLocation, 
  createOrUpdatePartnerWebhook, 
  deletePartnerWebhook,
} from "@/lib/locations/services/webhook.service";
import { InflowEvent } from "@/lib/locations/types/webhook.type";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("locationId"); // contains inflowId

    if (!locationId) {
      return NextResponse.json({ success: false, error: "Missing locationId" }, { status: 400 });
    }

    const webhook = await findPartnerWebhookByLocation(locationId);
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
    const { action, locationId, webhookId, events } = body;

    if (!locationId) {
      return NextResponse.json({ success: false, error: "Missing locationId contextual field" }, { status: 400 });
    }

    if (action === "connect") {
      const defaultEvents: InflowEvent[] = ["customer", "salesOrder"]; 
      const webhook = await createOrUpdatePartnerWebhook(locationId, defaultEvents);
      return NextResponse.json({ success: true, webhook });
    }

    if (action === "disconnect") {
      if (!webhookId) {
          const current = await findPartnerWebhookByLocation(locationId);
          if (current) {
          await deletePartnerWebhook(locationId, current.webHookSubscriptionId);
          }
      } else {
          // Now requires locationId to fetch the partner's API endpoint dynamically
          await deletePartnerWebhook(locationId, webhookId);
      }
      return NextResponse.json({ success: true });
    }

    if (action === "update_events") {
      if (!events) throw new Error("Missing events array");
      const webhook = await createOrUpdatePartnerWebhook(locationId, events);
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