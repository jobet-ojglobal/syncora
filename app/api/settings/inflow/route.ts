// app/api/settings/inflow/route.ts
import { NextResponse } from "next/server";
import { 
  findInflowWebhook, 
  createOrUpdateInflowWebhook, 
  deleteInflowWebhook 
} from "@/lib/inflow/webhooks/webhook-setting.service";
import { InflowEvent } from "@/lib/inflow/types/inflow";

// GET /api/settings/inflow -> Fetch status
export async function GET() {
  try {
    const webhook = await findInflowWebhook();
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
      const defaultEvents: InflowEvent[] = ["product.updated", "salesOrder.updated"];
      const webhook = await createOrUpdateInflowWebhook(defaultEvents);
      return NextResponse.json({ success: true, webhook });
    }

    if (action === "disconnect") {
      if (!webhookId) {
        const current = await findInflowWebhook();
        if (current) await deleteInflowWebhook(current.webHookSubscriptionId);
      } else {
        await deleteInflowWebhook(webhookId);
      }
      return NextResponse.json({ success: true });
    }

    if (action === "update_events") {
      if (!events) throw new Error("Missing events array");
      const webhook = await createOrUpdateInflowWebhook(events);
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


// POST /api/settings/inflow -> Connect, Disconnect, or Update Events
// export async function POST(request: Request) {
//   try {
//     const body = await request.json();
//     const { action, webhookId, events } = body;

//     if (action === "connect") {
//       const defaultEvents: InflowEvent[] = ["customer.created", "customer.updated", "product.updated", "salesOrder.updated"];
//       const webhook = await createOrUpdateInflowWebhook(defaultEvents);
//       return NextResponse.json({ success: true, webhook });
//     }

//     if (action === "disconnect") {
//       // Logic for disconnect
//       if (!webhookId) {
//         // Fallback: If no ID provided, try to find the current one automatically
//         const current = await findInflowWebhook();
//         if (current) {
//           await deleteInflowWebhook(current.webHookSubscriptionId);
//         }
//       } else {
//         await deleteInflowWebhook(webhookId);
//       }
//       return NextResponse.json({ success: true }); // Always return a valid JSON object
//     }

//     if (action === "update_events") {
//       if (!events) throw new Error("Missing events array");
      
//       const webhook = await createOrUpdateInflowWebhook(events);
//       return NextResponse.json({ success: true, webhook });
//     }

//     return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
//   } catch (error) {
//     return NextResponse.json(
//       { success: false, error: error instanceof Error ? error.message : "Mutation failed" },
//       { status: 500 }
//     );
//   }
// }