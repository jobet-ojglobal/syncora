// app\api\sync\clear\route.ts
import { getMidSyncQueue } from "@/lib/queues/sync.queue";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const queue = getMidSyncQueue();

    // 1. Pause queue so no new jobs start executing
    await queue.pause();

    // 2. Remove waiting, delayed, and active jobs
    await queue.drain(); // Removes all waiting jobs
    await queue.clean(0, 0, "active"); // Removes active jobs
    await queue.clean(0, 0, "delayed"); // Removes delayed jobs

    // 3. Resume queue so it can process future jobs normally
    await queue.resume();

    return NextResponse.json({
      success: true,
      message: "All pending and active sync jobs have been cancelled.",
    });
  } catch (error: any) {
    console.error("[QUEUE_CANCEL_ERROR]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}