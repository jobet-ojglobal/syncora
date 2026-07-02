// app/api/webhooks/partner/route.ts
import { prisma } from "@/lib/prisma";
import { partnerSyncQueue } from "@/lib/queues/sync.queue";
import { listWebhooks } from "@/lib/partner/services/webhook.service";
import { NextRequest, NextResponse } from "next/server";
import { partnerApi } from "@/lib/partner/partner.client";
import { upsertSalesOrder } from "@/lib/inflow/data/sales-orders";
import { getSalesOrder } from "@/lib/partner/data/sales-order";

/**
 * GET Handler: Verification endpoint used to prove connectivity 
 * to the remote partner application.
 */
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

/**
 * POST Handler: Real-time webhook ingestion endpoint.
 * Immediately logs the transaction and pushes it to a background worker queue.
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const eventType = payload.eventType || payload.action || "unknown";

    // 1. Create audit trail log row immediately for traceability
    const loggedEvent = await prisma.partnerWebhookEvent.create({
      data: {
        eventType,
        payload: payload as any,
      },
    });

    // 2. Delegate data operations based on event type classifications
    switch (eventType) {
      case "SalesOrderCreated":
      case "SalesOrderUpdated": {
        const batchID = payload.batch_id;

        if (batchID) {
          // const sales = await getSalesOrder(batchID);
          // const up = await upsertSalesOrder(sales);

          // await partnerApi.post("/transactions/sales/cloud-ack", {
          //   batch_id: batchID,
          //   outbound_audit_id: payload.outboundAuditId,
          //   cloud_status: "SUCCESS",
          //   message: "Processed successfully via dedicated partner worker queue",
          // });

          // return NextResponse.json({ received: true, data: up }, { status: 200 });

          // 
          // Offload the sync processing to the dedicated background worker queue
          // await partnerSyncQueue.add(
          //   "sales_sync_job",
          //   {
          //     source: "inflow_sales_order",
          //     action: eventType === "SalesOrderCreated" ? "create" : "update",
          //     dataId: batchID,
          //     loggedEventId: loggedEvent.id,
          //     outboundAuditId: payload.outboundAuditId,
          //   },
          //   {
          //     attempts: 3,
          //     backoff: {
          //       type: "exponential",
          //       delay: 2000, // Wait 2s, then 4s, then 8s on failure
          //     },
          //   }
          // );
        }
        break;
      }

      case "CustomerCreated":
      case "CustomerUpdated": {
        const batchID = payload.batch_id;

        if (batchID) {
          // Offload the sync processing to the dedicated background worker queue
          await partnerSyncQueue.add(
            "customer_sync_job",
            {
              source: "inflow_customer",
              action: eventType === "CustomerCreated" ? "create" : "update",
              dataId: batchID,
              loggedEventId: loggedEvent.id,
              outboundAuditId: payload.outboundAuditId,
              eventType,
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
    // This prevents external partner systems (like inFlow) from disabling the webhook webhook webhook link.
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal pipeline failure",
      },
      { status: 200 }
    );
  }
}