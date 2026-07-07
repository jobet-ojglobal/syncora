// lib/queues/test-sync.queue.ts
// import { Queue } from "bullmq";
// import { connection } from "@/lib/redis";

// export const testSyncQueue = new Queue("test-sync", {
//   connection: connection,
// });

import { Queue } from "bullmq";
import { connection } from "@/lib/redis";

let testSyncQueue: Queue | null = null;

export const getTestSyncQueue = () => {
  if (!testSyncQueue) {
    testSyncQueue = new Queue("test-sync", { connection });
  }
  return testSyncQueue;
};