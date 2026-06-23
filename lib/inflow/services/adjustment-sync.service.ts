import { prisma } from "@/lib/prisma";
import { getAdjustmentReasons } from "../data/adjustment-reasons";

type SyncOptions = {
  onProgress?: (progress: number) => Promise<void>;
};

export class AdjustmentReasonSyncService {
  async sync(options?: SyncOptions) {
    const reasons = await getAdjustmentReasons();

    let processed = 0;
    const total = reasons.length;

    for (let i = 0; i < total; i++) {
      const reason = reasons[i];
      await prisma.$transaction(async (tx) => {
        await tx.adjustmentReason.upsert({
            where: {
                inflowId:
                reason.adjustmentReasonId,
            },
            create: {
                inflowId:
                reason.adjustmentReasonId,
                name: reason.name,
                isActive: reason.isActive,
                isInternal: reason.isInternal,
            },
            update: {
                name: reason.name,
                isActive: reason.isActive,
                isInternal: reason.isInternal,
            },
        });
      });

      processed++;

      await options?.onProgress?.(
        Math.round((processed / total) * 100)
      );
    }

    return {
      reasonsProcessed: processed,
      syncedAt: new Date().toISOString(),
    };
  }
}