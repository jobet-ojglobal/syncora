// lib/locations/services/payment-term-sync-map.service.ts
import { prisma } from "@/lib/prisma";
import { getPaymentTerms } from "../data/payment-term"; 
import { paymentTermSync } from "@/lib/inflow/services/payment-term.sync";
import crypto from "crypto";

type SyncOptions = {
  onProgress?: (processedCount: number) => Promise<void>;
};

export class PaymentTermSyncMapService {
  async sync(
    location: {
      inflowId: string;
      name: string;
      url: string;
    },
    options: SyncOptions,
    selectedRecords?: any[]
  ) {
    const { onProgress } = options;
    
    // Fetch payment terms from the location endpoint
    let paymentTerms = await getPaymentTerms(location.url);
    
    if (selectedRecords && selectedRecords.length > 0) {
      const allowedIds = selectedRecords.map(item => String(item.id));
      paymentTerms = paymentTerms.filter((data: any) => 
        allowedIds.includes(String(data.paymentTermId))
      );
    }

    let processed = 0;

    const syncResults: Array<{
      paymentTermInflowId: string;
      localPaymentTermId?: number;
      status: "synced" | "skipped_not_found";
    }> = [];

    await prisma.$transaction(
      async (tx) => {
        /**
         * Step 1: Query global availability by name, or upsert inline using transaction client
         */
        const existingPaymentTerms = await Promise.all(
          paymentTerms.map(async (term) => {
            // Find a global payment term that matches the name exactly
            let match = await tx.paymentTerm.findFirst({
              where: { name: term.name },
              select: { inflowId: true },
            });

            if (!match) {
              const generatedInflowId = crypto.randomUUID().toLowerCase();

              const payload = {
                // Ensure field aligns cleanly to what upsertPaymentTerm expects
                paymentTermsId: generatedInflowId, 
                name: term.name,
                daysDue: term.daysDue,
                isActive: Number(term.isActive) === 1,
                timestamp: term.timestamp
              };

              // Pass the transaction client context down to avoid connection fragmentation
              match = await paymentTermSync(tx, payload);
            }

            return { incoming: term, existing: match };
          })
        );

        // Filter down to only payment terms that exist globally
        const validPaymentTerms = existingPaymentTerms.filter((pt) => pt.existing !== null);

        /**
         * Step 2: Bridge connection inside PaymentTermLocationMap
         */
        const mappingPromises = validPaymentTerms.map(async ({ incoming, existing }) => {
          // Check if a mapping record already exists for this location
          let locationMap = await tx.paymentTermLocationMap.findUnique({
            where: {
              paymentTermId_locationId: {
                paymentTermId: existing!.inflowId, 
                locationId: location.inflowId,
              },
            },
            select: { localId: true },
          });

          // CRITICAL FIX: If mapping link doesn't exist, generate the database row
          if (!locationMap) {
            locationMap = await tx.paymentTermLocationMap.create({
              data: {
                paymentTermId: existing!.inflowId,
                locationId: location.inflowId,
                localId: Number(incoming.paymentTermsId),
              },
              select: { localId: true }
            });
          }

          syncResults.push({
            paymentTermInflowId: incoming.paymentTermsId,
            localPaymentTermId: locationMap?.localId,
            status: "synced",
          });
        });

        await Promise.all(mappingPromises);
        processed = validPaymentTerms.length;
      },
      {
        timeout: 30000,
      }
    );

    if (onProgress) {
      await onProgress(processed);
    }

    return {
      paymentTermsProcessed: processed,
      syncedAt: new Date().toISOString(),
      results: syncResults,
    };
  }
}

// // lib/locations/services/payment-term-sync-map.service.ts
// import { prisma } from "@/lib/prisma";
// import { getPaymentTerms } from "../data/payment-term"; // Assuming this handles the data fetching
// import { upsertPaymentTerm } from "@/lib/inflow/services/payment-term.sync";

// type SyncOptions = {
//   onProgress?: (processedCount: number) => Promise<void>;
// };

// export class PaymentTermSyncMapService {
//   async sync(
//     location: {
//       inflowId: string;
//       name: string;
//       url: string;
//     },
//     options: SyncOptions
//   ) {
//     const { onProgress } = options;
    
//     // Fetch payment terms from the location endpoint
//     const paymentTerms = await getPaymentTerms(location.url);
//     let processed = 0;

//     const syncResults: Array<{
//       paymentTermInflowId: string;
//       localPaymentTermId?: number;
//       status: "synced" | "skipped_not_found";
//     }> = [];

//     await prisma.$transaction(
//       async (tx) => {
//         /**
//          * Step 1: Query global availability by name
//          */
//         const existingPaymentTerms = await Promise.all(
//           paymentTerms.map(async (term) => {
//             // Find a global payment term that matches the name exactly
//             const match = await tx.paymentTerm.findFirst({
//               where: { name: term.name },
//               select: { inflowId: true },
//             });

//             let newPayment = null

//             const payload = {
//               paymentTermsId: crypto.randomUUID().toString(),
//               name: term.name,
//               daysDue: term.daysDue,
//               isActive: term.isActive == 1 ? true : false,
//               timestamp: term.timestamp
//             };

//             if(!match) {
//               newPayment = await upsertPaymentTerm(payload);
//             }

//             return { incoming: term, existing: match || newPayment };
//           })
//         );

//         // Filter down to only payment terms that exist globally
//         const validPaymentTerms = existingPaymentTerms.filter((pt) => pt.existing !== null);

//         // Track missing terms for output logs
//         existingPaymentTerms.forEach((pt) => {
//           if (!pt.existing) {
//             syncResults.push({
//               paymentTermInflowId: pt.incoming.paymentTermsId,
//               status: "skipped_not_found",
//             });
//           }
//         });

//         /**
//          * Step 2: Bridge connection inside PaymentTermLocationMap
//          */
//         const mappingPromises = validPaymentTerms.map(async ({ incoming, existing }) => {
//           // Check if a mapping record already exists for this location
//           const locationMap = await tx.paymentTermLocationMap.findUnique({
//             where: {
//               paymentTermId_locationId: {
//                 paymentTermId: existing!.inflowId, // Verified global inflowId
//                 locationId: location.inflowId,
//               },
//             },
//             select: { localId: true },
//           });

//           syncResults.push({
//             paymentTermInflowId: incoming.paymentTermsId,
//             localPaymentTermId: locationMap?.localId,
//             status: "synced",
//           });
//         });

//         await Promise.all(mappingPromises);

//         processed = validPaymentTerms.length;
//       },
//       {
//         timeout: 30000,
//       }
//     );

//     if (onProgress) {
//       await onProgress(processed);
//     }

//     return {
//       paymentTermsProcessed: processed,
//       syncedAt: new Date().toISOString(),
//       results: syncResults,
//     };
//   }
// }