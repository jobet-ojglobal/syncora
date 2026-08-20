// app/api/sync/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLocalSyncQueue } from "@/lib/queues/sync.queue";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { locationId, source, includes, locationIds, sublocationIds, selectedRecords, syncedAll, after, brandCustomName } = body;

    if (!source || !locationId) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const location = await prisma.location.findUnique({
      where: { id: locationId },
      select: { url: true, name: true, inflowId: true }
    });

    if (!location?.url) {
      return NextResponse.json({ error: "Location endpoint URL not configured" }, { status: 400 });
    }

    // Create sync job in database
    const syncJob = await prisma.syncJob.create({
      data: {
        source,
        status: "pending",
      },
    });

    // Add job to queue
    await getLocalSyncQueue().add(
      "local_sync",
      { 
        jobId: syncJob.id,
        source, 
        location,
        includes: includes || [],
        selectedLocations: locationIds || [],
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
