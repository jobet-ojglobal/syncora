// app/api/admin/customers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMidSyncQueue } from "@/lib/queues/sync.queue";
import { Prisma } from "@/generated/prisma/client";
// import { LocationService } from "@/services/location.service";
import { WebhookService } from "@/services/webhook.service";
import { ADDRESS_TYPE_MAP } from "@/types/local-location.type";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      name, contactName, email, phone, fax, website, remarks, isActive, 
      taxExemptNumber, defaultCarrier, defaultPaymentMethod, discount, 
      defaultLocationId, defaultPaymentTermsId, pricingSchemeId, taxingSchemeId, 
      defaultSalesRepTeamMemberId, addresses = [], customFields = {}
    } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Missing required business name field." }, { status: 400 });
    }

    const customerId = crypto.randomUUID().toLowerCase();
    const cleanEmail = email?.trim().toLowerCase() || null;

    // Execute database operations safely inside a single ACID isolation boundary
    const result = await prisma.$transaction(async (tx) => {

      // 1. Fetch Currency ID early in the block
      const targetPricingScheme = pricingSchemeId 
        ? await tx.pricingScheme.findUnique({ where: { inflowId: pricingSchemeId }, select: { currencyId: true } })
        : null;
      const currencyId = targetPricingScheme?.currencyId || "USD";

      // 2. Create Parent Business Partner Node
      const businessPartner = await tx.businessPartner.create({
        data: { 
          name: name.trim(), 
          contactName: contactName?.trim(), 
          email: cleanEmail, 
          phone: phone?.trim(), 
          fax: fax?.trim(), 
          website: website?.trim(), 
          remarks: remarks?.trim(), 
          isActive: isActive ?? true 
        }
      });

      // 3. Create Related Address Vectors
      const savedAddresses = await Promise.all(
        addresses.map(async (addr: any) => {
          const addressId = crypto.randomUUID().toLowerCase();
          return await tx.businessPartnerAddress.create({
            data: {
              businessPartnerId: businessPartner.id,
              inflowId: addressId,
              name: addr.name?.trim() || "Primary Address",
              address1: addr.address1?.trim() || "",
              address2: addr.address2?.trim() || null,
              city: addr.city?.trim() || "",
              state: addr.state?.trim() || "",
              country: addr.country?.trim() || "Philippines",
              postalCode: addr.postalCode?.trim() || "",
              remarks: addr.remarks?.trim() || null,
              addressType: addr.addressType || "Commercial"
            }
          });
        })
      );

      // Determine explicit structural fallback selectors
      const billingIndex = addresses.findIndex((a: any) => a.isDefaultBilling === true);
      const shippingIndex = addresses.findIndex((a: any) => a.isDefaultShipping === true);
      
      const billingInflowId = savedAddresses[billingIndex >= 0 ? billingIndex : 0]?.inflowId || null;
      const shippingInflowId = savedAddresses[shippingIndex >= 0 ? shippingIndex : 0]?.inflowId || null;

      // 5. Setup Core Customer Record Block
      const customer = await tx.customer.create({
        data: {
          businessPartnerId: businessPartner.id,
          inflowId: customerId,
          taxExemptNumber: taxExemptNumber?.trim() || null,
          defaultCarrier: defaultCarrier?.trim() || null,
          defaultPaymentMethod: defaultPaymentMethod?.trim() || null,
          discount: discount ? new Prisma.Decimal(discount) : 0,
          defaultLocationId: defaultLocationId || null,
          defaultPaymentTermsId: defaultPaymentTermsId || null,
          pricingSchemeId: pricingSchemeId || null,
          taxingSchemeId: taxingSchemeId || null,
          defaultSalesRepTeamMemberId: defaultSalesRepTeamMemberId || null,
          defaultBillingAddressId: billingInflowId,
          defaultShippingAddressId: shippingInflowId
        }
      });

      // 6. Seeding Financial Summaries concurrently
      const [balanceRecord, creditRecord, dueRecord] = await Promise.all([
        tx.customerBalance.create({ data: { inflowId: crypto.randomUUID().toLowerCase(), customerId, currencyId, balance: 0 } }),
        tx.customerCredit.create({ data: { inflowId: crypto.randomUUID().toLowerCase(), customerId, currencyId, credit: 0 } }),
        tx.customerDue.create({ data: { inflowId: crypto.randomUUID().toLowerCase(), customerId, currencyId, amountCurrent: 0, amount1To30: 0, amount31To60: 0, amount61Plus: 0 } })
      ]);

      // 7. Construct Outbound payload representation
      const inflowPayload = {
        cloudId: customer.inflowId, 
        name: businessPartner.name,
        contactName: businessPartner.contactName,
        email: businessPartner.email,
        phone: businessPartner.phone,
        fax: businessPartner.fax,
        website: businessPartner.website,
        remarks: businessPartner.remarks,
        discount: customer.discount ? customer.discount.toString() : null,
        isActive: businessPartner.isActive,
        taxExemptNumber: customer.taxExemptNumber,
        defaultCarrier: customer.defaultCarrier,
        defaultPaymentMethod: customer.defaultPaymentMethod,
        defaultSalesRepTeamMemberId: customer.defaultSalesRepTeamMemberId,
        defaultBillingAddressId: customer.defaultBillingAddressId,
        defaultShippingAddressId: customer.defaultShippingAddressId,

        // LocalMap Dependencies
        defaultLocationId: customer.defaultLocationId,
        currencyId: currencyId,
        defaultPaymentTermsId: customer.defaultPaymentTermsId,
        pricingSchemeId: customer.pricingSchemeId,
        taxingSchemeId: customer.taxingSchemeId,
        
        // FINANCIAL SUMMARY SEEDS FOR THE CLOUD PAYLOAD
        balances: [{
          inflowId: balanceRecord.inflowId,
          customerId: customer.inflowId,
          currencyId: currencyId,
          balance: "0"
        }],
        credits: [{
          inflowId: creditRecord.inflowId,
          customerId: customer.inflowId,
          currencyId: currencyId,
          credit: "0"
        }],
        dues: [{
          inflowId: dueRecord.inflowId,
          customerId: customer.inflowId,
          currencyId: currencyId,
          amountCurrent: "0",
          amount1To30: "0",
          amount31To60: "0",
          amount61Plus: "0"
        }],

        addresses: savedAddresses.map(addr => ({
          customerAddressId: addr.inflowId,
          customerId: customer.inflowId,
          name: addr.name,
          addressType: addr.addressType,
          address1: addr.address1,
          address2: addr.address2,
          city: addr.city,
          state: addr.state,
          postalCode: addr.postalCode,
          country: addr.country,
          remarks: addr.remarks
        })),
        customFields: {
          custom1: customFields.custom1 || "",
          custom2: customFields.custom2 || "",
          custom3: customFields.custom3 || "",
          custom4: customFields.custom4 || "",
          custom5: customFields.custom5 || "",
          custom6: customFields.custom6 || "",
          custom7: customFields.custom7 || "",
          custom8: customFields.custom8 || "",
          custom9: customFields.custom9 || "",
          custom10: customFields.custom10 || "",
        }
      };

      return { res: customer, inflowPayload };
    });

    if (!result.res || !result.inflowPayload) {
      return NextResponse.json({ error: "Failed to assemble customer components." }, { status: 500 });
    }

    const { cloudId, ...cleanInflowPayload } = result.inflowPayload;

    // ==========================================
    // 🏢 STEP 1: DISPATCH CLOUD SYNC JOB
    // ==========================================
    const validCloudWebhook = await WebhookService.getCloudWebhookURL("customer");

    if (validCloudWebhook) {
      await getMidSyncQueue().add(
        "customer_cloudsync_job",
        {
          source: "CUSTOMER_UPSERT_CLOUD",
          model: "Customer",
          payload: {
            ...cleanInflowPayload,
            customerId: cloudId,
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
    const validWebhooks = await WebhookService.getLocationWebhookURLByLocationID(
      cleanInflowPayload.defaultLocationId as string, "customerLocal"
    );

    // Fetch dependent schema state maps for safe relational integer conversion
    const [
        existingMappings,
        existingCurrencyMaps,
        existingPricingMaps,
        existingPaymentTermMaps,
        existingTaxingMaps
      ] = await Promise.all([
        prisma.customerLocationMap.findMany({ where: { customerId: cloudId }, select: { locationId: true, localId: true } }),
        prisma.currencyLocationMap.findMany({ where: { currencyId: cleanInflowPayload.currencyId }, select: { locationId: true, localId: true } }),
        prisma.pricingSchemeLocationMap.findMany({ where: { pricingSchemeId: cleanInflowPayload.pricingSchemeId as string || undefined }, select: { locationId: true, localId: true } }),
        prisma.paymentTermLocationMap.findMany({ where: { paymentTermId: cleanInflowPayload.defaultPaymentTermsId as string || undefined }, select: { locationId: true, localId: true } }),
        prisma.taxingSchemeLocationMap.findMany({ where: { taxingSchemeId: cleanInflowPayload.taxingSchemeId as string || undefined }, select: { locationId: true, localId: true } })
      ]);

    if (validWebhooks.length > 0) {
      const jobsToQueue = validWebhooks
      .filter(webhook => webhook.location.url && webhook.location.url.trim() !== "")
      .map((webhook) => {
          
        const currencyMatch = existingCurrencyMaps.find(m => m.locationId === webhook.locationId);
        const paymentMatch = existingPaymentTermMaps.find(m => m.locationId === webhook.locationId);
        const pricingMatch = existingPricingMaps.find(m => m.locationId === webhook.locationId);
        const taxingMatch = existingTaxingMaps.find(m => m.locationId === webhook.locationId);

        return ({
          name: "customer_localsync_job",
          data: {
            source: "CUSTOMER_UPSERT_LOCAL",
            model: "Customer", 
            payload: {
              ...cleanInflowPayload,
              customerId: cloudId, 
              localId: null, // Clear identification signaling an insert to the downstream nodes

              // local mapping resolution dependencies
              defaultBillingAddressId: null,
              defaultShippingAddressId: null,
              defaultLocationId: null,
              currencyId: currencyMatch?.localId || null,
              defaultPaymentTermsId: paymentMatch?.localId || null,
              pricingSchemeId: pricingMatch?.localId || null,
              taxingSchemeId: taxingMatch?.localId || null,
              
              // 📊 FINANCING CONTRACT OBJECTS MAP STRATEGIES FOR EDGE DB
              // balances: cleanInflowPayload.balances.map(b => ({
              //   ...b,
              //   currencyId: currencyMatch?.localId || null,
              //   localId: null, 
              //   customerId: null,
              // })),
              // credits: cleanInflowPayload.credits.map(c => ({
              //   ...c,
              //   currencyId: currencyMatch?.localId || null,
              //   localId: null, 
              //   customerId: null,
              // })),
              // dues: cleanInflowPayload.dues.map(d => ({
              //   ...d,
              //   currencyId: currencyMatch?.localId || null,
              //   localId: null, 
              //   customerId: null,
              // })),

              addresses: cleanInflowPayload.addresses.map((addr) => {
                const resolvedNumericType = addr.addressType ? (ADDRESS_TYPE_MAP[addr.addressType] ?? 0) : 0;
                return {
                  ...addr,
                  addressType: resolvedNumericType,
                  localId: null, 
                  customerId: null, 
                };
              }),
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
        });
      });

      await getMidSyncQueue().addBulk(jobsToQueue);
    }

    return NextResponse.json(result.res, { status: 201 });
  } catch (error) {
    console.error("[CUSTOMER_POST_ERROR]:", error);
    return NextResponse.json({ error: "Failed to process customer creation pipeline." }, { status: 500 });
  }
}

// export async function PATCH(request: NextRequest) {
//   try {
//     const body = await request.json();
//     const { 
//       id, name, contactName, email, phone, fax, website, remarks, isActive, 
//       taxExemptNumber, defaultCarrier, defaultPaymentMethod, discount, 
//       defaultLocationId, defaultPaymentTermsId, pricingSchemeId, taxingSchemeId, 
//       defaultSalesRepTeamMemberId, addresses = [], customFields = {}
//     } = body;

//     if (!id) {
//       return NextResponse.json({ error: "Missing required customer target identification reference token." }, { status: 400 });
//     }

//     const cleanEmail = email?.trim().toLowerCase() || null;

//     const result = await prisma.$transaction(async (tx) => {
//       // 1. Fetch current database record contexts
//       const currentCustomer = await tx.customer.findUnique({
//         where: { id },
//         select: { businessPartnerId: true, inflowId: true }
//       });
//       if (!currentCustomer) throw new Error("Target customer record layout context was not located.");

//       // 2. Modify Core Legal Baseline Info
//       const businessPartner = await tx.businessPartner.update({
//         where: { id: currentCustomer.businessPartnerId },
//         data: { 
//           name: name?.trim(), 
//           contactName: contactName?.trim(), 
//           email: cleanEmail, 
//           phone: phone?.trim(), 
//           fax: fax?.trim(), 
//           website: website?.trim(), 
//           remarks: remarks?.trim(), 
//           isActive: isActive !== undefined ? isActive : undefined
//         }
//       });

//       const existingAddresses = await tx.businessPartnerAddress.findMany({
//         where: { businessPartnerId: currentCustomer.businessPartnerId },
//         select: { id: true }
//       });

//       const incomingIds = addresses
//         .filter((a: any) => a.id) // Only get addresses that have an ID
//         .map((a: any) => a.id);

//       // 2. Identify addresses to delete (exist in DB, but not in current payload)
//       const toDelete = existingAddresses.filter(addr => !incomingIds.includes(addr.id));

//       if (toDelete.length > 0) {
//         await tx.businessPartnerAddress.deleteMany({
//           where: { id: { in: toDelete.map(a => a.id) } }
//         });
//       }

//       // 3. Smart Address Alignment Strategy (Upserts matching structural states)
//       const syncedAddresses = await Promise.all(
//         addresses.map(async (addr: any) => {
//           const baseData = {
//             name: addr.name?.trim() || "Mailing Address",
//             address1: addr.address1?.trim() || "",
//             address2: addr.address2?.trim() || null,
//             city: addr.city?.trim() || "",
//             state: addr.state?.trim() || "",
//             country: addr.country?.trim() || "Philippines",
//             postalCode: addr.postalCode?.trim() || "",
//             remarks: addr.remarks?.trim() || null,
//             addressType: addr.addressType || "Commercial"
//           };

//           if (addr.id) {
//             return await tx.businessPartnerAddress.update({
//               where: { id: addr.id },
//               data: baseData
//             });
//           } else {
//             return await tx.businessPartnerAddress.create({
//               data: {
//                 ...baseData,
//                 businessPartnerId: currentCustomer.businessPartnerId,
//                 inflowId: crypto.randomUUID().toLowerCase()
//               }
//             });
//           }
//         })
//       );

//       const billingIndex = addresses.findIndex((a: any) => a.isDefaultBilling === true);
//       const shippingIndex = addresses.findIndex((a: any) => a.isDefaultShipping === true);
      
//       const billingInflowId = syncedAddresses[billingIndex >= 0 ? billingIndex : 0]?.inflowId || null;
//       const shippingInflowId = syncedAddresses[shippingIndex >= 0 ? shippingIndex : 0]?.inflowId || null;

//       // 4. Apply Sub-ledger Rule Context Overwrites
//       const updatedCustomer = await tx.customer.update({
//         where: { id },
//         data: {
//           taxExemptNumber: taxExemptNumber?.trim() || null,
//           defaultCarrier: defaultCarrier?.trim() || null,
//           defaultPaymentMethod: defaultPaymentMethod?.trim() || null,
//           discount: discount !== undefined ? new Prisma.Decimal(discount) : undefined,
//           defaultLocationId: defaultLocationId || null,
//           defaultPaymentTermsId: defaultPaymentTermsId || null,
//           pricingSchemeId: pricingSchemeId || null,
//           taxingSchemeId: taxingSchemeId || null,
//           defaultSalesRepTeamMemberId: defaultSalesRepTeamMemberId || null,
//           defaultBillingAddressId: billingInflowId,
//           defaultShippingAddressId: shippingInflowId
//         }
//       });

//       // 5. Build up all addresses associated with this business partner for full state sync
//       const finalAddresses = await tx.businessPartnerAddress.findMany({
//         where: { businessPartnerId: currentCustomer.businessPartnerId }
//       });

//       /**
//        * STEP 5: Construct Outbound inFlow-Compliant Upsert Representation
//        */
//       const inflowPayload = {
//         cloudId: updatedCustomer.inflowId, 
//         name: businessPartner.name,
//         contactName: businessPartner.contactName,
//         email: businessPartner.email,
//         phone: businessPartner.phone,
//         fax: businessPartner.fax,
//         website: businessPartner.website,
//         remarks: businessPartner.remarks,
//         discount: updatedCustomer.discount ? updatedCustomer.discount.toString() : null,
//         isActive: businessPartner.isActive,
//         taxExemptNumber: updatedCustomer.taxExemptNumber,
//         defaultLocationId: updatedCustomer.defaultLocationId,
//         defaultCarrier: updatedCustomer.defaultCarrier,
//         defaultPaymentMethod: updatedCustomer.defaultPaymentMethod,
//         defaultPaymentTermsId: updatedCustomer.defaultPaymentTermsId,
//         pricingSchemeId: updatedCustomer.pricingSchemeId,
//         taxingSchemeId: updatedCustomer.taxingSchemeId,
//         defaultSalesRepTeamMemberId: updatedCustomer.defaultSalesRepTeamMemberId,
//         defaultBillingAddressId: updatedCustomer.defaultBillingAddressId,
//         defaultShippingAddressId: updatedCustomer.defaultShippingAddressId,
//         addresses: finalAddresses.map(addr => ({
//           customerAddressId: addr.inflowId,
//           customerId: currentCustomer.inflowId,
//           name: addr.name,
//           address: {
//             addressType: addr.addressType,
//             address1: addr.address1,
//             address2: addr.address2,
//             city: addr.city,
//             state: addr.state,
//             postalCode: addr.postalCode,
//             country: addr.country,
//             remarks: addr.remarks
//           }
//         })),
//         customFields: {
//           custom1: customFields.custom1 || null,
//           custom2: customFields.custom2 || null,
//           custom3: customFields.custom3 || null,
//           custom4: customFields.custom4 || null,
//           custom5: customFields.custom5 || null,
//           custom6: customFields.custom6 || null,
//           custom7: customFields.custom7 || null,
//           custom8: customFields.custom8 || null,
//           custom9: customFields.custom9 || null,
//           custom10: customFields.custom10 || null,
//         }
//       };

//       return { res: updatedCustomer, inflowPayload };
//     });

//     if (!result.res || !result.inflowPayload) {
//       return NextResponse.json({ error: "Failed to assemble customer components." }, { status: 500 });
//     }

//     const { cloudId, ...cleanInflowPayload } = result.inflowPayload;

//     // ==========================================
//     // 🏢 STEP 1: DISPATCH CLOUD SYNC JOB
//     // ==========================================
//     const validCloudWebhook = await WebhookService.getCloudWebhookURL("customer");

//     if (validCloudWebhook) {
//       await getMidSyncQueue().add(
//         "customer_cloudsync_job",
//         {
//           source: "CUSTOMER_UPSERT_CLOUD",
//           model: "Customer",
//           payload: {
//             ...cleanInflowPayload,
//             currencyId: cloudId,
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
//     const validWebhooks = await WebhookService.getLocationWebhookURLs("customerLocal");

//     if (validWebhooks.length > 0) {
//       // 🗺️ Query identity map registry to see which location already knows this record
//       const existingMappings = await prisma.customerLocationMap.findMany({
//         where: { customerId: cloudId },
//         select: { locationId: true, localId: true }
//       });

//       const jobsToQueue = validWebhooks
//         .filter(webhook => webhook.location.url && webhook.location.url.trim() !== "")
//         .map((webhook) => {
//         // Find if this specific store branch has an integer mapping matching this entry
//         const match = existingMappings.find(m => m.locationId === webhook.locationId);

//         return {
//           name: "customer_localsync_job",
//           data: {
//             source: "CUSTOMER_UPSERT_LOCAL",
//             model: "Customer",
//             payload: {
//               ...cleanInflowPayload,
//               customerId: cloudId, // Keeps the global trace uniform
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

//     return NextResponse.json(result.res, { status: 200 });
//   } catch (error: any) {
//     console.error("[CUSTOMER_PATCH_ERROR]:", error);
//     return NextResponse.json({ error: error.message || "Internal failure modifying transactional parameters." }, { status: 500 });
//   }
// }

// export async function PATCH(request: NextRequest) {
//   try {
//     const body = await request.json();
//     const { 
//       id, name, contactName, email, phone, fax, website, remarks, isActive, 
//       taxExemptNumber, defaultCarrier, defaultPaymentMethod, discount, 
//       defaultLocationId, defaultPaymentTermsId, pricingSchemeId, taxingSchemeId, 
//       defaultSalesRepTeamMemberId, addresses, customFields = {}
//     } = body;

//     if (!id) {
//       return NextResponse.json({ error: "Missing required customer target identification reference token." }, { status: 400 });
//     }

//     const cleanEmail = email !== undefined ? (email?.trim().toLowerCase() || null) : undefined;

//     const result = await prisma.$transaction(async (tx) => {
//       // 1. Fetch current database record contexts
//       const currentCustomer = await tx.customer.findUnique({
//         where: { id },
//         select: { businessPartnerId: true, inflowId: true }
//       });
//       if (!currentCustomer) throw new Error("Target customer record layout context was not located.");

//       // 2. Modify Core Legal Baseline Info (using strict undefined checks for partial PATCH execution)
//       const businessPartner = await tx.businessPartner.update({
//         where: { id: currentCustomer.businessPartnerId },
//         data: { 
//           name: name !== undefined ? name?.trim() : undefined, 
//           contactName: contactName !== undefined ? contactName?.trim() : undefined, 
//           email: cleanEmail, 
//           phone: phone !== undefined ? phone?.trim() : undefined, 
//           fax: fax !== undefined ? fax?.trim() : undefined, 
//           website: website !== undefined ? website?.trim() : undefined, 
//           remarks: remarks !== undefined ? remarks?.trim() : undefined, 
//           isActive: isActive !== undefined ? isActive : undefined
//         }
//       });

//       let billingInflowId: string | null | undefined = undefined;
//       let shippingInflowId: string | null | undefined = undefined;

//       // Only handle address mutations if the addresses array was explicitly provided
//       if (addresses && Array.isArray(addresses)) {
//         const existingAddresses = await tx.businessPartnerAddress.findMany({
//           where: { businessPartnerId: currentCustomer.businessPartnerId },
//           select: { id: true }
//         });

//         const incomingIds = addresses.filter((a: any) => a.id).map((a: any) => a.id);
//         const toDelete = existingAddresses.filter(addr => !incomingIds.includes(addr.id));

//         if (toDelete.length > 0) {
//           await tx.businessPartnerAddress.deleteMany({
//             where: { id: { in: toDelete.map(a => a.id) } }
//           });
//         }

//         // 3. Address Reconciliation Engine
//         const syncedAddresses = await Promise.all(
//           addresses.map(async (addr: any) => {
//             const baseData = {
//               name: addr.name?.trim() || "Mailing Address",
//               address1: addr.address1?.trim() || "",
//               address2: addr.address2?.trim() || null,
//               city: addr.city?.trim() || "",
//               state: addr.state?.trim() || "",
//               country: addr.country?.trim() || "Philippines",
//               postalCode: addr.postalCode?.trim() || "",
//               remarks: addr.remarks?.trim() || null,
//               addressType: addr.addressType || "Commercial"
//             };

//             if (addr.id) {
//               return await tx.businessPartnerAddress.update({
//                 where: { id: addr.id },
//                 data: baseData
//               });
//             } else {
//               return await tx.businessPartnerAddress.create({
//                 data: {
//                   ...baseData,
//                   businessPartnerId: currentCustomer.businessPartnerId,
//                   inflowId: crypto.randomUUID().toLowerCase()
//                 }
//               });
//             }
//           })
//         );

//         // Find explicit matching targets via structural indices derived safely from synced payload mappings
//         const billingIndex = addresses.findIndex((a: any) => a.isDefaultBilling === true);
//         const shippingIndex = addresses.findIndex((a: any) => a.isDefaultShipping === true);
        
//         billingInflowId = syncedAddresses[billingIndex >= 0 ? billingIndex : 0]?.inflowId || null;
//         shippingInflowId = syncedAddresses[shippingIndex >= 0 ? shippingIndex : 0]?.inflowId || null;
//       }

//       // 4. Update Sub-ledger Rule Context safely without destroying un-passed properties
//       const updatedCustomer = await tx.customer.update({
//         where: { id },
//         data: {
//           taxExemptNumber: taxExemptNumber !== undefined ? (taxExemptNumber?.trim() || null) : undefined,
//           defaultCarrier: defaultCarrier !== undefined ? (defaultCarrier?.trim() || null) : undefined,
//           defaultPaymentMethod: defaultPaymentMethod !== undefined ? (defaultPaymentMethod?.trim() || null) : undefined,
//           discount: discount !== undefined ? new Prisma.Decimal(discount) : undefined,
//           defaultLocationId: defaultLocationId !== undefined ? defaultLocationId : undefined,
//           defaultPaymentTermsId: defaultPaymentTermsId !== undefined ? defaultPaymentTermsId : undefined,
//           pricingSchemeId: pricingSchemeId !== undefined ? pricingSchemeId : undefined,
//           taxingSchemeId: taxingSchemeId !== undefined ? taxingSchemeId : undefined,
//           defaultSalesRepTeamMemberId: defaultSalesRepTeamMemberId !== undefined ? defaultSalesRepTeamMemberId : undefined,
//           defaultBillingAddressId: billingInflowId,
//           defaultShippingAddressId: shippingInflowId
//         }
//       });

//       // 5. Build current finalized sync representations
//       const finalAddresses = await tx.businessPartnerAddress.findMany({
//         where: { businessPartnerId: currentCustomer.businessPartnerId }
//       });

//       const inflowPayload = {
//         id: updatedCustomer.id,
//         customerId: currentCustomer.inflowId,
//         name: businessPartner.name,
//         contactName: businessPartner.contactName,
//         email: businessPartner.email,
//         phone: businessPartner.phone,
//         fax: businessPartner.fax,
//         website: businessPartner.website,
//         remarks: businessPartner.remarks,
//         discount: updatedCustomer.discount ? updatedCustomer.discount.toString() : null,
//         isActive: businessPartner.isActive,
//         taxExemptNumber: updatedCustomer.taxExemptNumber,
//         defaultLocationId: updatedCustomer.defaultLocationId,
//         defaultCarrier: updatedCustomer.defaultCarrier,
//         defaultPaymentMethod: updatedCustomer.defaultPaymentMethod,
//         defaultPaymentTermsId: updatedCustomer.defaultPaymentTermsId,
//         pricingSchemeId: updatedCustomer.pricingSchemeId,
//         taxingSchemeId: updatedCustomer.taxingSchemeId,
//         defaultSalesRepTeamMemberId: updatedCustomer.defaultSalesRepTeamMemberId,
//         defaultBillingAddressId: updatedCustomer.defaultBillingAddressId,
//         defaultShippingAddressId: updatedCustomer.defaultShippingAddressId,
//         addresses: finalAddresses.map(addr => ({
//           customerAddressId: addr.inflowId,
//           customerId: currentCustomer.inflowId,
//           name: addr.name,
//           address: {
//             addressType: addr.addressType,
//             address1: addr.address1,
//             address2: addr.address2,
//             city: addr.city,
//             state: addr.state,
//             postalCode: addr.postalCode,
//             country: addr.country,
//             remarks: addr.remarks
//           }
//         })),
//         customFields: {
//           custom1: customFields.custom1 || null,
//           custom2: customFields.custom2 || null,
//           custom3: customFields.custom3 || null,
//           custom4: customFields.custom4 || null,
//           custom5: customFields.custom5 || null,
//           custom6: customFields.custom6 || null,
//           custom7: customFields.custom7 || null,
//           custom8: customFields.custom8 || null,
//           custom9: customFields.custom9 || null,
//           custom10: customFields.custom10 || null,
//         }
//       };

//       return { updatedCustomer, inflowPayload };
//     });

//     // 6. Enqueue Outbound Mid-Sync Job Outside Active DB Block
//     const location = await LocationService.getLocationURL(defaultLocationId);

//     if(location?.location.url){
//       await getMidSyncQueue().add(
//         "customer_sync_job",
//         {
//           source: "CUSTOMER_UPSERT_LOCAL",
//           model: "Customer",
//           payload: result.inflowPayload,
//           timestamp: new Date().toISOString(),
//           location: location
//         },
//         { 
//           attempts: 3, 
//           backoff: { type: "exponential", delay: 2000 },
//           removeOnComplete: true
//         }
//       );
//     }
    

//     return NextResponse.json(result.updatedCustomer, { status: 200 });
//   } catch (error: any) {
//     console.error("[CUSTOMER_PATCH_ERROR]:", error);
//     return NextResponse.json({ error: error.message || "Internal failure modifying transactional parameters." }, { status: 500 });
//   }
// }

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      id, name, contactName, email, phone, fax, website, remarks, isActive, 
      taxExemptNumber, defaultCarrier, defaultPaymentMethod, discount, 
      defaultLocationId, defaultPaymentTermsId, pricingSchemeId, taxingSchemeId, 
      defaultSalesRepTeamMemberId, addresses = [], customFields = {}
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing required customer target identification reference token." }, { status: 400 });
    }

    const cleanEmail = email?.trim().toLowerCase() || null;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch current database record contexts
      const currentCustomer = await tx.customer.findUnique({
        where: { id },
        select: { businessPartnerId: true, inflowId: true }
      });
      if (!currentCustomer) throw new Error("Target customer record layout context was not located.");

      const customerId = currentCustomer.inflowId;

      // 2. Modify Core Legal Baseline Info
      const businessPartner = await tx.businessPartner.update({
        where: { id: currentCustomer.businessPartnerId },
        data: { 
          name: name?.trim(), 
          contactName: contactName?.trim(), 
          email: cleanEmail, 
          phone: phone?.trim(), 
          fax: fax?.trim(), 
          website: website?.trim(), 
          remarks: remarks?.trim(), 
          isActive: isActive !== undefined ? isActive : undefined
        }
      });

      const existingAddresses = await tx.businessPartnerAddress.findMany({
        where: { businessPartnerId: currentCustomer.businessPartnerId },
        select: { id: true }
      });

      const incomingIds = addresses
        .filter((a: any) => a.id)
        .map((a: any) => a.id);

      // Identify addresses to delete (exist in DB, but not in current payload)
      const toDelete = existingAddresses.filter(addr => !incomingIds.includes(addr.id));

      if (toDelete.length > 0) {
        await tx.businessPartnerAddress.deleteMany({
          where: { id: { in: toDelete.map(a => a.id) } }
        });
      }

      // 3. Smart Address Alignment Strategy (Upserts matching structural states)
      const syncedAddresses = await Promise.all(
        addresses.map(async (addr: any) => {
          const baseData = {
            name: addr.name?.trim() || "Mailing Address",
            address1: addr.address1?.trim() || "",
            address2: addr.address2?.trim() || null,
            city: addr.city?.trim() || "",
            state: addr.state?.trim() || "",
            country: addr.country?.trim() || "Philippines",
            postalCode: addr.postalCode?.trim() || "",
            remarks: addr.remarks?.trim() || null,
            addressType: addr.addressType || "Commercial"
          };

          if (addr.id) {
            return await tx.businessPartnerAddress.update({
              where: { id: addr.id },
              data: baseData
            });
          } else {
            return await tx.businessPartnerAddress.create({
              data: {
                ...baseData,
                businessPartnerId: currentCustomer.businessPartnerId,
                inflowId: crypto.randomUUID().toLowerCase()
              }
            });
          }
        })
      );

      const billingIndex = addresses.findIndex((a: any) => a.isDefaultBilling === true);
      const shippingIndex = addresses.findIndex((a: any) => a.isDefaultShipping === true);
      
      const billingInflowId = syncedAddresses[billingIndex >= 0 ? billingIndex : 0]?.inflowId || null;
      const shippingInflowId = syncedAddresses[shippingIndex >= 0 ? shippingIndex : 0]?.inflowId || null;

      // 4. Apply Sub-ledger Rule Context Overwrites
      const updatedCustomer = await tx.customer.update({
        where: { id },
        data: {
          taxExemptNumber: taxExemptNumber?.trim() || null,
          defaultCarrier: defaultCarrier?.trim() || null,
          defaultPaymentMethod: defaultPaymentMethod?.trim() || null,
          discount: discount !== undefined ? new Prisma.Decimal(discount) : undefined,
          defaultLocationId: defaultLocationId || null,
          defaultPaymentTermsId: defaultPaymentTermsId || null,
          pricingSchemeId: pricingSchemeId || null,
          taxingSchemeId: taxingSchemeId || null,
          defaultSalesRepTeamMemberId: defaultSalesRepTeamMemberId || null,
          defaultBillingAddressId: billingInflowId,
          defaultShippingAddressId: shippingInflowId
        }
      });

      // Fetch or seed financial metrics arrays for global tracing data payload consistency
      const [balanceRecord, creditRecord, dueRecord] = await Promise.all([
        tx.customerBalance.findFirst({ where: { customerId } }),
        tx.customerCredit.findFirst({ where: { customerId } }),
        tx.customerDue.findFirst({ where: { customerId } })
      ]);

      // Fallback variables to prevent payload breaks if missing historical financial records
      const pricingData = pricingSchemeId 
        ? await tx.pricingScheme.findUnique({ where: { inflowId: pricingSchemeId }, select: { currencyId: true } })
        : null;
      const resolvedCurrencyId = pricingData?.currencyId || "USD";

      // 5. Build up all addresses associated with this business partner for full state sync
      const finalAddresses = await tx.businessPartnerAddress.findMany({
        where: { businessPartnerId: currentCustomer.businessPartnerId }
      });

      /**
       * Construct Outbound inFlow-Compliant Upsert Representation
       */
      const inflowPayload = {
        cloudId: updatedCustomer.inflowId, 
        name: businessPartner.name,
        contactName: businessPartner.contactName,
        email: businessPartner.email,
        phone: businessPartner.phone,
        fax: businessPartner.fax,
        website: businessPartner.website,
        remarks: businessPartner.remarks,
        discount: updatedCustomer.discount ? updatedCustomer.discount.toString() : null,
        isActive: businessPartner.isActive,
        taxExemptNumber: updatedCustomer.taxExemptNumber,
        defaultCarrier: updatedCustomer.defaultCarrier,
        defaultPaymentMethod: updatedCustomer.defaultPaymentMethod,
        defaultSalesRepTeamMemberId: updatedCustomer.defaultSalesRepTeamMemberId,
        defaultBillingAddressId: updatedCustomer.defaultBillingAddressId,
        defaultShippingAddressId: updatedCustomer.defaultShippingAddressId,

        // LocalMap Dependencies
        defaultLocationId: updatedCustomer.defaultLocationId,
        currencyId: resolvedCurrencyId,
        defaultPaymentTermsId: updatedCustomer.defaultPaymentTermsId,
        pricingSchemeId: updatedCustomer.pricingSchemeId,
        taxingSchemeId: updatedCustomer.taxingSchemeId,

        balances: [{
          inflowId: balanceRecord?.inflowId || crypto.randomUUID().toLowerCase(),
          customerId: customerId,
          currencyId: balanceRecord?.currencyId || resolvedCurrencyId,
          balance: balanceRecord?.balance ? balanceRecord.balance.toString() : "0"
        }],
        credits: [{
          inflowId: creditRecord?.inflowId || crypto.randomUUID().toLowerCase(),
          customerId: customerId,
          currencyId: creditRecord?.currencyId || resolvedCurrencyId,
          credit: creditRecord?.credit ? creditRecord.credit.toString() : "0"
        }],
        dues: [{
          inflowId: dueRecord?.inflowId || crypto.randomUUID().toLowerCase(),
          customerId: customerId,
          currencyId: dueRecord?.currencyId || resolvedCurrencyId,
          amountCurrent: dueRecord?.amountCurrent ? dueRecord.amountCurrent.toString() : "0",
          amount1To30: dueRecord?.amount1To30 ? dueRecord.amount1To30.toString() : "0",
          amount31To60: dueRecord?.amount31To60 ? dueRecord.amount31To60.toString() : "0",
          amount61Plus: dueRecord?.amount61Plus ? dueRecord.amount61Plus.toString() : "0"
        }],

        addresses: finalAddresses.map(addr => ({
          customerAddressId: addr.inflowId,
          customerId: customerId,
          name: addr.name,
          addressType: addr.addressType,
          address1: addr.address1,
          address2: addr.address2,
          city: addr.city,
          state: addr.state,
          postalCode: addr.postalCode,
          country: addr.country,
          remarks: addr.remarks
        })),
        customFields: {
          custom1: customFields.custom1 || null,
          custom2: customFields.custom2 || null,
          custom3: customFields.custom3 || null,
          custom4: customFields.custom4 || null,
          custom5: customFields.custom5 || null,
          custom6: customFields.custom6 || null,
          custom7: customFields.custom7 || null,
          custom8: customFields.custom8 || null,
          custom9: customFields.custom9 || null,
          custom10: customFields.custom10 || null,
        }
      };

      return { res: updatedCustomer, inflowPayload };
    });

    if (!result.res || !result.inflowPayload) {
      return NextResponse.json({ error: "Failed to assemble customer components." }, { status: 500 });
    }

    const { cloudId, ...cleanInflowPayload } = result.inflowPayload;

    // ==========================================
    // 🏢 STEP 1: DISPATCH CLOUD SYNC JOB
    // ==========================================
    const validCloudWebhook = await WebhookService.getCloudWebhookURL("customer");

    if (validCloudWebhook) {
      await getMidSyncQueue().add(
        "customer_cloudsync_job",
        {
          source: "CUSTOMER_UPSERT_CLOUD",
          model: "Customer",
          payload: {
            ...cleanInflowPayload,
            customerId: cloudId,
          },
          timestamp: new Date().toISOString(),
        },
        { 
          attempts: 3, 
          backoff: { type: "exponential", delay: 2000 },
          removeOnComplete: true
        }
      );
      console.log(`[Queue] Successfully broadcasted patch edits to inflow cloud.`);
    }

    // ==========================================
    // 📍 STEP 2: BROADCAST LOCAL SYNC JOBS
    // ==========================================
    const validWebhooks = await WebhookService.getLocationWebhookURLByLocationID(
      cleanInflowPayload.defaultLocationId as string, "customerLocal"
    );

    if (validWebhooks.length > 0) {
      // 🗺️ Query global and contextual structural state registry dependencies concurrently
      const [
        existingMappings,
        existingCurrencyMaps,
        existingPricingMaps,
        existingPaymentTermMaps,
        existingTaxingMaps
      ] = await Promise.all([
        prisma.customerLocationMap.findMany({ where: { customerId: cloudId }, select: { locationId: true, localId: true } }),
        prisma.currencyLocationMap.findMany({ where: { currencyId: cleanInflowPayload.currencyId }, select: { locationId: true, localId: true } }),
        prisma.pricingSchemeLocationMap.findMany({ where: { pricingSchemeId: cleanInflowPayload.pricingSchemeId as string || undefined }, select: { locationId: true, localId: true } }),
        prisma.paymentTermLocationMap.findMany({ where: { paymentTermId: cleanInflowPayload.defaultPaymentTermsId as string || undefined }, select: { locationId: true, localId: true } }),
        prisma.taxingSchemeLocationMap.findMany({ where: { taxingSchemeId: cleanInflowPayload.taxingSchemeId as string || undefined }, select: { locationId: true, localId: true } })
      ]);

      const jobsToQueue = validWebhooks
        .filter(webhook => webhook.location.url && webhook.location.url.trim() !== "")
        .map((webhook) => {
          
          const match = existingMappings.find(m => m.locationId === webhook.locationId);
          const currencyMatch = existingCurrencyMaps.find(m => m.locationId === webhook.locationId);
          const paymentMatch = existingPaymentTermMaps.find(m => m.locationId === webhook.locationId);
          const pricingMatch = existingPricingMaps.find(m => m.locationId === webhook.locationId);
          const taxingMatch = existingTaxingMaps.find(m => m.locationId === webhook.locationId);

          return {
            name: "customer_localsync_job",
            data: {
              source: "CUSTOMER_UPSERT_LOCAL",
              model: "Customer",
              payload: {
                ...cleanInflowPayload,
                customerId: cloudId, 
                localId: match ? match.localId : null, 

                // local sub-object overrides
                defaultBillingAddressId: null,
                defaultShippingAddressId: null,
                defaultLocationId: null,
                currencyId: currencyMatch?.localId || null,
                defaultPaymentTermsId: paymentMatch?.localId || null,
                pricingSchemeId: pricingMatch?.localId || null,
                taxingSchemeId: taxingMatch?.localId || null,

                // 📊 Financial Array Tracking Mapping Overrides
                // balances: cleanInflowPayload.balances.map(b => ({
                //   ...b,
                //   currencyId: currencyMatch?.localId || null,
                //   localId: null
                // })),
                // credits: cleanInflowPayload.credits.map(c => ({
                //   ...c,
                //   currencyId: currencyMatch?.localId || null,
                //   localId: null
                // })),
                // dues: cleanInflowPayload.dues.map(d => ({
                //   ...d,
                //   currencyId: currencyMatch?.localId || null,
                //   localId: null
                // })),

                // 💡 Addresses nested map configuration with updated type checking 
                addresses: cleanInflowPayload.addresses.map((addr) => {
                  const resolvedNumericType = addr.addressType ? (ADDRESS_TYPE_MAP[addr.addressType] ?? 0) : 0;
                  return {
                    ...addr,
                    addressType: resolvedNumericType, // Maps securely to integer 0, 1, or 2 flags
                    localId: null, 
                    customerId: match ? match.localId : null, 
                  };
                }),
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
      console.log(`[Queue] Successfully broadcasted patch edits to ${jobsToQueue.length} store instances.`);
    }

    return NextResponse.json(result.res, { status: 200 });
  } catch (error: any) {
    console.error("[CUSTOMER_PATCH_ERROR]:", error);
    return NextResponse.json({ error: error.message || "Internal failure modifying transactional parameters." }, { status: 500 });
  }
}

// export async function POST(request: NextRequest) {
//   try {
//     const body = await request.json();
//     const { 
//       name, contactName, email, phone, fax, website, remarks, isActive, 
//       taxExemptNumber, defaultCarrier, defaultPaymentMethod, discount, 
//       defaultLocationId, defaultPaymentTermsId, pricingSchemeId, taxingSchemeId, 
//       defaultSalesRepTeamMemberId, addresses = [], customFields = {}
//     } = body;

//     if (!name?.trim()) {
//       return NextResponse.json({ error: "Missing required business name field." }, { status: 400 });
//     }

//     const customerId = crypto.randomUUID().toLowerCase();
//     const cleanEmail = email?.trim().toLowerCase() || null;

//     // Execute database operations safely inside a single ACID isolation boundary
//     const result = await prisma.$transaction(async (tx) => {

//       // 1. Fetch Currency ID early in the block
//       const targetPricingScheme = pricingSchemeId 
//         ? await tx.pricingScheme.findUnique({ where: { inflowId: pricingSchemeId }, select: { currencyId: true } })
//         : null;
//       const currencyId = targetPricingScheme?.currencyId || "USD";

//       // 2. Create Parent Business Partner Node
//       const businessPartner = await tx.businessPartner.create({
//         data: { 
//           name: name.trim(), 
//           contactName: contactName?.trim(), 
//           email: cleanEmail, 
//           phone: phone?.trim(), 
//           fax: fax?.trim(), 
//           website: website?.trim(), 
//           remarks: remarks?.trim(), 
//           isActive: isActive ?? true 
//         }
//       });

//       // 3. Create Related Address Vectors
//       const savedAddresses = await Promise.all(
//         addresses.map(async (addr: any) => {
//           const addressId = crypto.randomUUID().toLowerCase();
//           return await tx.businessPartnerAddress.create({
//             data: {
//               businessPartnerId: businessPartner.id,
//               inflowId: addressId,
//               name: addr.name?.trim() || "Primary Address",
//               address1: addr.address1?.trim() || "",
//               address2: addr.address2?.trim() || null,
//               city: addr.city?.trim() || "",
//               state: addr.state?.trim() || "",
//               country: addr.country?.trim() || "Philippines",
//               postalCode: addr.postalCode?.trim() || "",
//               remarks: addr.remarks?.trim() || null,
//               addressType: addr.addressType || "Commercial"
//             }
//           });
//         })
//       );

//       // Determine explicit structural fallback selectors
//       const billingIndex = addresses.findIndex((a: any) => a.isDefaultBilling === true);
//       const shippingIndex = addresses.findIndex((a: any) => a.isDefaultShipping === true);
      
//       const billingInflowId = savedAddresses[billingIndex >= 0 ? billingIndex : 0]?.inflowId || null;
//       const shippingInflowId = savedAddresses[shippingIndex >= 0 ? shippingIndex : 0]?.inflowId || null;

//       // 5. Setup Core Customer Record Block
//       const customer = await tx.customer.create({
//         data: {
//           businessPartnerId: businessPartner.id,
//           inflowId: customerId,
//           taxExemptNumber: taxExemptNumber?.trim() || null,
//           defaultCarrier: defaultCarrier?.trim() || null,
//           defaultPaymentMethod: defaultPaymentMethod?.trim() || null,
//           discount: discount ? new Prisma.Decimal(discount) : 0,
//           defaultLocationId: defaultLocationId || null,
//           defaultPaymentTermsId: defaultPaymentTermsId || null,
//           pricingSchemeId: pricingSchemeId || null,
//           taxingSchemeId: taxingSchemeId || null,
//           defaultSalesRepTeamMemberId: defaultSalesRepTeamMemberId || null,
//           defaultBillingAddressId: billingInflowId,
//           defaultShippingAddressId: shippingInflowId
//         }
//       });

//       // 6. Seeding Financial Summaries concurrently
//       await Promise.all([
//         tx.customerBalance.create({ data: { inflowId: crypto.randomUUID().toLowerCase(), customerId, currencyId, balance: 0 } }),
//         tx.customerCredit.create({ data: { inflowId: crypto.randomUUID().toLowerCase(), customerId, currencyId, credit: 0 } }),
//         tx.customerDue.create({ data: { inflowId: crypto.randomUUID().toLowerCase(), customerId, currencyId, amountCurrent: 0, amount1To30: 0, amount31To60: 0, amount61Plus: 0 } })
//       ]);

//       // 7. Construct Outbound payload representation
//       const inflowPayload = {
//         cloudId: customer.inflowId, 
//         name: businessPartner.name,
//         contactName: businessPartner.contactName,
//         email: businessPartner.email,
//         phone: businessPartner.phone,
//         fax: businessPartner.fax,
//         website: businessPartner.website,
//         remarks: businessPartner.remarks,
//         discount: customer.discount ? customer.discount.toString() : null,
//         isActive: businessPartner.isActive,
//         taxExemptNumber: customer.taxExemptNumber,
//         defaultLocationId: customer.defaultLocationId,
//         defaultCarrier: customer.defaultCarrier,
//         defaultPaymentMethod: customer.defaultPaymentMethod,
//         defaultPaymentTermsId: customer.defaultPaymentTermsId,
//         pricingSchemeId: customer.pricingSchemeId,
//         taxingSchemeId: customer.taxingSchemeId,
//         defaultSalesRepTeamMemberId: customer.defaultSalesRepTeamMemberId,
//         defaultBillingAddressId: customer.defaultBillingAddressId,
//         defaultShippingAddressId: customer.defaultShippingAddressId,
//         addresses: savedAddresses.map(addr => ({
//           customerAddressId: addr.inflowId,
//           customerId: customer.inflowId,
//           name: addr.name,
//           address: {
//             addressType: addr.addressType,
//             address1: addr.address1,
//             address2: addr.address2,
//             city: addr.city,
//             state: addr.state,
//             postalCode: addr.postalCode,
//             country: addr.country,
//             remarks: addr.remarks
//           }
//         })),
//         customFields: {
//           custom1: customFields.custom1 || null,
//           custom2: customFields.custom2 || null,
//           custom3: customFields.custom3 || null,
//           custom4: customFields.custom4 || null,
//           custom5: customFields.custom5 || null,
//           custom6: customFields.custom6 || null,
//           custom7: customFields.custom7 || null,
//           custom8: customFields.custom8 || null,
//           custom9: customFields.custom9 || null,
//           custom10: customFields.custom10 || null,
//         }
//       };

//       return { res: customer, inflowPayload };
//     });

//     if (!result.res || !result.inflowPayload) {
//       return NextResponse.json({ error: "Failed to assemble customer components." }, { status: 500 });
//     }

//     const { cloudId, ...cleanInflowPayload } = result.inflowPayload;

//     // ==========================================
//     // 🏢 STEP 1: DISPATCH CLOUD SYNC JOB
//     // ==========================================
//     const validCloudWebhook = await WebhookService.getCloudWebhookURL("customer");

//     if (validCloudWebhook) {
//       await getMidSyncQueue().add(
//         "customer_cloudsync_job",
//         {
//           source: "CUSTOMER_UPSERT_CLOUD",
//           model: "Customer",
//           payload: {
//             ...cleanInflowPayload,
//             currencyId: cloudId,
//           },
//           timestamp: new Date().toISOString(),
//         },
//         { 
//           attempts: 3, 
//           backoff: { type: "exponential", delay: 2000 },
//           removeOnComplete: true
//         }
//       );
//       console.log(`[Queue] Successfully broadcasted sync job to inflow cloud.`);
//     }

//     // ==========================================
//     // 📍 STEP 2: BROADCAST LOCAL SYNC JOBS
//     // ==========================================
//     const validWebhooks = await WebhookService.getLocationWebhookURLs("customerLocal");

//     if (validWebhooks.length > 0) {
//       const jobsToQueue = validWebhooks
//       .filter(webhook => webhook.location.url && webhook.location.url.trim() !== "")
//       .map((webhook) => ({
//         name: "customer_localsync_job",
//         data: {
//           source: "CUSTOMER_UPSERT_LOCAL",
//           model: "Customer", 
//           payload: {
//             ...cleanInflowPayload,
//             currencyId: cloudId, 
//             localId: null, 
//           },
//           timestamp: new Date().toISOString(),
//           location: {
//             inflowId: webhook.locationId,
//             url: webhook.location.url,
//             name: webhook.location.name
//           }
//         },
//         opts: { 
//           attempts: 3, 
//           backoff: { type: "exponential", delay: 2000 },
//           removeOnComplete: true
//         }
//       }));

//       await getMidSyncQueue().addBulk(jobsToQueue);
//       console.log(`[Queue] Successfully broadcasted sync jobs to ${jobsToQueue.length} locations.`);
//     }

//     return NextResponse.json(result.res, { status: 201 });
//   } catch (error) {
//     console.error("[CUSTOMER_POST_ERROR]:", error);
//     return NextResponse.json({ error: "Failed to process customer creation pipeline." }, { status: 500 });
//   }
// }



// Address Type Mapper dictionary used for local legacy systems integer codes




// export async function POST(request: NextRequest) {
//   try {
//     const body = await request.json();
//     const { 
//       name, contactName, email, phone, fax, website, remarks, isActive, 
//       taxExemptNumber, defaultCarrier, defaultPaymentMethod, discount, 
//       defaultLocationId, defaultPaymentTermsId, pricingSchemeId, taxingSchemeId, 
//       defaultSalesRepTeamMemberId, addresses = [], customFields = {}
//     } = body;

//     if (!name?.trim()) {
//       return NextResponse.json({ error: "Missing required business name field." }, { status: 400 });
//     }

//     // Form clean native GUIDs to ensure 100% downstream compliance with inFlow's database schema
//     const customerId = crypto.randomUUID().toLowerCase();
//     const cleanEmail = email?.trim().toLowerCase() || null;

//     const lastCustomer = await prisma.customer.findFirst({
//       where: { defaultLocationId },
//       orderBy: {
//         localId: "desc",
//       },
//       select: {
//         localId: true,
//       },
//     });

//     const nextLocalId =
//       ((parseInt(lastCustomer?.localId ?? "0", 10)) + 1)
//         .toString()
//         .padStart(7, "0");

//     const customer = await prisma.customer.findFirst({
//       where: {
//         inflowId: defaultLocationId,
//       },
//       include: {
//         businessPartner: {
//           include: {
//             addresses: {
//               select: {
//                 localId: true,
//               },
//               orderBy: {
//                 localId: "desc",
//               },
//               take: 1,
//             },
//           },
//         },
//       },
//     });

//     const nextLocalAddressId =
//       ((parseInt(customer?.businessPartner?.addresses?.[0].localId ?? "0", 10)) + 1)
//         .toString()
//         .padStart(7, "0");


//     const result = await prisma.$transaction(async (tx) => {
//       // 1. Create Parent Business Partner Node
//       const businessPartner = await tx.businessPartner.create({
//         data: { 
//           name: name.trim(), 
//           contactName: contactName?.trim(), 
//           email: cleanEmail, 
//           phone: phone?.trim(), 
//           fax: fax?.trim(), 
//           website: website?.trim(), 
//           remarks: remarks?.trim(), 
//           isActive: isActive ?? true 
//         }
//       });

//       // 2. Create Related Address Vectors
//       const savedAddresses = await Promise.all(
//         addresses.map(async (addr: any) => {
//           const addressId = crypto.randomUUID().toLowerCase(); // Native UUID string
//           return await tx.businessPartnerAddress.create({
//             data: {
//               businessPartnerId: businessPartner.id,
//               inflowId: addressId,

//               name: addr.name?.trim() || "Primary Address",
//               address1: addr.address1?.trim() || "",
//               address2: addr.address2?.trim() || null,
//               city: addr.city?.trim() || "",
//               state: addr.state?.trim() || "",
//               country: addr.country?.trim() || "Philippines",
//               postalCode: addr.postalCode?.trim() || "",
//               remarks: addr.remarks?.trim() || null,
//               addressType: addr.addressType || "Commercial"
//             }
//           });
//         })
//       );

//       // Determine explicit structural fallback selectors
//       const billingIndex = addresses.findIndex((a: any) => a.isDefaultBilling === true);
//       const shippingIndex = addresses.findIndex((a: any) => a.isDefaultShipping === true);
      
//       const billingInflowId = savedAddresses[billingIndex >= 0 ? billingIndex : 0]?.inflowId || null;
//       const shippingInflowId = savedAddresses[shippingIndex >= 0 ? shippingIndex : 0]?.inflowId || null;

//       // 3. Setup Core Customer Record Block
//       const customer = await tx.customer.create({
//         data: {
//           businessPartnerId: businessPartner.id,
//           inflowId: customerId,
//           localId: nextLocalId,
//           taxExemptNumber: taxExemptNumber?.trim() || null,
//           defaultCarrier: defaultCarrier?.trim() || null,
//           defaultPaymentMethod: defaultPaymentMethod?.trim() || null,
//           discount: discount ? new Prisma.Decimal(discount) : 0,
//           defaultLocationId: defaultLocationId || null,
//           defaultPaymentTermsId: defaultPaymentTermsId || null,
//           pricingSchemeId: pricingSchemeId || null,
//           taxingSchemeId: taxingSchemeId || null,
//           defaultSalesRepTeamMemberId: defaultSalesRepTeamMemberId || null,
//           defaultBillingAddressId: billingInflowId,
//           defaultShippingAddressId: shippingInflowId
//         }
//       });

//       // 4. Seeding Financial Summaries
//       const targetPricingScheme = pricingSchemeId 
//         ? await tx.pricingScheme.findUnique({ where: { inflowId: pricingSchemeId }, select: { currencyId: true } })
//         : null;

//       const currencyId = targetPricingScheme?.currencyId || "USD";

//       await Promise.all([
//         tx.customerBalance.create({ data: { inflowId: crypto.randomUUID().toLowerCase(), localId: nextLocalId, customerId, currencyId, balance: 0 } }),
//         tx.customerCredit.create({ data: { inflowId: crypto.randomUUID().toLowerCase(), localId: nextLocalId, customerId, currencyId, credit: 0 } }),
//         tx.customerDue.create({ data: { inflowId: crypto.randomUUID().toLowerCase(), localId: nextLocalId, customerId, currencyId, amountCurrent: 0, amount1To30: 0, amount31To60: 0, amount61Plus: 0 } })
//       ]);

//       /**
//        * STEP 5: Construct Outbound inFlow-Compliant Nested Payload Representation
//        */
//       const inflowPayload = {
//         id: customer.id,
//         customerId: nextLocalId,
//         name: businessPartner.name,
//         contactName: businessPartner.contactName,
//         email: businessPartner.email,
//         phone: businessPartner.phone,
//         fax: businessPartner.fax,
//         website: businessPartner.website,
//         remarks: businessPartner.remarks,
//         discount: customer.discount ? customer.discount.toString() : null,
//         isActive: businessPartner.isActive,
//         taxExemptNumber: customer.taxExemptNumber,
//         defaultLocationId: customer.defaultLocationId,
//         defaultCarrier: customer.defaultCarrier,
//         defaultPaymentMethod: customer.defaultPaymentMethod,
//         defaultPaymentTermsId: customer.defaultPaymentTermsId,
//         pricingSchemeId: customer.pricingSchemeId,
//         taxingSchemeId: customer.taxingSchemeId,
//         defaultSalesRepTeamMemberId: customer.defaultSalesRepTeamMemberId,
//         defaultBillingAddressId: customer.defaultBillingAddressId,
//         defaultShippingAddressId: customer.defaultShippingAddressId,
//         addresses: savedAddresses.map(addr => ({
//           customerAddressId: addr.inflowId,
//           customerId: customer.inflowId,
//           name: addr.name,
//           address: {
//             addressType: addr.addressType,
//             address1: addr.address1,
//             address2: addr.address2,
//             city: addr.city,
//             state: addr.state,
//             postalCode: addr.postalCode,
//             country: addr.country,
//             remarks: addr.remarks
//           }
//         })),
//         customFields: {
//           custom1: customFields.custom1 || null,
//           custom2: customFields.custom2 || null,
//           custom3: customFields.custom3 || null,
//           custom4: customFields.custom4 || null,
//           custom5: customFields.custom5 || null,
//           custom6: customFields.custom6 || null,
//           custom7: customFields.custom7 || null,
//           custom8: customFields.custom8 || null,
//           custom9: customFields.custom9 || null,
//           custom10: customFields.custom10 || null,
//         }
//       };

//       return { customer, inflowPayload };
//     });

//     // 6. Push safely to background worker queue outside the active DB transaction scope
//     await getMidSyncQueue().add(
//       "customer_sync_job",
//       {
//         source: "CUSTOMER_SYNC_API",
//         model: "CUSTOMER",
//         payload: result.inflowPayload,
//         timestamp: new Date().toISOString(),
//         locationId: defaultLocationId
//       },
//       { 
//         attempts: 3, 
//         backoff: { type: "exponential", delay: 2000 },
//         removeOnComplete: true
//       }
//     );

//     return NextResponse.json(result.customer, { status: 201 });
//   } catch (error) {
//     console.error("[CUSTOMER_POST_ERROR]:", error);
    
//     return NextResponse.json({ error: "Failed to process customer creation pipeline." }, { status: 500 });
//   }
// }

