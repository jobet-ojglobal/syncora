// app/api/sync/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSyncQueue } from "@/lib/queues/sync.queue";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { source, includes, locationIds, locationId, selectedRecords, syncedAll, after, brandCustomName } = body;

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

    let location = null;

    if(locationId) {
      location = await prisma.location.findUnique({
        where:  { id: locationId },
        select: { inflowId: true, url: true, name: true }
      });
    }

    // Add job to queue
    await getSyncQueue().add(
      "sync",
      { 
        jobId: syncJob.id,
        source, 
        location,
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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const jobId = searchParams.get("jobId");
    const source = searchParams.get("source");

    // Scenario A: Check for existing active/in-progress job for a specific source
    if (source) {
      const activeJob = await prisma.syncJob.findFirst({
        where: {
          source,
          status: { in: ["pending", "processing", "retrying"] },
        },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json({ activeJob }, {
        headers: { "Cache-Control": "no-store" },
      });
    }

    // Scenario B: Query specific job status by jobId
    if (jobId) {
      const syncJob = await prisma.syncJob.findUnique({
        where: { id: jobId },
      });

      if (!syncJob) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }

      return NextResponse.json(syncJob, {
        headers: { "Cache-Control": "no-store" },
      });
    }

    // Default overview response
    const queueCount = await getSyncQueue().count();
    const pendingJobs = await prisma.syncJob.findMany({
      where: { status: "pending" },
      take: 10,
    });
    
    return NextResponse.json({
      queued: queueCount,
      pending: pendingJobs,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch job status" },
      { status: 500 }
    );
  }
}

// export async function GET(request: NextRequest) {
//   try {
//     const searchParams = request.nextUrl.searchParams;
//     const jobId = searchParams.get("jobId");
    

//     if (!jobId) {
//       const queueCount = await getSyncQueue().count();
//       const pendingJobs = await prisma.syncJob.findMany({
//         where: { status: "pending" },
//         take: 10,
//       });
      
//       return NextResponse.json({
//         queued: queueCount,
//         pending: pendingJobs,
//         timestamp: new Date().toISOString(),
//       });
//     }

//     const syncJob = await prisma.syncJob.findUnique({
//       where: { id: jobId },
//     });

//     if (!syncJob) {
//       return NextResponse.json({ error: "Job not found" }, { status: 404 });
//     }

//     return NextResponse.json(syncJob, {
//       headers: {
//         "Cache-Control": "no-store",
//       },
//     });
//   } catch (error) {
//     console.error("API error:", error);
//     return NextResponse.json(
//       { error: "Failed to fetch job status" },
//       { status: 500 }
//     );
//   }
// }
