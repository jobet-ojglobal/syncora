// lib/queues/test-sync.queue.ts
import { Queue } from "bullmq";
import { connection } from "@/lib/redis";

export const testSyncQueue = new Queue("test-sync", {
  connection: connection,
});