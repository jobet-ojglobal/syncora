// app/api/webhooks/inflow/route.ts
import { prisma } from "@/lib/prisma";
import { syncPartnerQueue } from "@/lib/queues/sync.queue";
import { listWebhooks } from "@/lib/inflow/webhooks/webhook.service";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET Handler: Verification endpoint used to prove connectivity 
 * to the remote inflow application.
 */
export async function GET() {
  try {
    const data = await listWebhooks();
    return NextResponse.json({ success: true, message: "Connected to inflow App", data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * POST Handler: Real-time webhook ingestion endpoint.
 * Immediately logs the transaction and pushes it to a background worker queue.
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const eventType = payload.eventType || payload.action || "unknown";

    // 1. Create audit trail log row immediately for traceability
    const loggedEvent = await prisma.inflowWebhookEvent.create({
      data: {
        eventType,
        payload: payload as any,
      },
    });

    // 2. Delegate data operations based on event type classifications
    switch (eventType) {
      case "ProductCreatedV1":
      case "ProductUpdatedV2": {
        const inflowId = payload.id || payload.productId;

        if (inflowId) {
          await syncPartnerQueue.add(
            "cloud_sync_job",
            {
              source: "inflow_product",
              action: eventType === "ProductCreatedV1" ? "create" : "update",
              dataId: inflowId,
              loggedEventId: loggedEvent.id
            },
            {
              attempts: 3,
              backoff: {
                type: "exponential",
                delay: 2000, // Wait 2s, then 4s, then 8s on failure
              },
            }
          );
        }
        break;
      }

      case "SalesOrderCreatedV1":
      case "SalesOrderUpdatedV1":
      case "SalesOrderUpdatedV2": {
        const orderId =  payload.id || payload.salesOrderId;

        if (orderId) {
          // Offload the sync processing to the dedicated background worker queue
          console.log(`api partner_sync_job ${eventType}`)
          await syncPartnerQueue.add(
            "partner_sync_job",
            {
              source: "inflow_sales_order",
              action: eventType === "SalesOrderCreatedV1" ? "create" : "update",
              dataId: orderId,
              loggedEventId: loggedEvent.id,
            },
            {
              attempts: 3,
              backoff: {
                type: "exponential",
                delay: 2000, // Wait 2s, then 4s, then 8s on failure
              },
            }
          );
        }
        break;
      }

      default:
        console.log(`[Webhook Router] Unhandled webhook event classification: ${eventType}`);
        break;
    }

    // 3. Return a 200 OK lightning fast to protect remote subscription validation
    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error) {
    console.error("[Webhook Router Error] Pipeline execution crashed:", error);

    // CRITICAL: Always acknowledge with status 200 during ingestion failures.
    // This prevents external inflow systems (like inFlow) from disabling the webhook webhook webhook link.
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal pipeline failure",
      },
      { status: 200 }
    );
  }
}

// // app/api/webhooks/inflow/route.ts
// import { listWebhooks } from "@/lib/inflow/webhooks/webhook.service";
// import { InflowProductWebhookService } from "@/lib/inflow/webhooks/webhook-product.service";
// import { prisma } from "@/lib/prisma";
// import { NextRequest, NextResponse } from "next/server";

// export async function POST(request: NextRequest) {
//   try {
//     const payload = await request.json();
//     const eventType = payload.eventType || payload.action || "unknown";

//     // 1. Create audit trail log row immediately
//     const loggedEvent = await prisma.inflowWebhookEvent.create({
//       data: {
//         eventType,
//         payload: payload as any,
//       },
//     });

//     // 2. Delegate data operations based on event type classifications
//     switch (eventType) {

//       case "ProductCreatedV1": {
//         const inflowId = payload.id || payload.productId;
        
//         if (inflowId) {
//           // Pass the target item ID along with the audit log entry reference
//           await InflowProductWebhookService.handleProductCreate(inflowId, loggedEvent.id);
//         }
//         break;
//       }

//       case "ProductUpdatedV2": {
//         const inflowId = payload.id || payload.productId;
        
//         if (inflowId) {
//           await InflowProductWebhookService.handleProductUpdate(inflowId, loggedEvent.id);
//         }
//         break;
//       }

//       default:
//         console.log(`[Webhook Router] Unhandled webhook event classification: ${eventType}`);
//         break;
//     }

//     // Return a 200 OK fast to protect remote subscription validation
//     return NextResponse.json({ success: true });
    
//   } catch (error) {
//     console.error("[Webhook Router Error] Execution crashed:", error);
    
//     // Always acknowledge with status 200 to prevent inFlow from disabling the webhook
//     return NextResponse.json(
//       { 
//         success: false, 
//         error: error instanceof Error ? error.message : "Internal pipeline failure" 
//       }, 
//       { status: 200 }
//     );
//   }
// }

// export async function GET() {
//   try {
//     const data = await listWebhooks();
//     return NextResponse.json({ success: true, message: "Connected to inFlow Cloud", data });
//   } catch (error) {
//     return NextResponse.json(
//       { success: false, error: error instanceof Error ? error.message : "Unknown error" },
//       { status: 500 }
//     );
//   }
// }