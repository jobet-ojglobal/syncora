import { prisma } from "@/lib/prisma";
import { getPaymentTerms } from "../data/payment-terms";

type SyncOptions = {
  onProgress?: (progress: number) => Promise<void>;
};

export class PaymentTermSyncService {
  async sync(options?: SyncOptions) {
    const terms = await getPaymentTerms();

    let processed = 0;
    const total = terms.length;

    for (let i = 0; i < total; i++) {
      const term = terms[i];
      await prisma.$transaction(async (tx) => {
        await tx.paymentTerms.upsert({
          where: {
              inflowId: term.paymentTermsId,
          },
          create: {
              inflowId: term.paymentTermsId,
              name: term.name,
              daysDue: term.daysDue,
              isActive: term.isActive,
          },
          update: {
              name: term.name,
              daysDue: term.daysDue,
              isActive: term.isActive,
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