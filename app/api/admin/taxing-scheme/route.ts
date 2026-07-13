// app/api/admin/taxing-schemes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { WebhookService } from "@/services/webhook.service";
import { getMidSyncQueue } from "@/lib/queues/sync.queue";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      name, isActive, isDefault, calculateTax2OnTax1, 
      tax1Name, tax1OnShipping, tax2Name, tax2OnShipping, taxCodes 
    } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Missing required taxing scheme name." }, { status: 400 });
    }

    const schemeInflowId = crypto.randomUUID().toLowerCase();

    const result = await prisma.$transaction(async (tx) => {
      // 1. Enforce single global default rule
      if (isDefault) {
        await tx.taxingScheme.updateMany({
          where: { isDefault: true },
          data: { isDefault: false }
        });
      }

      // 2. Build foundational taxing scheme
      const scheme = await tx.taxingScheme.create({
        data: {
          inflowId: schemeInflowId,
          name: name.trim(),
          isActive: isActive ?? true,
          isDefault: isDefault ?? false,
          calculateTax2OnTax1: tax2Name ? (calculateTax2OnTax1 ?? false) : false,
          tax1Name: tax1Name?.trim() || null,
          tax1OnShipping: tax1OnShipping ?? false,
          tax2Name: tax2Name?.trim() || null,
          tax2OnShipping: tax2OnShipping ?? false,
        },
      });

      // 3. Batch insert child tax codes if they exist
      if (taxCodes && Array.isArray(taxCodes) && taxCodes.length > 0) {
        const taxCodesData = taxCodes.map((tc) => ({
          inflowId: crypto.randomUUID().toLowerCase(),
          taxingSchemeId: schemeInflowId,
          name: tc.name.trim().toUpperCase(),
          isActive: tc.isActive ?? true,
          tax1Rate: tc.tax1Rate || 0,
          tax2Rate: tax2Name ? (tc.tax2Rate || 0) : 0,
          isDefaultExplicit: !!tc.isDefault, // temporary flag reference to look up match
        }));

        await tx.taxCode.createMany({
          data: taxCodesData.map(({ isDefaultExplicit, ...rest }) => rest), // Strip flag before insertion
        });

        // Find which payload configuration was marked as true by the client
        const selectedDefault = taxCodesData.find(tc => tc.isDefaultExplicit) || taxCodesData[0];

        // Apply the targeted relational reference mapping identifier 
        await tx.taxingScheme.update({
          where: { id: scheme.id },
          data: { defaultTaxCodeId: selectedDefault.inflowId },
        });
      }
      const res = await tx.taxingScheme.findUnique({
        where: { id: scheme.id },
        include: { taxCodes: true },
      });

      if (!res) return { res: null, inflowPayload: null };

      // Re-map structural fields targeting Cloud Global Identifiers
      const inflowPayload = {
        cloudId: res.inflowId, // The central source-of-truth ID
        calculateTax2OnTax1: res.calculateTax2OnTax1,
        defaultTaxCodeId: res.defaultTaxCodeId,
        isActive: res.isActive,
        isDefault: res.isDefault,
        name: res.name,
        tax1Name: res.tax1Name,
        tax1OnShipping: res.tax1OnShipping,
        tax2Name: res.tax2Name,
        tax2OnShipping: res.tax2OnShipping,
        taxCodes: res.taxCodes.map(t => ({
          isActive: t.isActive,
          name: t.name,
          tax1Rate: t.tax1Rate,
          tax2Rate: t.tax2Rate,
          taxCodeId: t.inflowId,
          taxingSchemeId: t.taxingSchemeId,
        }))
      };

      return { res, inflowPayload };
    });

    if (!result.res || !result.inflowPayload) {
      return NextResponse.json({ error: "Failed to assemble taxing scheme components." }, { status: 500 });
    }

    const { cloudId, ...cleanInflowPayload } = result.inflowPayload;

    // ==========================================
    // 🏢 STEP 1: DISPATCH CLOUD SYNC JOB
    // ==========================================
    const validCloudWebhook = await WebhookService.getCloudWebhookURL("taxingScheme");

    if (validCloudWebhook) {
      await getMidSyncQueue().add(
        "taxing_scheme_cloudsync_job",
        {
          source: "TAXING_SCHEME_UPSERT_CLOUD",
          model: "TaxingScheme",
          payload: {
            ...cleanInflowPayload,
            taxingSchemeId: cloudId,
          },
          timestamp: new Date().toISOString(),
        },
        { 
          attempts: 3, 
          backoff: { type: "exponential", delay: 2000 },
          removeOnComplete: true
        }
      );
      console.log(`[Queue] Successfully broadcasted sync job to inflow cloud.`);
    }

    // ==========================================
    // 📍 STEP 2: BROADCAST LOCAL SYNC JOBS
    // ==========================================
    const validWebhooks = await WebhookService.getLocationWebhookURLs("taxingSchemeLocal");

    if (validWebhooks.length > 0) {
      const jobsToQueue = validWebhooks
      .filter(webhook => webhook.location.url && webhook.location.url.trim() !== "")
      .map((webhook) => ({
        name: "taxing_scheme_localsync_job",
        data: {
          source: "TAXING_SCHEME_UPSERT_LOCAL",
          model: "TaxingScheme",
          payload: {
              ...cleanInflowPayload,
              taxingSchemeId: cloudId,
              localId: null,
              
              // 💡 MAP CHILD TAX CODES
              taxCodes: cleanInflowPayload.taxCodes.map((tc) => {
                return {
                  ...tc,
                  localId: null,
                  taxingSchemeId: null,
                };
              })
            },
          timestamp: new Date().toISOString(),
          location: {
            inflowId: webhook.locationId,
            url: webhook.location.url,
            name: webhook.location.name
          }
        },
        opts: { 
          attempts: 3, 
          backoff: { type: "exponential", delay: 2000 },
          removeOnComplete: true
        }
      }));

      await getMidSyncQueue().addBulk(jobsToQueue);
      console.log(`[Queue] Successfully broadcasted sync jobs to ${jobsToQueue.length} locations.`);
    }

    return NextResponse.json(result.res, { status: 201 });
  } catch (error) {
    console.error("Failed to create taxing scheme:", error);
    return NextResponse.json({ error: "Internal server database transaction failure." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      id, name, isActive, isDefault, calculateTax2OnTax1, 
      tax1Name, tax1OnShipping, tax2Name, tax2OnShipping, taxCodes 
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Target taxing scheme identifier is missing." }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.taxingScheme.updateMany({
          where: { NOT: { id }, isDefault: true },
          data: { isDefault: false }
        });
      }

      const scheme = await tx.taxingScheme.findUnique({
        where: { id },
        select: { inflowId: true }
      });

      if (!scheme) {
        throw new Error("Taxing Scheme not found.");
      }

      let defaultTaxCodeId: string | null = null;

      if (taxCodes && Array.isArray(taxCodes)) {
        // 1. Collect all incoming items that already possess a known global id
        const incomingWithIds = taxCodes.filter((tc) => tc.inflowId);
        const incomingIds = incomingWithIds.map((tc) => tc.inflowId as string);

        // 2. Safely delete ONLY the old child rows omitted from your user's update payload
        // This cleanly leaves active mappings untouched!
        await tx.taxCode.deleteMany({
          where: {
            taxingSchemeId: scheme.inflowId,
            NOT: { inflowId: { in: incomingIds } }
          }
        });

        const processedTaxCodes: string[] = [];

        // 3. Process records individually via Upsert to protect mapping integrity
        for (const tc of taxCodes) {
          const targetInflowId = tc.inflowId || crypto.randomUUID().toLowerCase();
          processedTaxCodes.push(targetInflowId);

          await tx.taxCode.upsert({
            where: { inflowId: targetInflowId },
            create: {
              inflowId: targetInflowId,
              taxingSchemeId: scheme.inflowId,
              name: tc.name.trim().toUpperCase(),
              isActive: tc.isActive ?? true,
              tax1Rate: tc.tax1Rate || 0,
              tax2Rate: tax2Name ? (tc.tax2Rate || 0) : 0,
            },
            update: {
              name: tc.name.trim().toUpperCase(),
              isActive: tc.isActive ?? true,
              tax1Rate: tc.tax1Rate || 0,
              tax2Rate: tax2Name ? (tc.tax2Rate || 0) : 0,
            }
          });

          // Track which record should act as the default choice reference key
          if (tc.isDefault || (!defaultTaxCodeId && processedTaxCodes.length === 1)) {
            defaultTaxCodeId = targetInflowId;
          }
        }
      }

      const modifiedScheme = await tx.taxingScheme.update({
        where: { id },
        data: {
          name: name?.trim(),
          isActive,
          isDefault,
          calculateTax2OnTax1: tax2Name ? calculateTax2OnTax1 : false,
          tax1Name: tax1Name?.trim() || null,
          tax1OnShipping,
          tax2Name: tax2Name?.trim() || null,
          tax2OnShipping,
          defaultTaxCodeId, 
        },
        include: { taxCodes: true }
      });

      const inflowPayload = {
        cloudId: modifiedScheme.inflowId,
        calculateTax2OnTax1: modifiedScheme.calculateTax2OnTax1,
        defaultTaxCodeId: modifiedScheme.defaultTaxCodeId,
        isActive: modifiedScheme.isActive,
        isDefault: modifiedScheme.isDefault,
        name: modifiedScheme.name,
        tax1Name: modifiedScheme.tax1Name,
        tax1OnShipping: modifiedScheme.tax1OnShipping,
        tax2Name: modifiedScheme.tax2Name,
        tax2OnShipping: modifiedScheme.tax2OnShipping,
        taxCodes: modifiedScheme.taxCodes.map(t => ({
          isActive: t.isActive,
          name: t.name,
          tax1Rate: t.tax1Rate,
          tax2Rate: t.tax2Rate,
          taxCodeId: t.inflowId,
          taxingSchemeId: t.taxingSchemeId,
        }))
      };

      return { modifiedScheme, inflowPayload };
    });

    const { cloudId, ...cleanInflowPayload } = result.inflowPayload;

    // ==========================================
    // 🏢 STEP 1: DISPATCH CLOUD SYNC JOB
    // ==========================================
    const validCloudWebhook = await WebhookService.getCloudWebhookURL("taxingScheme");

    if (validCloudWebhook) {
      await getMidSyncQueue().add(
        "taxing_scheme_cloudsync_job",
        {
          source: "TAXING_SCHEME_UPSERT_CLOUD",
          model: "TaxingScheme",
          payload: {
            ...cleanInflowPayload,
            taxingSchemeId: cloudId,
          },
          timestamp: new Date().toISOString(),
        },
        { 
          attempts: 3, 
          backoff: { type: "exponential", delay: 2000 },
          removeOnComplete: true
        }
      );
    }

    // ==========================================
    // 📍 STEP 2: BROADCAST LOCAL SYNC JOBS
    // ==========================================
    const validWebhooks = await WebhookService.getLocationWebhookURLs("taxingSchemeLocal");

    if (validWebhooks.length > 0) {
      
      const existingMappings = await prisma.taxingSchemeLocationMap.findMany({
        where: { taxingSchemeId: cloudId },
        select: { locationId: true, localId: true }
      });

      const existingTaxCodeMaps = await prisma.taxCodeLocationMap.findMany({
        where: { taxCode: { taxingSchemeId: cloudId } },
        select: { taxCodeId: true, locationId: true, localId: true }
      });

      const jobsToQueue = validWebhooks
        .filter(webhook => webhook.location.url && webhook.location.url.trim() !== "")
        .map((webhook) => {
          
        const match = existingMappings.find(m => m.locationId === webhook.locationId);

        return {
          name: "taxing_scheme_localsync_job",
          data: {
            source: "TAXING_SCHEME_UPSERT_LOCAL",
            model: "TaxingScheme",
            payload: {
              ...cleanInflowPayload,
              taxingSchemeId: cloudId,
              localId: match ? match.localId : null,
              
              // 💡 MAP CHILD TAX CODES
              taxCodes: cleanInflowPayload.taxCodes.map((tc) => {
                const taxCodeMatch = existingTaxCodeMaps.find(
                  m => m.taxCodeId === tc.taxCodeId && m.locationId === webhook.locationId
                );
                
                return {
                  ...tc,
                  localId: taxCodeMatch ? taxCodeMatch.localId : null,
                  taxingSchemeId: match ? match.localId : null,
                };
              })
            },
            timestamp: new Date().toISOString(),
            location: {
              inflowId: webhook.locationId,
              url: webhook.location.url,
              name: webhook.location.name
            }
          },
          opts: { 
            attempts: 3, 
            backoff: { type: "exponential", delay: 2000 },
            removeOnComplete: true
          }
        };
      });

      await getMidSyncQueue().addBulk(jobsToQueue);
    }

    return NextResponse.json(result.modifiedScheme, { status: 200 });
  } catch (error) {
    console.error("Failed to update taxing scheme:", error);
    return NextResponse.json({ error: "Internal server database failure." }, { status: 500 });
  }
}

// export async function PATCH(request: NextRequest) {
//   try {
//     const body = await request.json();
//     const { 
//       id, name, isActive, isDefault, calculateTax2OnTax1, 
//       tax1Name, tax1OnShipping, tax2Name, tax2OnShipping, taxCodes 
//     } = body;

//     if (!id) {
//       return NextResponse.json({ error: "Target taxing scheme identifier is missing." }, { status: 400 });
//     }

//     const result = await prisma.$transaction(async (tx) => {
//       if (isDefault) {
//         await tx.taxingScheme.updateMany({
//           where: { NOT: { id }, isDefault: true },
//           data: { isDefault: false }
//         });
//       }

//       const scheme = await tx.taxingScheme.findUnique({
//         where: { id },
//         select: { inflowId: true }
//       });

//       if (!scheme) {
//         throw new Error("Taxing Scheme not found.");
//       }

//       // Safe historic drop for child elements using global tracking link
//       await tx.taxCode.deleteMany({ where: { taxingSchemeId: scheme.inflowId } });

//       let defaultTaxCodeId: string | null = null;

//       if (taxCodes && Array.isArray(taxCodes) && taxCodes.length > 0) {
//         const taxCodesData = taxCodes.map((tc) => ({
//           inflowId: crypto.randomUUID().toLowerCase(),
//           taxingSchemeId: scheme.inflowId,
//           name: tc.name.trim().toUpperCase(),
//           isActive: tc.isActive ?? true,
//           tax1Rate: tc.tax1Rate || 0,
//           tax2Rate: tax2Name ? (tc.tax2Rate || 0) : 0,
//           isDefaultExplicit: !!tc.isDefault, // 🌟 Temporary indicator tracking link
//         }));

//         await tx.taxCode.createMany({
//           // Strip indicator tag before database mapping schema validation insertion
//           data: taxCodesData.map(({ isDefaultExplicit, ...rest }) => rest), 
//         });

//         // 🌟 Find explicitly targeted row object, fall back gracefully to row 0 if none checked
//         const selectedDefault = taxCodesData.find(tc => tc.isDefaultExplicit) || taxCodesData[0];
//         defaultTaxCodeId = selectedDefault.inflowId;
//       }

//       const modifiedScheme = await tx.taxingScheme.update({
//         where: { id },
//         data: {
//           name: name?.trim(),
//           isActive,
//           isDefault,
//           calculateTax2OnTax1: tax2Name ? calculateTax2OnTax1 : false,
//           tax1Name: tax1Name?.trim() || null,
//           tax1OnShipping,
//           tax2Name: tax2Name?.trim() || null,
//           tax2OnShipping,
//           defaultTaxCodeId, // 🌟 Saves explicit relational mapping choice reference correctly
//         },
//         include: { taxCodes: true }
//       });

//       const inflowPayload = {
//         cloudId: modifiedScheme.inflowId,
//         calculateTax2OnTax1: modifiedScheme.calculateTax2OnTax1,
//         defaultTaxCodeId: modifiedScheme.defaultTaxCodeId,
//         isActive: modifiedScheme.isActive,
//         isDefault: modifiedScheme.isDefault,
//         name: modifiedScheme.name,
//         tax1Name: modifiedScheme.tax1Name,
//         tax1OnShipping: modifiedScheme.tax1OnShipping,
//         tax2Name: modifiedScheme.tax2Name,
//         tax2OnShipping: modifiedScheme.tax2OnShipping
//       };

//       return { modifiedScheme, inflowPayload };
//     });

//     const { cloudId, ...cleanInflowPayload } = result.inflowPayload;

//     // ==========================================
//     // 🏢 STEP 1: DISPATCH CLOUD SYNC JOB
//     // ==========================================
//     const validCloudWebhook = await WebhookService.getCloudWebhookURL("taxingScheme");

//     if (validCloudWebhook) {
//       await getMidSyncQueue().add(
//         "taxing_scheme_cloudsync_job",
//         {
//           source: "TAXING_SCHEME_UPSERT_CLOUD",
//           model: "TaxingScheme",
//           payload: {
//             ...cleanInflowPayload,
//             taxingSchemeId: cloudId,
//           },
//           timestamp: new Date().toISOString(),
//         },
//         { 
//           attempts: 3, 
//           backoff: { type: "exponential", delay: 2000 },
//           removeOnComplete: true
//         }
//       );
//       console.log(`[Queue] Successfully broadcasted patch edits to inflow cloud.`);
//     }

//     // ==========================================
//     // 📍 STEP 2: BROADCAST LOCAL SYNC JOBS
//     // ==========================================
//     const validWebhooks = await WebhookService.getLocationWebhookURLs("taxingScheme");

//     if (validWebhooks.length > 0) {
//       // 🗺️ Query identity map registry to see which location already knows this record
//       const existingMappings = await prisma.taxingSchemeLocationMap.findMany({
//         where: { taxingSchemeId: cloudId },
//         select: { locationId: true, localId: true }
//       });

//       const jobsToQueue = validWebhooks
//         .filter(webhook => webhook.location.url && webhook.location.url.trim() !== "")
//         .map((webhook) => {
//         // Find if this specific store branch has an integer mapping matching this entry
//         const match = existingMappings.find(m => m.locationId === webhook.locationId);

//         return {
//           name: "taxing_scheme_localsync_job",
//           data: {
//             source: "TAXING_SCHEME_UPSERT_LOCAL",
//             model: "TaxingScheme",
//             payload: {
//               ...cleanInflowPayload,
//               taxingSchemeId: cloudId, // Keeps the global trace uniform
//               localId: match ? match.localId : null, // 💡 If exists, passes Int (e.g. 5). If null, local nodes create a fresh entry
//             },
//             timestamp: new Date().toISOString(),
//             location: {
//               inflowId: webhook.locationId,
//               url: webhook.location.url,
//               name: webhook.location.name
//             }
//           },
//           opts: { 
//             attempts: 3, 
//             backoff: { type: "exponential", delay: 2000 },
//             removeOnComplete: true
//           }
//         };
//       });

//       await getMidSyncQueue().addBulk(jobsToQueue);
//       console.log(`[Queue] Successfully broadcasted patch edits to ${jobsToQueue.length} store instances.`);
//     }

//     return NextResponse.json(result.modifiedScheme, { status: 200 });
//   } catch (error) {
//     console.error("Failed to update taxing scheme:", error);
//     return NextResponse.json({ error: "Internal server database write transaction failure." }, { status: 500 });
//   }
// }

// // app/api/admin/taxing-schemes/route.ts
// import { NextRequest, NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";
// import { WebhookService } from "@/services/location.service";
// import { getMidSyncQueue } from "@/lib/queues/sync.queue";

// export async function POST(request: NextRequest) {
//   try {
//     const body = await request.json();
//     const { 
//       name, isActive, isDefault, calculateTax2OnTax1, 
//       tax1Name, tax1OnShipping, tax2Name, tax2OnShipping, taxCodes 
//     } = body;

//     if (!name?.trim()) {
//       return NextResponse.json({ error: "Missing required taxing scheme name." }, { status: 400 });
//     }

//     const schemeInflowId = crypto.randomUUID().toLowerCase();

//     const compiledScheme = await prisma.$transaction(async (tx) => {
//       // 1. Enforce single global default rule
//       if (isDefault) {
//         await tx.taxingScheme.updateMany({
//           where: { isDefault: true },
//           data: { isDefault: false }
//         });
//       }

//       // 2. Build foundational taxing scheme
//       const scheme = await tx.taxingScheme.create({
//         data: {
//           inflowId: schemeInflowId,
//           name: name.trim(),
//           isActive: isActive ?? true,
//           isDefault: isDefault ?? false,
//           calculateTax2OnTax1: tax2Name ? (calculateTax2OnTax1 ?? false) : false,
//           tax1Name: tax1Name?.trim() || null,
//           tax1OnShipping: tax1OnShipping ?? false,
//           tax2Name: tax2Name?.trim() || null,
//           tax2OnShipping: tax2OnShipping ?? false,
//         },
//       });

//       // 3. Batch insert child tax codes if they exist
//       if (taxCodes && Array.isArray(taxCodes) && taxCodes.length > 0) {
//         // Map payloads out with pre-generated IDs to avoid loop DB roundtrips
//         const taxCodesData = taxCodes.map((tc) => ({
//           inflowId: crypto.randomUUID().toLowerCase(),
//           taxingSchemeId: schemeInflowId,
//           name: tc.name.trim().toUpperCase(),
//           isActive: tc.isActive ?? true,
//           tax1Rate: tc.tax1Rate || 0,
//           tax2Rate: tax2Name ? (tc.tax2Rate || 0) : 0,
//         }));

//         await tx.taxCode.createMany({
//           data: taxCodesData,
//         });

//         // Set the first item as the default tax code identifier
//         await tx.taxingScheme.update({
//           where: { id: scheme.id },
//           data: { defaultTaxCodeId: taxCodesData[0].inflowId },
//         });
//       }

//       const res =  await tx.taxingScheme.findUnique({
//         where: { id: scheme.id },
//         include: { taxCodes: true },
//       });

//       if(!res) return { res: null, inflowPayload: null}

//       const inflowPayload = {
//         cloudId: res.inflowId,
//         localId: res.localId,
//         calculateTax2OnTax1: res.calculateTax2OnTax1,
//         defaultTaxCodeId: res.defaultTaxCodeId,
//         isActive: res.isActive,
//         isDefault: res.isDefault,
//         name: res.name,
//         tax1Name: res.tax1Name,
//         tax1OnShipping: res.tax1OnShipping,
//         tax2Name: res.tax2Name,
//         tax2OnShipping: res.tax2OnShipping,
//         taxCodes: res.taxCodes.map(t => [{
//           isActive: t.isActive,
//           name: t.name,
//           tax1Rate: t.tax1Rate,
//           tax2Rate: t.tax2Rate,
//           taxCodeId: t.inflowId,
//           taxingSchemeId: t.taxingSchemeId,
//         }])
//       }

//       return { res, inflowPayload}

//     });

//     // 1. Fetch ALL locations from the database
//     const { cloudId, localId, ...inflowPayload} = compiledScheme;

//     // 1. Fetch ALL locations from the database
//     const locations = await WebhookService.getLocationURLs();
    
//     // 2. Filter for locations that actually have a URL set
//     const validLocations = locations.filter(loc => loc.url && loc.url.trim() !== "");

//     if (validLocations.length > 0) {
//       // 3. Prepare the payload array for BullMQ batch addition
//       // Using queue.addBulk is MUCH faster than looping await queue.add() because it's a single Redis network roundtrip.
//       const jobsToQueue = validLocations.map((loc) => ({
//         name: "taxing_scheme_sync_job",
//         data: {
//           source: "TAXING_SCHEME_UPSERT_LOCAL",
//           model: "TaxingScheme",
//           payload: {
//             ...inflowPayload,
//             taxingSchemeId: localId,
//           },
//           timestamp: new Date().toISOString(),
//           location: loc
//         },
//         opts: { 
//           attempts: 3, 
//           backoff: { type: "exponential", delay: 2000 },
//           removeOnComplete: true
//         }
//       }));

//       // 4. Send all jobs to Redis in a single execution operation
//       await getMidSyncQueue().addBulk(jobsToQueue);
      
//       console.log(`[Queue] Successfully broadcasted sync jobs to ${validLocations.length} locations.`);
//     }

//     return NextResponse.json(compiledScheme, { status: 201 });
//   } catch (error) {
//     console.error("Failed to create taxing scheme:", error);
//     return NextResponse.json({ error: "Internal server database transaction failure." }, { status: 500 });
//   }
// }

// export async function PATCH(request: NextRequest) {
//   try {
//     const body = await request.json();
//     const { 
//       id, name, isActive, isDefault, calculateTax2OnTax1, 
//       tax1Name, tax1OnShipping, tax2Name, tax2OnShipping, taxCodes 
//     } = body;

//     if (!id) {
//       return NextResponse.json({ error: "Target taxing scheme identifier is missing." }, { status: 400 });
//     }

//     const modifiedScheme = await prisma.$transaction(async (tx) => {
//       if (isDefault) {
//         await tx.taxingScheme.updateMany({
//           where: { NOT: { id }, isDefault: true },
//           data: { isDefault: false }
//         });
//       }

//       const scheme = await tx.taxingScheme.findUnique({
//         where: { id },
//         select: { inflowId: true }
//       });

//       if (!scheme) {
//         throw new Error("Taxing Scheme not found.");
//       }

//       // Drop historic children elements safely 
//       // NOTE: Consider switching to an upside upsert/update strategy if inflowId is leveraged as a foreign key downstream!
//       await tx.taxCode.deleteMany({ where: { taxingSchemeId: scheme.inflowId } });

//       let defaultTaxCodeId: string | null = null;

//       if (taxCodes && Array.isArray(taxCodes) && taxCodes.length > 0) {
//         const taxCodesData = taxCodes.map((tc) => ({
//           inflowId: crypto.randomUUID().toLowerCase(),
//           taxingSchemeId: scheme.inflowId,
//           name: tc.name.trim().toUpperCase(),
//           isActive: tc.isActive ?? true,
//           tax1Rate: tc.tax1Rate || 0,
//           tax2Rate: tax2Name ? (tc.tax2Rate || 0) : 0,
//         }));

//         await tx.taxCode.createMany({
//           data: taxCodesData,
//         });

//         defaultTaxCodeId = taxCodesData[0].inflowId;
//       }

//       const modifiedScheme = await tx.taxingScheme.update({
//         where: { id },
//         data: {
//           name: name?.trim(),
//           isActive,
//           isDefault,
//           calculateTax2OnTax1: tax2Name ? calculateTax2OnTax1 : false,
//           tax1Name: tax1Name?.trim() || null,
//           tax1OnShipping,
//           tax2Name: tax2Name?.trim() || null,
//           tax2OnShipping,
//           defaultTaxCodeId,
//         },
//         include: { taxCodes: true }
//       });

//       const inflowPayload = {
//         cloudId: modifiedScheme.inflowId,
//         localId: modifiedScheme.localId,
//         calculateTax2OnTax1: modifiedScheme.calculateTax2OnTax1,
//         defaultTaxCodeId: modifiedScheme.defaultTaxCodeId,
//         isActive: modifiedScheme.isActive,
//         isDefault: modifiedScheme.isDefault,
//         name: modifiedScheme.name,
//         tax1Name: modifiedScheme.tax1Name,
//         tax1OnShipping: modifiedScheme.tax1OnShipping,
//         tax2Name: modifiedScheme.tax2Name,
//         tax2OnShipping: modifiedScheme.tax2OnShipping,
//         taxCodes: modifiedScheme.taxCodes.map(t => [{
//           isActive: t.isActive,
//           name: t.name,
//           tax1Rate: t.tax1Rate,
//           tax2Rate: t.tax2Rate,
//           taxCodeId: t.inflowId,
//           taxingSchemeId: t.taxingSchemeId,
//         }])
//       }

//       return { modifiedScheme, inflowPayload}
//     });

//     const { cloudId, localId, ...inflowPayload} = modifiedScheme.inflowPayload;

//     // 1. Fetch ALL locations from the database
//     const locations = await WebhookService.getLocationURLs();
    
//     // 2. Filter for locations that actually have a URL set
//     const validLocations = locations.filter(loc => loc.url && loc.url.trim() !== "");

//     if (validLocations.length > 0) {
//       // 3. Prepare the payload array for BullMQ batch addition
//       // Using queue.addBulk is MUCH faster than looping await queue.add() because it's a single Redis network roundtrip.
//       const jobsToQueue = validLocations.map((loc) => ({
//         name: "taxing_scheme_sync_job",
//         data: {
//           source: "TAXING_SCHEME_UPSERT_LOCAL",
//           model: "TaxingScheme",
//           payload: {
//             ...inflowPayload,
//             taxingSchemeId: localId,
//           },
//           timestamp: new Date().toISOString(),
//           location: loc
//         },
//         opts: { 
//           attempts: 3, 
//           backoff: { type: "exponential", delay: 2000 },
//           removeOnComplete: true
//         }
//       }));

//       // 4. Send all jobs to Redis in a single execution operation
//       await getMidSyncQueue().addBulk(jobsToQueue);
      
//       console.log(`[Queue] Successfully broadcasted sync jobs to ${validLocations.length} locations.`);
//     }

//     return NextResponse.json(modifiedScheme, { status: 200 });
//   } catch (error) {
//     console.error("Failed to update taxing scheme:", error);
//     return NextResponse.json({ error: "Internal server database write transaction failure." }, { status: 500 });
//   }
// }