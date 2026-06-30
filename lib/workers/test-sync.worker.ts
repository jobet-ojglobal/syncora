import { Worker } from "bullmq";
import { prisma } from "@/lib/prisma";
import { connection } from "@/lib/redis";

const worker = new Worker(
  "test-sync",
  async (job) => {
    const { jobId, source } = job.data;
    console.log(`\n✓ Processing job ${jobId}:`, source);

    try {
      // Update job status to processing
      await prisma.syncJob.update({
        where: { id: jobId },
        data: { status: "processing", progress: 0 },
      });

      // Simulate sync work with test data
      const syncData = [];
      for (let i = 0; i < 5; i++) {
        syncData.push({
          id: `sync-${jobId}-${i}`,
          source,
          timestamp: new Date(),
          value: Math.random() * 100,
        });
      }

      for (let i = 0; i <= 100; i += 20) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await job.updateProgress(i);

        // Update database with progress
        await prisma.syncJob.update({
          where: { id: jobId },
          data: { progress: i },
        });

        console.log(`Progress: ${i}%`);
      }

      // Mark job as completed and save data
      await prisma.syncJob.update({
        where: { id: jobId },
        data: {
          status: "completed",
          progress: 100,
          data: {
            source,
            itemsProcessed: syncData.length,
            syncedAt: new Date().toISOString(),
            records: syncData,
          },
        },
      });

      console.log(`✓ Job ${jobId} completed for source: ${source}`);

      return {
        success: true,
        source,
        itemsProcessed: syncData.length,
        completedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`✗ Job ${jobId} failed:`, error);

      await prisma.syncJob.update({
        where: { id: jobId },
        data: {
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });

      throw error;
    }
  },
  { connection }
);

worker.on("completed", (job) => {
  console.log(`✓ Job ${job.id} completed and saved to database`);
});

worker.on("failed", (job, err) => {
  console.error(`✗ Job ${job?.id} failed:`, err.message);
});

worker.on("error", (error) => {
  console.error("Worker error:", error);
});

console.log("🚀 Test Worker started. Listening for 'test-sync' jobs...");

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down worker...");
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
});
