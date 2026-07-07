// app/api/settings/webhooks/locations/route.ts
import { NextResponse } from "next/server";
import { 
  findLocationWebhookByLocation, 
  createOrUpdateLocationWebhook, 
  deleteLocationWebhook,
} from "@/lib/locations/services/webhook.service";
import { InflowEvent } from "@/lib/locations/types/webhook.type";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("locationId"); // contains inflowId

    if (!locationId) {
      return NextResponse.json({ success: false, error: "Missing locationId" }, { status: 400 });
    }

    const location = await prisma.location.findUnique({
      where: { id: locationId },
      select: { inflowId: true, url: true }
    })

    if (!location) {
      return NextResponse.json({ success: false, error: "Location not found." }, { status: 404 });
    }

    const webhook = await findLocationWebhookByLocation(location.inflowId);
    return NextResponse.json({ 
      success: true, 
      webhook: webhook ?? null,
      hasUrl: !!location?.url // Pass this flag down to the client layout
    });
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

    const location = await prisma.location.findUnique({
      where: { id: locationId },
      select: { inflowId: true }
    })

    if (!location) {
      return NextResponse.json({ success: false, error: "Location not found." }, { status: 404 });
    }

    if (action === "connect") {
      const defaultEvents: InflowEvent[] = ["customer", "salesOrder"]; 
      const webhook = await createOrUpdateLocationWebhook(location.inflowId, defaultEvents);
      return NextResponse.json({ success: true, webhook });
    }

    if (action === "disconnect") {
      if (!webhookId) {
          const current = await findLocationWebhookByLocation(location.inflowId);
          if (current) {
          await deleteLocationWebhook(location.inflowId, current.webHookSubscriptionId);
          }
      } else {
          // Now requires inflowId to fetch the Location's API endpoint dynamically
          await deleteLocationWebhook(location.inflowId, webhookId);
      }
      return NextResponse.json({ success: true });
    }

    if (action === "update_events") {
      if (!events) throw new Error("Missing events array");
      const webhook = await createOrUpdateLocationWebhook(location.inflowId, events);
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