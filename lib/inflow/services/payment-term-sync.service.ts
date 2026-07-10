import { getPaymentTerms } from "../data/payment-terms";
import { upsertPaymentTerm } from "./payment-term.sync";

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
      
      // Call our isolated, reusable single-sync function
      await upsertPaymentTerm(term);

      processed++;

      // Trigger the optional progress callback hook
      if (options?.onProgress) {
        await options.onProgress(Math.round((processed / total) * 100));
      }
    }

    return {
      reasonsProcessed: processed,
      syncedAt: new Date().toISOString(),
    };
  }
}

// import { prisma } from "@/lib/prisma";
// import { getPaymentTerms } from "../data/payment-terms";

// type SyncOptions = {
//   onProgress?: (progress: number) => Promise<void>;
// };

// export class PaymentTermSyncService {
//   async sync(options?: SyncOptions) {
//     const terms = await getPaymentTerms();

//     let processed = 0;
//     const total = terms.length;

//     for (let i = 0; i < total; i++) {
//       const term = terms[i];
//       await prisma.$transaction(async (tx) => {
//         await tx.paymentTerm.upsert({
//           where: {
//               inflowId: term.paymentTermsId,
//           },
//           create: {
//               inflowId: term.paymentTermsId,
//               name: term.name,
//               daysDue: term.daysDue,
//               isActive: term.isActive,
//           },
//           update: {
//               name: term.name,
//               daysDue: term.daysDue,
//               isActive: term.isActive,
//           },
//         });
//       });

//       processed++;

//       await options?.onProgress?.(
//         Math.round((processed / total) * 100)
//       );
//     }

//     return {
//       reasonsProcessed: processed,
//       syncedAt: new Date().toISOString(),
//     };
//   }
// }