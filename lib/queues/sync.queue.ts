// lib/queues/sync.queue.ts
import { Queue } from "bullmq";
import { connection } from "@/lib/redis";

export const syncQueue = new Queue("sync", {
  connection: connection,
});

export const midSyncQueue = new Queue("mid_sync", {
  connection: connection,
});

export const cloudSyncQueue = new Queue("cloud_sync", {
  connection: connection,
});

export const partnerSyncQueue = new Queue("partner_sync", {
  connection: connection,
});