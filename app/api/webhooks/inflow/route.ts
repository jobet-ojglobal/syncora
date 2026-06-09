// app/api/webhooks/inflow/route.ts
import { listWebhooks } from "@/lib/inflow/services/webhook.service";
import { InflowProductWebhookService } from "@/lib/inflow/services/webhook-product.service";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const eventType = payload.eventType || payload.action || "unknown";

    // 1. Create audit trail log row immediately
    const loggedEvent = await prisma.inflowWebhookEvent.create({
      data: {
        eventType,
        payload: payload as any,
      },
    });

    // 2. Delegate data operations based on event type classifications
    switch (eventType) {

      case "ProductCreatedV1": {
        const inflowId = payload.id || payload.productId;
        
        if (inflowId) {
          // Pass the target item ID along with the audit log entry reference
          await InflowProductWebhookService.handleProductCreate(inflowId, loggedEvent.id);
        }
        break;
      }

      case "ProductUpdatedV2": {
        const inflowId = payload.id || payload.productId;
        
        if (inflowId) {
          await InflowProductWebhookService.handleProductUpdate(inflowId, loggedEvent.id);
        }
        break;
      }

      default:
        console.log(`[Webhook Router] Unhandled webhook event classification: ${eventType}`);
        break;
    }

    // Return a 200 OK fast to protect remote subscription validation
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error("[Webhook Router Error] Execution crashed:", error);
    
    // Always acknowledge with status 200 to prevent inFlow from disabling the webhook
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Internal pipeline failure" 
      }, 
      { status: 200 }
    );
  }
}

export async function GET() {
  try {
    const data = await listWebhooks();
    return NextResponse.json({ success: true, message: "Connected to inFlow Cloud", data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}