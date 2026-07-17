import { getMidSyncQueue } from './sync.queue';
import { SplitSyncPayloads } from '@/helpers/businessPartnerSplitPayload'; // Adjust imports accordingly

/**
 * Dispatches distinct sub-payloads to the sync queue for both Customer and Vendor profiles.
 */

export class CloudSyncDispatcher {
  static async dispatchSplitBusinessPartnerSyncJobs(splitPayloads: SplitSyncPayloads) {
    const queue = getMidSyncQueue();
    const timestamp = new Date().toISOString();
    
    // Define default queue policies to avoid repetitive configuration objects
    const queueOptions = {
      attempts: 3,
      backoff: { type: "exponential" as const, delay: 2000 },
      removeOnComplete: true
    };

    const syncPromises: Promise<any>[] = [];

    // 1. Dispatch Customer payload if active
    if (splitPayloads.customer) {
      syncPromises.push(
        queue.add(
          "business_partner_cloudsync_job",
          {
            source: "BUSINESS_PARTNER_UPSERT_CLOUD",
            model: "Customer", // Explicit sub-model naming aids consumer routing
            payload: splitPayloads.customer,
            timestamp,
          },
          queueOptions
        )
      );
    }

    // 2. Dispatch Vendor payload if active
    if (splitPayloads.vendor) {
      syncPromises.push(
        queue.add(
          "business_partner_cloudsync_job",
          {
            source: "BUSINESS_PARTNER_UPSERT_CLOUD",
            model: "Vendor", // Explicit sub-model naming aids consumer routing
            payload: splitPayloads.vendor,
            timestamp,
          },
          queueOptions
        )
      );
    }

    // Execute jobs in parallel to avoid locking the event loop sequentially
    if (syncPromises.length > 0) {
      await Promise.all(syncPromises);
    }
  }
}