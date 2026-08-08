// lib/locations/services/taxing-scheme-sync-map.service.ts
import { getTaxingSchemes } from "@/lib/locations/data/taxing-scheme";
import { upsertTaxingScheme } from "@/lib/inflow/services/taxing-scheme-tax-codes.sync";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

type SyncOptions = {
  onProgress?: (processedCount: number) => Promise<void>;
};

export class TaxingSchemeSyncMapService {
  async sync(
    location: {
      inflowId: string;
      name: string;
      url: string;
    },
    options: SyncOptions,
    selectedRecords?: any[],
    syncedAll?: boolean
  ) {
    const { onProgress } = options;
    
    // Fetch taxing schemes from your source location endpoint
    let taxingSchemes = await getTaxingSchemes(location.url);

    if (!syncedAll && selectedRecords && selectedRecords.length > 0) {
      const allowedIds = selectedRecords.map(item => String(item.id));
      taxingSchemes = taxingSchemes.filter((data: any) => 
        allowedIds.includes(String(data.taxingSchemeId))
      );
    }

    let processed = 0;

    const syncResults: Array<{
      taxingSchemeInflowId: string;
      localTaxingSchemeId?: number;
      status: "synced" | "skipped_not_found";
    }> = [];

    await prisma.$transaction(
      async (tx) => {
        /**
         * Step 1: Query global availability by name, or upsert inline
         */
        const existingSchemes = await Promise.all(
          taxingSchemes.map(async (scheme) => {
            // Find global taxing scheme where name matches exactly
            let match = await tx.taxingScheme.findFirst({
              where: { name: scheme.name },
              select: { inflowId: true },
            });

            let globalDefaultTaxCodeId: string | null = null;

            // Resolve the default tax code dependency if it exists
            if (scheme.defaultTaxCodeId) {
              const depTaxCode = await tx.taxCodeLocationMap.findFirst({
                where: {
                  locationId: location.inflowId,
                  localId: Number(scheme.defaultTaxCodeId),
                },
                select: { taxCodeId: true },
              });
              globalDefaultTaxCodeId = depTaxCode?.taxCodeId || null;
            }

            const isNewScheme = !match;
            const parentInflowId = match?.inflowId || crypto.randomUUID().toLowerCase();

            // Prepare nested child tax codes with resolved global inflow IDs
            const mappedTaxCodes = scheme.taxCodes 
              ? await Promise.all(scheme.taxCodes.map(async (code: any) => {
                  // If updating, find out if this child tax code already exists under this parent by name
                  const codeMatch = !isNewScheme 
                    ? await tx.taxCode.findFirst({
                        where: { name: code.name, taxingSchemeId: parentInflowId },
                        select: { inflowId: true }
                      })
                    : null;

                  return {
                    taxCodeId: codeMatch?.inflowId || crypto.randomUUID().toLowerCase(),
                    name: code.name,
                    isActive: Number(code.isActive) === 1,
                    tax1Rate: code.tax1Rate,
                    tax2Rate: code.tax2Rate,
                    // Keep track of incoming raw localId for mapping in step 2
                    _localId: Number(code.taxCodeId)
                  };
                }))
              : [];

            const payload = {
              taxingSchemeId: parentInflowId,
              name: scheme.name,
              isActive: Number(scheme.isActive) === 1,
              isDefault: false,
              calculateTax2OnTax1: Number(scheme.calculateTax2OnTax1) === 1,
              tax1Name: scheme.tax1Name || null,
              tax1OnShipping: Number(scheme.tax1OnShipping) === 1,
              tax2Name: scheme.tax2Name || null,
              tax2OnShipping: Number(scheme.tax2OnShipping) === 1,
              defaultTaxCodeId: globalDefaultTaxCodeId,
              taxCodes: mappedTaxCodes
            };

            // Process upsert inside transaction scope
            match = await upsertTaxingScheme(tx, payload);

            // Re-apply explicit update if parent was skipped but has a new default dependency context
            if (!isNewScheme && globalDefaultTaxCodeId) {
              await tx.taxingScheme.update({
                where: { inflowId: match.inflowId },
                data: { defaultTaxCodeId: globalDefaultTaxCodeId },
              });
            }

            return { incoming: scheme, existing: match, processedTaxCodes: mappedTaxCodes };
          })
        );

        // Filter down to only taxing schemes successfully resolved or built globally
        const validSchemes = existingSchemes.filter((ts) => ts.existing !== null);

        // Track skipped entries for debugging/auditing
        existingSchemes.forEach((ts) => {
          if (!ts.existing) {
            syncResults.push({
              taxingSchemeInflowId: ts.incoming.taxingSchemeId,
              status: "skipped_not_found",
            });
          }
        });

        /**
         * Step 2: Bridge connection inside TaxingSchemeLocationMap & TaxCodeLocationMap
         */
        for (const { incoming, existing, processedTaxCodes } of validSchemes) {
          // A. Parent Location Mappings
          let schemeMap = await tx.taxingSchemeLocationMap.findUnique({
            where: {
              taxingSchemeId_locationId: {
                taxingSchemeId: existing!.inflowId,
                locationId: location.inflowId,
              },
            },
            select: { localId: true },
          });

          if (!schemeMap) {
            schemeMap = await tx.taxingSchemeLocationMap.create({
              data: {
                taxingSchemeId: existing!.inflowId,
                locationId: location.inflowId,
                localId: Number(incoming.taxingSchemeId),
              },
              select: { localId: true },
            });
          }

          // B. Nested Children Location Mappings
          if (processedTaxCodes && processedTaxCodes.length > 0) {
            await Promise.all(
              processedTaxCodes.map(async (childCode) => {
                const codeMap = await tx.taxCodeLocationMap.findUnique({
                  where: {
                    taxCodeId_locationId: {
                      taxCodeId: childCode.taxCodeId,
                      locationId: location.inflowId,
                    }
                  },
                  select: { localId: true }
                });

                if (!codeMap) {
                  await tx.taxCodeLocationMap.create({
                    data: {
                      taxCodeId: childCode.taxCodeId,
                      locationId: location.inflowId,
                      localId: childCode._localId
                    }
                  });
                }
              })
            );
          }

          syncResults.push({
            taxingSchemeInflowId: incoming.taxingSchemeId,
            localTaxingSchemeId: schemeMap?.localId,
            status: "synced",
          });
        }

        processed = validSchemes.length;
      },
      {
        timeout: 45000, // Augmented timeline buffer for multi-tiered nested child record ingestion
      }
    );

    if (onProgress) {
      await onProgress(processed);
    }

    return {
      taxingSchemesProcessed: processed,
      syncedAt: new Date().toISOString(),
      results: syncResults,
    };
  }
}

// // lib/locations/services/taxing-scheme-sync-map.service.ts
// import { getTaxingSchemes } from "@/lib/locations/data/taxing-scheme";
// import { upsertTaxingScheme } from "@/lib/inflow/services/taxing-scheme-tax-codes.sync";
// import { prisma } from "@/lib/prisma";
// import crypto from "crypto";

// type SyncOptions = {
//   onProgress?: (processedCount: number) => Promise<void>;
// };

// export class TaxingSchemeSyncMapService {
//   async sync(
//     location: {
//       inflowId: string;
//       name: string;
//       url: string;
//     },
//     options: SyncOptions
//   ) {
//     const { onProgress } = options;
    
//     // Fetch taxing schemes from your source location endpoint
//     const taxingSchemes = await getTaxingSchemes(location.url);
//     let processed = 0;

//     const syncResults: Array<{
//       taxingSchemeInflowId: string;
//       localTaxingSchemeId?: number;
//       status: "synced" | "skipped_not_found";
//     }> = [];

//     await prisma.$transaction(
//       async (tx) => {
//         /**
//          * Step 1: Query global availability by name, or upsert inline
//          */
//         const existingSchemes = await Promise.all(
//           taxingSchemes.map(async (scheme) => {
//             // Find global taxing scheme where name matches exactly
//             let match = await tx.taxingScheme.findFirst({
//               where: { name: scheme.name },
//               select: { inflowId: true },
//             });

//             let globalDefaultTaxCodeId: string | null = null;

//             // If the incoming data carries a default local tax code dependency, resolve its global UUID string
//             if (scheme.defaultTaxCodeId) {
//               const depTaxCode = await tx.taxCodeLocationMap.findFirst({
//                 where: {
//                   locationId: location.inflowId,
//                   localId: Number(scheme.defaultTaxCodeId),
//                 },
//                 select: { taxCodeId: true },
//               });
//               globalDefaultTaxCodeId = depTaxCode?.taxCodeId || null;
//             }

//             if (!match) {
//               const generatedInflowId = crypto.randomUUID().toLowerCase();

//               const payload = {
//                 taxingSchemeId: generatedInflowId,
//                 name: scheme.name,
//                 isActive: Number(scheme.isActive) === 1,
//                 isDefault: false,
//                 calculateTax2OnTax1: Number(scheme.calculateTax2OnTax1) === 1,
//                 tax1Name: scheme.tax1Name || null,
//                 tax1OnShipping: Number(scheme.tax1OnShipping) === 1,
//                 tax2Name: scheme.tax2Name || null,
//                 tax2OnShipping: Number(scheme.tax2OnShipping) === 1,
//                 defaultTaxCodeId: globalDefaultTaxCodeId,
//               };

//               // Pass running transaction instance client context downstream
//               match = await upsertTaxingScheme(tx, payload);
//             } else if (globalDefaultTaxCodeId) {
//               // If global record already exists, patch its default foreign key safely inside transaction context
//               await tx.taxingScheme.update({
//                 where: { inflowId: match.inflowId },
//                 data: { defaultTaxCodeId: globalDefaultTaxCodeId },
//               });
//             }

//             return { incoming: scheme, existing: match };
//           })
//         );

//         // Filter down to only taxing schemes successfully resolved or built globally
//         const validSchemes = existingSchemes.filter((ts) => ts.existing !== null);

//         // Track skipped entries for debugging/auditing
//         existingSchemes.forEach((ts) => {
//           if (!ts.existing) {
//             syncResults.push({
//               taxingSchemeInflowId: ts.incoming.taxingSchemeId,
//               status: "skipped_not_found",
//             });
//           }
//         });

//         /**
//          * Step 2: Bridge connection inside TaxingSchemeLocationMap
//          */
//         const mappingPromises = validSchemes.map(async ({ incoming, existing }) => {
//           // Check for an existing map record unique to this taxingSchemeId + locationId composite key
//           let locationMap = await tx.taxingSchemeLocationMap.findUnique({
//             where: {
//               taxingSchemeId_locationId: {
//                 taxingSchemeId: existing!.inflowId,
//                 locationId: location.inflowId,
//               },
//             },
//             select: { localId: true },
//           });

//           // CRITICAL FIX: If mapping table row link doesn't exist, create it!
//           if (!locationMap) {
//             locationMap = await tx.taxingSchemeLocationMap.create({
//               data: {
//                 taxingSchemeId: existing!.inflowId,
//                 locationId: location.inflowId,
//                 localId: Number(incoming.taxingSchemeId),
//               },
//               select: { localId: true },
//             });
//           }

//           syncResults.push({
//             taxingSchemeInflowId: incoming.taxingSchemeId,
//             localTaxingSchemeId: locationMap?.localId,
//             status: "synced",
//           });
//         });

//         await Promise.all(mappingPromises);
//         processed = validSchemes.length;
//       },
//       {
//         timeout: 35000,
//       }
//     );

//     if (onProgress) {
//       await onProgress(processed);
//     }

//     return {
//       taxingSchemesProcessed: processed,
//       syncedAt: new Date().toISOString(),
//       results: syncResults,
//     };
//   }
// }