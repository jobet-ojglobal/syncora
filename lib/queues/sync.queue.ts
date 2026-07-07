// lib/queues/sync.queue.ts
import { Queue } from "bullmq";
import { connection } from "@/lib/redis";

let syncQueue: Queue | null = null;

export const getSyncQueue = () => {
  if (!syncQueue) {
    syncQueue = new Queue("sync", { connection });
  }
  return syncQueue;
};

let midSyncQueue: Queue | null = null;

export const getMidSyncQueue = () => {
  if (!midSyncQueue) {
    midSyncQueue = new Queue("mid_sync", { connection });
  }
  return midSyncQueue;
};

let cloudSyncQueue: Queue | null = null;

export const getCloudSyncQueue = () => {
  if (!cloudSyncQueue) {
    cloudSyncQueue = new Queue("cloud_sync", { connection });
  }
  return cloudSyncQueue;
};

let partnerSyncQueue: Queue | null = null;

export const getPartnerSyncQueue = () => {
  if (!partnerSyncQueue) {
    partnerSyncQueue = new Queue("partner_sync", { connection });
  }
  return partnerSyncQueue;
};

// Do the same for midSyncQueue, cloudSyncQueue, etc.

// export const midSyncQueue = new Queue("mid_sync", {
//   connection: connection,
// });

// export const cloudSyncQueue = new Queue("cloud_sync", {
//   connection: connection,
// });

// export const partnerSyncQueue = new Queue("partner_sync", {
//   connection: connection,
// });