// app/api/sync/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSyncQueue } from "@/lib/queues/sync.queue";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { source, includes, locationIds, selectedRecords, syncedAll, after, brandCustomName } = body;

    if (!source) {
      return NextResponse.json(
        { error: "source parameter required" },
        { status: 400 }
      );
    }

    // Create sync job in database
    const syncJob = await prisma.syncJob.create({
      data: {
        source,
        status: "pending",
      },
    });

    // Add job to queue
    await getSyncQueue().add(
      "sync",
      { 
        jobId: syncJob.id,
        source, 
        location: null,
        includes: includes || locationIds || [],
        selectedRecords: selectedRecords || [],
        syncedAll,
        brandCustomName,
        after,
        timestamp: new Date().toISOString() 
      },
      { attempts: 3, backoff: { type: "exponential", delay: 2000 } }
    );

    return NextResponse.json({
      success: true,
      jobId: syncJob.id,
      message: `Sync job queued for source: ${source}`,
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Failed to queue sync job" },
      { status: 500 }
    );
  }
}
