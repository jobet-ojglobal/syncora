// app/api/webhooks/locations/route.ts
import { prisma } from "@/lib/prisma";
import { getLocationSyncQueue } from "@/lib/queues/sync.queue";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET Handler: Verification endpoint used to prove connectivity 
 * to the remote partner application.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("locationId");

    if (!locationId) {
      return NextResponse.json({ success: false, error: "Missing locationId query parameter" }, { status: 400 });
    }

    // Fetch the specific webhook registration for this location
    const webhookConfig = await prisma.locationWebhook.findFirst({
      where: { locationId },
    });

    return NextResponse.json({ 
      success: true, 
      message: `Connected to Webhook Receiver for Location: ${locationId}`, 
      activeLocalSubscription: webhookConfig ?? "No local config found" 
    });
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
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("locationId"); // maps to inflowId

    if (!locationId) {
      throw new Error("Missing locationId identification parameter context.");
    }

    const payload = await request.json();
    const eventType = payload.eventType || payload.action || "unknown";

    // 1. Fetch the exact webhook record to satisfy the DB foreign key constraint
    const webhookParent = await prisma.locationWebhook.findFirst({
      where: { locationId },
      select: { id: true }
    });

    if (!webhookParent) {
      throw new Error(`No LocationWebhook configuration initialized for locationId: ${locationId}`);
    }

    // 2. Create audit trail log matching your exact Prisma model: "LocationWebhookEvent"
    const loggedEvent = await prisma.locationWebhookEvent.create({
      data: {
        locationWebhookId: webhookParent.id, // linked safely to parent subscription setup
        eventType,
        payload: payload as any,
        processed: false,
      },
    });

    // 3. Delegate data operations based on event type classifications
    switch (eventType) {
      case "locationLocal": {
        const batchID = payload.batch_id || payload.source_key;

        if (batchID) {
          // Offload the sync processing to the dedicated background worker queue
          await getLocationSyncQueue().add(
            "location_sync_job",
            {
              source: eventType,
              loggedEventId: loggedEvent.id,
              dataId: payload.inflowId || batchID,
              locationId, 
              data: { locationId: batchID }
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
      case "currencyLocal": {
        const currencyId = payload.source_key;

        if (currencyId) {
          // Offload the sync processing to the dedicated background worker queue
          await getLocationSyncQueue().add(
            "currency_sync_job",
            {
              source: eventType,
              loggedEventId: loggedEvent.id,
              dataId: payload.inflowId,
              locationId, 
              data: { currencyId }
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

      

      case "taxingSchemeLocal": {
        const taxingSchemeId = payload.source_key;

        if (taxingSchemeId) {
          // Offload the sync processing to the dedicated background worker queue
          await getLocationSyncQueue().add(
            "taxing_scheme_sync_job",
            {
              source: eventType,
              loggedEventId: loggedEvent.id,
              dataId: payload.inflowId,
              locationId, 
              data: { taxingSchemeId }
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

      case "salesOrder": {
        const batchID = payload.batch_id;

        if (batchID) {
          await getLocationSyncQueue().add(
            "sales_order_sync_job",
            {
              source: eventType,
              loggedEventId: loggedEvent.id,
              dataId: batchID,
              locationId, 
            },
            {
              attempts: 3,
              backoff: { type: "exponential", delay: 2000 },
            }
          );
        }
        break;
      }

      case "customer":
      case "customerLocal": {
        const batchID = payload.batch_id || payload.source_key;

        if (batchID) {
          // Offload the sync processing to the dedicated background worker queue
          await getLocationSyncQueue().add(
            "customer_sync_job",
            {
              source: eventType,
              loggedEventId: loggedEvent.id,
              dataId: payload.inflowId || batchID,
              locationId, 
              data: { customerId: batchID }
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

      case "categoryLocal": {
        const batchID = payload.batch_id || payload.source_key;

        if (batchID) {
          // Offload the sync processing to the dedicated background worker queue
          await getLocationSyncQueue().add(
            "category_sync_job",
            {
              source: eventType,
              loggedEventId: loggedEvent.id,
              dataId: payload.inflowId || batchID,
              locationId, 
              data: { categoryId: batchID }
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
        console.log(`[Webhook Router] Unhandled webhook event classification: ${eventType} for Location: ${locationId}`);
        break;
    }

    // 4. Return a 200 OK lightning fast to protect remote subscription validation
    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error) {
    console.error("[Webhook Router Error] Pipeline execution crashed:", error);

    // CRITICAL: Always acknowledge with status 200 during ingestion failures.
    // This prevents external partner systems from automatically disabling the endpoint hook.
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal pipeline failure",
      },
      { status: 200 }
    );
  }
}