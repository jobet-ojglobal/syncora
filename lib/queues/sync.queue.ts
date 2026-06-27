// lib/queues/sync.queue.ts
import { Queue } from "bullmq";
import { connection } from "@/lib/redis";

export const syncQueue = new Queue("sync", {
  connection: connection,
});

export const syncPartnerQueue = new Queue("partner_sync", {
  connection: connection,
});