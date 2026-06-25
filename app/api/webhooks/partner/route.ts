// app/api/webhooks/inflow/route.ts
import { partnerApi } from "@/lib/partner/partner.client";
import { listWebhooks } from "@/lib/partner/services/webhook.service";
// import { InflowProductWebhookService } from "@/lib/partner/services/webhook-product.service";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const data = await listWebhooks();
    return NextResponse.json({ success: true, message: "Connected to Partner App", data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const eventType = payload.eventType || payload.action || "unknown";

    // 1. Create audit trail log row immediately
    const loggedEvent = await prisma.partnerWebhookEvent.create({
      data: {
        eventType,
        payload: payload as any, 
      },
    });

    // 2. Delegate data operations based on event type classifications
    switch (eventType) {

      case "SalesOrderCreated": {
        const inflowId = payload.batch_id;
        
        if (inflowId) {
          // Pass the target item ID along with the audit log entry reference
          // await InflowProductWebhookService.handleProductCreate(inflowId, loggedEvent.id);

            // partnerApi.post("/transactions/sales/cloud-ack", {
            //   "batch_id": payload.batch_id,
            //   "outbound_audit_id": payload.outboundAuditId,
            //   "cloud_status": "SUCCESS",
            //   "message": "Committed from cloud"
            // })
        }
        break;
      }

      case "SalesOrderUpdated": {
        const inflowId = payload.batch_id;
        
        if (inflowId) {
        //   await InflowProductWebhookService.handleProductUpdate(inflowId, loggedEvent.id);

            // partnerApi.post("/transactions/sales/cloud-ack", {
            //   "batch_id": payload.batch_id,
            //   "outbound_audit_id": payload.outboundAuditId,
            //   "cloud_status": "SUCCESS",
            //   "message": "Committed from cloud"
            // })
        }
        break;
      }

      default:
        console.log(`[Webhook Router] Unhandled webhook event classification: ${eventType}`);
        break;
    }

    // Return a 200 OK fast to protect remote subscription validation
    return NextResponse.json({ received: true }, { status: 200 });
    
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
