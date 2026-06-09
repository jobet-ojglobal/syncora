// // app/api/inflow/route.ts

// import { NextResponse } from "next/server";
// import { 
//   connectIntegration, 
//   disconnectIntegration, 
//   triggerManualSync, 
// } from "@/actions/inflow";
// import { updateWebhook, syncWebhooks, InflowEvent } from "@/lib/inflow/services/webhook.service";

// export async function POST(request: Request) {
//   try {
//     const body = await request.json();
//     const { action, webhookId, currentEvents, targetEvent } = body;

//     // 1. Connection Initializer
//     if (action === "connect") {
//       const res = await connectIntegration();
//       return NextResponse.json(res);
//     }

//     // 2. Teardown Disconnect
//     if (action === "disconnect") {
//       const res = await disconnectIntegration(webhookId);
//       return NextResponse.json(res);
//     }

//     // 3. Manual Upstream State Cache Refresh
//     if (action === "sync") {
//       const res = await triggerManualSync();
//       return NextResponse.json(res);
//     }

//     // 4. Granular Event Toggle Mutator
//     if (action === "toggle-event") {
//       if (!webhookId || !currentEvents || !targetEvent) {
//         return NextResponse.json({ success: false, error: "Missing toggle payloads." }, { status: 400 });
//       }

//       const nextEvents = currentEvents.includes(targetEvent)
//         ? currentEvents.filter((e: InflowEvent) => e !== targetEvent)
//         : [...currentEvents, targetEvent];

//       // Push subscription adjustments upstream to the inFlow API
//       await updateWebhook(webhookId, nextEvents);
      
//       // Update local state database caches
//       await syncWebhooks();

//       return NextResponse.json({ success: true });
//     }

//     return NextResponse.json({ success: false, error: "Malformed action payload." }, { status: 400 });
//   } catch (error: any) {
//     console.error("API Gateway execution error:", error);
//     return NextResponse.json(
//       { success: false, error: error.message || "Internal server pipe error." }, 
//       { status: 500 }
//     );
//   }
// }