import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSyncQueue } from "@/lib/queues/sync.queue";

export async function POST(request: NextRequest) {
  try {
    const { jobId } = await request.json();

    if (!jobId) {
      return NextResponse.json({ error: "jobId is required" }, { status: 400 });
    }

    const queue = getSyncQueue();

    // 1. Get job by BullMQ Job ID directly, or search across queue states
    let targetJob = await queue.getJob(jobId);

    if (!targetJob) {
      const jobs = await queue.getJobs(["active", "waiting", "delayed", "prioritized"]);
      targetJob = jobs.find((j) => j.data?.jobId === jobId);
    }

    if (targetJob) {
      const state = await targetJob.getState();

      if (state === "waiting" || state === "delayed") {
        // Safe to discard retries and remove queued/delayed jobs directly
        await targetJob.discard();
        await targetJob.remove();
      } else if (state === "active") {
        // Active jobs cannot be removed directly.
        // Option A: Move to failed state so worker logic can abort gracefully
        await targetJob.moveToFailed(
          new Error("Job manually cancelled by user."),
          targetJob.token || "cancel-token",
          true
        );
      }
    }

    // 2. Update Database State cleanly
    const updatedSyncJob = await prisma.syncJob.update({
      where: { id: jobId },
      data: {
        status: "cancelled",
        error: "Job was manually cancelled by user.",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Job cancelled successfully.",
      data: updatedSyncJob,
    });
  } catch (error) {
    console.error("Cancel job error:", error);

    // Prevent crashing if Prisma fails due to non-existent record
    if (error instanceof Error && error.message.includes("Record to update not found")) {
      return NextResponse.json({ error: "Sync job not found in database." }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Failed to cancel job", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}