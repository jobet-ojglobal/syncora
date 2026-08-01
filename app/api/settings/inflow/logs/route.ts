// app/api/settings/inflow/logs/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventType = searchParams.get("eventType") || "";
    const page = parseInt(searchParams.get("page") || "0", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    const skip = page * limit;

    // Build the query where clause
    const whereClause: any = {};

    if (eventType) {
      whereClause.eventType = eventType;
    }

    // Execute concurrently using Prisma transaction pipeline
    const [logs, totalRecords] = await prisma.$transaction([
      prisma.inflowWebhookEvent.findMany({
        where: whereClause,
        orderBy: { receivedAt: "desc" },
        skip: skip,
        take: limit,
      }),
      prisma.inflowWebhookEvent.count({
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

// // app/api/settings/inflow/logs/route.ts
// import { prisma } from "@/lib/prisma";
// import { NextResponse } from "next/server";

// export async function GET() {
//   try {
//     const logs = await prisma.inflowWebhookEvent.findMany({
//       take: 50,
//       orderBy: {
//         receivedAt: "desc",
//       },
//     });

//     return NextResponse.json({ success: true, logs });
//   } catch (error) {
//     return NextResponse.json(
//       { 
//         success: false, 
//         error: error instanceof Error ? error.message : "Failed to fetch logs" 
//       },
//       { status: 500 }
//     );
//   }
// }