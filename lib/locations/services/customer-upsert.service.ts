// lib/locations/services/webhook-customer.service.ts
import { prisma } from "@/lib/prisma";
import { syncCustomer } from "@/lib/inflow/services/customer.sync";
import { getCustomer } from "../data/customer";
import crypto from "crypto";

export interface CustomerSyncResult {
  success: boolean;
  message?: string;
  inflowPayload?: any;
}

export class InflowCustomerWebhookService {

  static async handleCustomerUpsert(batchId: string, eventId: string, locationId: string): Promise<CustomerSyncResult> {
    console.log(`[Webhook Service] Processing real-time update for customer ID: ${batchId}`);
    
    const location = await prisma.location.findUnique({
      where: { inflowId: locationId },
      select: { inflowId: true, url: true }
    });

    if (!location?.url) {
      throw new Error(`Location not found.`);
    }

    const result = await this.syncCustomerPayload(batchId, location.inflowId, location.url);

    if (result.success && eventId) {
      await prisma.locationWebhookEvent.update({
        where: { id: eventId },
        data: { processed: true }
      });
    }
    return result;
  }

  private static async syncCustomerPayload(batchId: string, locationId: string, locationUrl: string): Promise<CustomerSyncResult> {
    if (!batchId) {
      throw new Error("Cannot process Customer webhook without a valid batchId.");
    }

    const fullCustomerData = await getCustomer(batchId, locationUrl);
    if (!fullCustomerData) {
      throw new Error(`Customer data for ID ${batchId} could not be retrieved from the API.`);
    }

    // 1. Resolve Global Customer Identifier Identity
    const existingCustomerMap = await prisma.customerLocationMap.findFirst({
      where: { locationId, localId: Number(fullCustomerData.customerId) },
      select: { customerId: true }
    });
    const globalCustomerId = existingCustomerMap?.customerId || crypto.randomUUID().toLowerCase();

    /**
     * 2. Dependency Conversion Strategy (Integer IDs -> Global String IDs)
     */
    
    // Resolve Payment Terms Mapping
    let globalPaymentTermsId: string | null = fullCustomerData.defaultPaymentTermsId || null;
    if (fullCustomerData.defaultPaymentTermsId) {
      const termMap = await prisma.paymentTermLocationMap.findFirst({
        where: { locationId, localId: Number(fullCustomerData.defaultPaymentTermsId) },
        select: { paymentTermId: true }
      });
      globalPaymentTermsId = termMap?.paymentTermId || null;
    }

    // Resolve Pricing Scheme Mapping
    let globalPricingSchemeId: string | null = fullCustomerData.pricingSchemeId || null;
    if (fullCustomerData.pricingSchemeId) {
      const pricingMap = await prisma.pricingSchemeLocationMap.findFirst({
        where: { locationId, localId: Number(fullCustomerData.pricingSchemeId) },
        select: { pricingSchemeId: true }
      });
      globalPricingSchemeId = pricingMap?.pricingSchemeId || null;
    }

    // Resolve Taxing Scheme Mapping
    let globalTaxingSchemeId: string | null = fullCustomerData.taxingSchemeId || null;
    if (fullCustomerData.taxingSchemeId) {
      const taxingMap = await prisma.taxingSchemeLocationMap.findFirst({
        where: { locationId, localId: Number(fullCustomerData.taxingSchemeId) },
        select: { taxingSchemeId: true }
      });
      globalTaxingSchemeId = taxingMap?.taxingSchemeId || null;
    }

    // Resolve Default Location Mapping
    // let globalDefaultLocationId: string | null = fullCustomerData.defaultLocationId || null;
    // if (fullCustomerData.defaultLocationId) {
    //   const locMap = await prisma.locationLocationMap.findFirst({
    //     where: { locationId, localId: Number(fullCustomerData.defaultLocationId) },
    //     select: { globalLocationId: true } // Assuming your schema naming format
    //   });
    //   globalDefaultLocationId = locMap?.globalLocationId || fullCustomerData.defaultLocationId;
    // }

    /**
     * 3. Dependent List Maps (Balances, Credits, Dues, Addresses)
     */
    let formattedBalances: any[] = [];
    if (fullCustomerData.balances) {
      formattedBalances = await Promise.all(
        fullCustomerData.balances.map(async (b) => {
          const currencyMap = await prisma.currencyLocationMap.findFirst({
            where: { locationId, localId: Number(b.currencyId) },
            select: { currencyId: true }
          });
          const balanceMap = await prisma.customerBalanceLocationMap.findFirst({
            where: { locationId, localId: Number(b.customerBalanceId) },
            select: { customerBalanceId: true }
          });
          return {
            customerBalanceId: balanceMap?.customerBalanceId || crypto.randomUUID().toLowerCase(),
            customerId: globalCustomerId,
            currencyId: currencyMap?.currencyId || null,
            balance: b.balance
          };
        })
      );
    }

    let formattedCredits: any[] = [];
    if (fullCustomerData.credits) {
      formattedCredits = await Promise.all(
        fullCustomerData.credits.map(async (c) => {
          const currencyMap = await prisma.currencyLocationMap.findFirst({
            where: { locationId, localId: Number(c.currencyId) },
            select: { currencyId: true }
          });
          const creditMap = await prisma.customerCreditLocationMap.findFirst({
            where: { locationId, localId: Number(c.customerCreditId) },
            select: { customerCreditId: true }
          });
          return {
            customerCreditId: creditMap?.customerCreditId || crypto.randomUUID().toLowerCase(),
            customerId: globalCustomerId,
            currencyId: currencyMap?.currencyId || null,
            credit: c.credit
          };
        })
      );
    }

    let formattedDues: any[] = [];
    if (fullCustomerData.dues) {
      formattedDues = await Promise.all(
        fullCustomerData.dues.map(async (d) => {
          const currencyMap = await prisma.currencyLocationMap.findFirst({
            where: { locationId, localId: Number(d.currencyId) },
            select: { currencyId: true }
          });
          const dueMap = await prisma.customerDueLocationMap.findFirst({
            where: { locationId, localId: Number(d.customerDueId) },
            select: { customerDueId: true }
          });
          return {
            customerDueId: dueMap?.customerDueId || crypto.randomUUID().toLowerCase(),
            customerId: globalCustomerId,
            currencyId: currencyMap?.currencyId || null,
            amountCurrent: d.amountCurrent,
            amount1To30: d.amount1To30,
            amount31To60: d.amount31To60,
            amount61Plus: d.amount61Plus
          };
        })
      );
    }

    const formattedAddresses = (fullCustomerData.addresses || []).map((addr) => ({
      customerAddressId: addr.customerAddressId || crypto.randomUUID().toLowerCase(),
      customerId: globalCustomerId,
      name: addr.name,
      address: addr.address
    }));

    /**
     * 4. Synthesize Uniform Clean Object Type
     */
    const alignedCustomerPayload = {
      ...fullCustomerData,
      customerId: globalCustomerId,
      defaultLocationId: locationId,
      defaultPaymentTermsId: globalPaymentTermsId,
      pricingSchemeId: globalPricingSchemeId,
      taxingSchemeId: globalTaxingSchemeId,
      balances: formattedBalances,
      credits: formattedCredits,
      dues: formattedDues,
      addresses: formattedAddresses,
      defaultBillingAddress: formattedAddresses.find(
        a => a.customerAddressId === fullCustomerData.defaultBillingAddress?.customerAddressId
      ) || fullCustomerData.defaultBillingAddress,
      defaultShippingAddress: formattedAddresses.find(
        a => a.customerAddressId === fullCustomerData.defaultShippingAddress?.customerAddressId
      ) || fullCustomerData.defaultShippingAddress,
    };

    // 5. Hydrate Validation Synchronization Caches
    const locationIds = new Set<string>();
    const paymentTermsIds = new Set<string>();

    if (alignedCustomerPayload.defaultLocationId) locationIds.add(alignedCustomerPayload.defaultLocationId);
    if (alignedCustomerPayload.defaultPaymentTermsId) paymentTermsIds.add(alignedCustomerPayload.defaultPaymentTermsId);

    const [dbLocations, dbTerms] = await Promise.all([
      prisma.location.findMany({ where: { inflowId: { in: Array.from(locationIds) } }, select: { inflowId: true } }),
      prisma.paymentTerm.findMany({ where: { inflowId: { in: Array.from(paymentTermsIds) } }, select: { inflowId: true } }),
    ]);

    const caches = {
      verifiedLocationIds: new Set(dbLocations.map((l) => l.inflowId)),
      verifiedPaymentTermsIds: new Set(dbTerms.map((t) => t.inflowId)),
    };

    // 6. Run safe sequential transactions
    let finalPayload: any;
    await prisma.$transaction(async (tx) => {
      finalPayload = await syncCustomer(tx, alignedCustomerPayload, caches);

      // Create mapping if customer doesn't exist yet
      if (!existingCustomerMap) {
        await tx.customerLocationMap.create({
          data: {
            customerId: globalCustomerId,
            locationId: locationId,
            localId: Number(fullCustomerData.customerId)
          }
        });

        for (const fb of formattedBalances) {
          await tx.customerBalanceLocationMap.create({
            data: { customerBalanceId: fb.customerBalanceId, locationId, localId: Number(fb.customerBalanceId) }
          });
        }
        for (const fc of formattedCredits) {
          await tx.customerCreditLocationMap.create({
            data: { customerCreditId: fc.customerCreditId, locationId, localId: Number(fc.customerCreditId) }
          });
        }
        for (const fd of formattedDues) {
          await tx.customerDueLocationMap.create({
            data: { customerDueId: fd.customerDueId, locationId, localId: Number(fd.customerDueId) }
          });
        }
      }
    });

    return {
      success: true,
      inflowPayload: finalPayload
    };
  }
}

// // lib/locations/services/webhook-customer.service.ts
// import { prisma } from "@/lib/prisma";
// import { syncCustomer } from "@/lib/inflow/services/customer.sync";
// import { getCustomer } from "../data/customer";

// export interface CustomerSyncResult {
//   success: boolean;
//   message?: string;
//   inflowPayload?: any; // Matches your STEP 5 schema
// }

// export class InflowCustomerWebhookService {

//   static async handleCustomerUpsert(batchId: string, eventId: string, locationId: string): Promise<CustomerSyncResult> {
//     console.log(`[Webhook Service] Processing real-time update for customer ID: ${batchId}`);
    
//     // const location = await this.findLocationByInflowId(locationId);
//     const location = await prisma.location.findUnique({
//       where: { inflowId: locationId },
//       select: { inflowId: true, url: true }
//     })

//     if (!location?.url) {
//       throw new Error(`Location not found.`);
//     }

//     const result = await this.syncCustomerPayload(batchId, location.inflowId, location.url);

//     if (result.success && eventId) {
//       await prisma.locationWebhookEvent.update({
//         where: { id: eventId },
//         data: { processed: true }
//       });
//     }
//     return result;
//   }

//   private static async syncCustomerPayload(batchId: string, locationId: string, locationUrl: string): Promise<CustomerSyncResult> {
//     if (!batchId) {
//       throw new Error("Cannot process Customer webhook without a valid batchId.");
//     }

//     const fullCustomerData = await getCustomer(batchId, locationUrl);
//     if (!fullCustomerData) {
//       throw new Error(`Customer data for ID ${batchId} could not be retrieved from the API.`);
//     }

//     const locationIds = new Set<string>();
//     const paymentTermsIds = new Set<string>();

//     if (fullCustomerData.defaultLocation?.locationId) {
//       locationIds.add(fullCustomerData.defaultLocation.locationId);
//     } else if (fullCustomerData.defaultLocationId) {
//       locationIds.add(fullCustomerData.defaultLocationId);
//     }

//     if (fullCustomerData.defaultPaymentTerms?.paymentTermsId) {
//       paymentTermsIds.add(fullCustomerData.defaultPaymentTerms.paymentTermsId);
//     } else if (fullCustomerData.defaultPaymentTermsId) {
//       paymentTermsIds.add(fullCustomerData.defaultPaymentTermsId);
//     }

//     const [dbLocations, dbTerms] = await Promise.all([
//       prisma.location.findMany({ where: { inflowId: { in: Array.from(locationIds) } }, select: { inflowId: true } }),
//       prisma.paymentTerm.findMany({ where: { inflowId: { in: Array.from(paymentTermsIds) } }, select: { inflowId: true } }),
//     ]);

//     const caches = {
//       verifiedLocationIds: new Set(dbLocations.map((l) => l.inflowId)),
//       verifiedPaymentTermsIds: new Set(dbTerms.map((t) => t.inflowId)),
//     };

//     // CRITICAL: Ensure your 'syncCustomer' function returns the built inflowPayload object!
//     const builtPayload = await prisma.$transaction(async (tx) => {
//       return await syncCustomer(tx, fullCustomerData, caches);
//     }, { timeout: 30000 }); 

//     await prisma.customerLocationMap.upsert({
//       where: {
//         customerId_locationId: {
//           customerId: builtPayload.customerId, 
//           locationId: locationId,       
//         }
//       },
//       update: {
//         localId: Number(fullCustomerData.customerId)        
//       },
//       create: {
//         customerId: builtPayload.customerId,
//         locationId: locationId,
//         localId: Number(fullCustomerData.customerId)
//       }
//     });

//     return { 
//       success: true, 
//       inflowPayload: builtPayload 
//     };
//   }

// }
