// lib/locations/services/webhook-customer.service.ts
import { prisma } from "@/lib/prisma";
import { syncCustomer } from "@/lib/inflow/services/customer.sync";
import { getCustomer } from "../data/customer";

export interface CustomerSyncResult {
  success: boolean;
  message?: string;
  inflowPayload?: any; // Matches your STEP 5 schema
}

export class InflowCustomerWebhookService {

  static async handleCustomerUpsert(batchId: string, eventId: string, locationId: string): Promise<CustomerSyncResult> {
    console.log(`[Webhook Service] Processing real-time update for customer ID: ${batchId}`);
    
    // const location = await this.findLocationByInflowId(locationId);
    const location = await prisma.location.findUnique({
      where: { inflowId: locationId },
      select: { inflowId: true, url: true }
    })

    if (!location?.url) {
      throw new Error(`Location not found.`);
    }

    const result = await this.syncCustomerPayload(batchId, location.url);

    if (result.success && eventId) {
      await prisma.locationWebhookEvent.update({
        where: { id: eventId },
        data: { processed: true }
      });
    }
    return result;
  }

  private static async syncCustomerPayload(batchId: string, locationUrl: string): Promise<CustomerSyncResult> {
    if (!batchId) {
      throw new Error("Cannot process Customer webhook without a valid batchId.");
    }

    const fullCustomerData = await getCustomer(batchId, locationUrl);
    if (!fullCustomerData) {
      throw new Error(`Customer data for ID ${batchId} could not be retrieved from the API.`);
    }

    const locationIds = new Set<string>();
    const paymentTermsIds = new Set<string>();

    if (fullCustomerData.defaultLocation?.locationId) {
      locationIds.add(fullCustomerData.defaultLocation.locationId);
    } else if (fullCustomerData.defaultLocationId) {
      locationIds.add(fullCustomerData.defaultLocationId);
    }

    if (fullCustomerData.defaultPaymentTerms?.paymentTermsId) {
      paymentTermsIds.add(fullCustomerData.defaultPaymentTerms.paymentTermsId);
    } else if (fullCustomerData.defaultPaymentTermsId) {
      paymentTermsIds.add(fullCustomerData.defaultPaymentTermsId);
    }

    const [dbLocations, dbTerms] = await Promise.all([
      prisma.location.findMany({ where: { inflowId: { in: Array.from(locationIds) } }, select: { inflowId: true } }),
      prisma.paymentTerm.findMany({ where: { inflowId: { in: Array.from(paymentTermsIds) } }, select: { inflowId: true } }),
    ]);

    const caches = {
      verifiedLocationIds: new Set(dbLocations.map((l) => l.inflowId)),
      verifiedPaymentTermsIds: new Set(dbTerms.map((t) => t.inflowId)),
    };

    // CRITICAL: Ensure your 'syncCustomer' function returns the built inflowPayload object!
    const builtPayload = await prisma.$transaction(async (tx) => {
      return await syncCustomer(tx, fullCustomerData, caches);
    }, { timeout: 30000 }); 

    //  const result = await prisma.customerLocationMap.upsert({
    //     where: {
    //       customerId_locationId: {
    //         customerId: CurrencyId, 
    //         locationId: locationId,       
    //       }
    //     },
    //     update: {
    //       localId: Number(localId)        
    //     },
    //     create: {
    //       customerId: CurrencyId,
    //       locationId: locationId,
    //       localId: Number(localId)
    //     }
    //   });

    return { 
      success: true, 
      inflowPayload: builtPayload 
    };
  }
  
  private static async findLocationByInflowId(inflowId: string) {
    const location = await prisma.location.findUnique({
      where: { inflowId },
      select: { inflowId: true, url: true }
    })

    if (!location) {
      throw new Error(`Location not found.`);
    }

    return location;
  }

}

  // static async handleCustomerCreate(batchId: string, eventId: string): Promise<CustomerSyncResult> {
  //   console.log(`[Webhook Service] Processing real-time creation for customer ID: ${batchId}`);
  //   const result = await this.syncCustomerPayload(batchId);

  //   if (result.success && eventId) {
  //     await prisma.partnerWebhookEvent.update({
  //       where: { id: eventId },
  //       data: { processed: true }
  //     });
  //   }
  //   return result;
  // }

  // static async handleCustomerUpdate(batchId: string, eventId: string): Promise<CustomerSyncResult> {
  //   console.log(`[Webhook Service] Processing real-time update for customer ID: ${batchId}`);
  //   const result = await this.syncCustomerPayload(batchId);

  //   if (result.success && eventId) {
  //     await prisma.partnerWebhookEvent.update({
  //       where: { id: eventId },
  //       data: { processed: true }
  //     });
  //   }
  //   return result;
  // }