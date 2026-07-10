import { getPricingSchemes } from "../data/pricing-schemes"; // Adjust import path to your data source
import { upsertPricingScheme } from "./pricing-scheme-only.sync";

type SyncOptions = {
  onProgress?: (processedCount: number) => Promise<void>;
};

export class PricingSchemeSyncService {
  async sync(options?: SyncOptions) {
    const schemes = await getPricingSchemes();
    let processed = 0;
    const total = schemes.length;

    for (let i = 0; i < total; i++) {
      const scheme = schemes[i];
      
      await upsertPricingScheme(scheme);

      processed++;

      // Safely propagate linear counter metrics to progress tracker hooks
      if (options?.onProgress) {
        await options.onProgress(processed);
      }
    }

    return {
      pricingSchemesProcessed: processed,
      syncedAt: new Date().toISOString(),
    };
  }
}