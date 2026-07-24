// services/sync/products/pricing-scheme-sync.service.ts
import { prisma } from "@/lib/prisma";
import { getPricingSchemes } from "../data/pricing-schemes";
import { syncPricingScheme } from "./pricing-scheme.sync";

type SyncOptions = {
  onProgress?: (processedCount: number) => Promise<void>;
  batchSize?: number;
};

export class PricingSchemeSyncService {
  async sync(options?: SyncOptions) {
    const BATCH_SIZE = options?.batchSize || 50; // Deep payloads; 50 balancing stability & roundtrips
    
    // Caches preserved across multiple pagination batches to maximize execution speed
    const caches = {
      verifiedCurrencyIds: new Set<string>(),
    };

    let after: string | undefined = undefined;
    let totalProcessed = 0;
    
    console.log("Starting hyper-optimized batched pricing scheme sync...");

    while (true) {
      // 1. Fetch the paginated batch
      const batch = await getPricingSchemes(BATCH_SIZE, after);
      if (!batch || batch.length === 0) break;

      // 2. Wrap the chunk operations in a discrete database transaction block
      try {
        await prisma.$transaction(async (tx) => {
          for (const scheme of batch) {
            await syncPricingScheme(tx, scheme, caches);
          }
        }, {
          timeout: 40000 
        });
      } catch (transactionError) {
        console.error(`Transaction failed for pricing batch ending with ID ${after}:`, transactionError);
      }

      // 3. Move pagination variables forward
      after = batch[batch.length - 1].pricingSchemeId;
      totalProcessed += batch.length;
      
      if (options?.onProgress) {
        await options.onProgress(totalProcessed);
      }
    }

    return {
      pricingSchemesProcessed: totalProcessed,
      syncedAt: new Date().toISOString(),
    };
  }
}