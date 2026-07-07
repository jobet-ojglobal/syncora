import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSyncQueue } from "@/lib/queues/sync.queue";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { source } = body;

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
    const job = await getSyncQueue().add(
      "sync",
      { 
        jobId: syncJob.id,
        source, 
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

    if (!jobId) {
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
    }

    const syncJob = await prisma.syncJob.findUnique({
      where: { id: jobId },
    });

    if (!syncJob) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // console.log("API returning:", syncJob?.progress);

    return NextResponse.json(syncJob);
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch job status" },
      { status: 500 }
    );
  }
}
