// app/api/settings/webhooks/locations/logs/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("locationId");
    const eventType = searchParams.get("eventType") || "";
    const page = parseInt(searchParams.get("page") || "0", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    if (!locationId) {
      return NextResponse.json({ success: false, error: "Missing locationId context" }, { status: 400 });
    }

    // Resolve structural schema mapping index parameters safely
    const location = await prisma.location.findUnique({
      where: { id: locationId },
      select: { inflowId: true }
    });

    if (!location) {
      return NextResponse.json({ success: false, error: "Location reference instance not found." }, { status: 404 });
    }

    const skip = page * limit;

    // Build the query where clause
    const whereClause: any = {
      webhook: {
        locationId: location.inflowId,
      },
    };

    if (eventType) {
      whereClause.eventType = eventType;
    }

    // Execute concurrently using Prisma transaction pipeline
    const [logs, totalRecords] = await prisma.$transaction([
      prisma.locationWebhookEvent.findMany({
        where: whereClause,
        orderBy: { receivedAt: "desc" },
        skip: skip,
        take: limit,
      }),
      prisma.locationWebhookEvent.count({
        where: whereClause,
      })
    ]);

    const pageCount = Math.ceil(totalRecords / limit);

    return NextResponse.json({
      success: true,
      data: logs,
      totalRecords,
      pageCount
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal operational cluster exception." },
      { status: 500 }
    );
  }
}


// // app/api/settings/webhooks/locations/logs/route.ts
// import { NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";

// export async function GET(request: Request) {
//   try {
//     const { searchParams } = new URL(request.url);
//     const locationId = searchParams.get("locationId"); // Inflow ID passed from client context

//     if (!locationId) {
//       return NextResponse.json({ success: false, error: "Missing locationId context" }, { status: 400 });
//     }

//     const location = await prisma.location.findUnique({
//       where: { id: locationId },
//       select: { inflowId: true }
//     })

//     if (!location) {
//       return NextResponse.json({ success: false, error: "Location not found." }, { status: 404 });
//     }

//     // Pull events linked to the specific webhooks active on this location channel
//     const logs = await prisma.locationWebhookEvent.findMany({
//       where: {
//         webhook: {
//           locationId: location.inflowId,
//         },
//       },
//       orderBy: {
//         receivedAt: "desc",
//       },
//       take: 50, // Limits payload impact
//     });

//     return NextResponse.json({ success: true, logs });
//   } catch (error) {
//     return NextResponse.json(
//       { success: false, error: error instanceof Error ? error.message : "Failed to fetch logs" },
//       { status: 500 }
//     );
//   }
// }