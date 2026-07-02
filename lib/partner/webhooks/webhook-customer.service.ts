// lib/partner/services/webhook-customer.service.ts
import { prisma } from "@/lib/prisma";
import { syncCustomer } from "@/lib/inflow/services/customer.sync";
import { getCustomer } from "../data/customers";

export interface CustomerSyncResult {
  success: boolean;
  message?: string;
  inflowPayload?: any; // Matches your STEP 5 schema
}

export class InflowCustomerWebhookService {
  static async handleCustomerCreate(batchId: string, eventId?: string): Promise<CustomerSyncResult> {
    console.log(`[Webhook Service] Processing real-time creation for customer ID: ${batchId}`);
    const result = await this.syncCustomerPayload(batchId);

    if (result.success && eventId) {
      await prisma.partnerWebhookEvent.update({
        where: { id: eventId },
        data: { processed: true }
      });
    }
    return result;
  }

  static async handleCustomerUpdate(batchId: string, eventId?: string): Promise<CustomerSyncResult> {
    console.log(`[Webhook Service] Processing real-time update for customer ID: ${batchId}`);
    const result = await this.syncCustomerPayload(batchId);

    if (result.success && eventId) {
      await prisma.partnerWebhookEvent.update({
        where: { id: eventId },
        data: { processed: true }
      });
    }
    return result;
  }

  private static async syncCustomerPayload(batchId: string): Promise<CustomerSyncResult> {
    if (!batchId) {
      throw new Error("Cannot process Customer webhook without a valid batchId.");
    }

    const fullCustomerData = await getCustomer(batchId);
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

    return { 
      success: true, 
      inflowPayload: builtPayload 
    };
  }
}

// // lib/partner/services/webhook-customer.service.ts
// import { prisma } from "@/lib/prisma";
// import { syncCustomer } from "@/lib/inflow/services/customer.sync";
// import { getCustomer } from "../data/customers";

// interface CustomerSyncResult {
//   success: boolean;
//   message?: string;
// }

// export class InflowCustomerWebhookService {
//   /**
//    * Handles the 'CustomerCreated' webhook event.
//    */
//   static async handleCustomerCreate(batchId: string, eventId?: string): Promise<CustomerSyncResult> {
//     console.log(`[Webhook Service] Processing real-time creation for customer ID: ${batchId}`);
    
//     const result = await this.syncCustomerPayload(batchId);

//     if (result.success && eventId) {
//       await prisma.partnerWebhookEvent.update({
//         where: { id: eventId },
//         data: { processed: true }
//       });
//     }

//     return result;
//   }

//   /**
//    * Handles the 'CustomerUpdated' webhook event.
//    */
//   static async handleCustomerUpdate(batchId: string, eventId?: string): Promise<CustomerSyncResult> {
//     console.log(`[Webhook Service] Processing real-time update for customer ID: ${batchId}`);
    
//     const result = await this.syncCustomerPayload(batchId);

//     if (result.success && eventId) {
//       await prisma.partnerWebhookEvent.update({
//         where: { id: eventId },
//         data: { processed: true }
//       });
//     }

//     return result;
//   }

//   /**
//    * Private Helper: Shared core logic for both customer creates and updates.
//    * Compiles the explicit verification caches expected by your sync core function.
//    */
//   private static async syncCustomerPayload(batchId: string): Promise<CustomerSyncResult> {
//     if (!batchId) {
//       throw new Error("Cannot process Customer webhook without a valid batchId.");
//     }

//     const fullCustomerData = await getCustomer(batchId);
    
//     if (!fullCustomerData) {
//       throw new Error(`Customer data for ID ${batchId} could not be retrieved from the API.`);
//     }

//     // Extract exact IDs to match syncCustomer parameter expectations
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

//     // Resolve what we already have in the DB to minimize transaction lockouts
//     const [dbLocations, dbTerms] = await Promise.all([
//       prisma.location.findMany({ where: { inflowId: { in: Array.from(locationIds) } }, select: { inflowId: true } }),
//       prisma.paymentTerm.findMany({ where: { inflowId: { in: Array.from(paymentTermsIds) } }, select: { inflowId: true } }),
//     ]);

//     // Construct caches matching parameter typing: { verifiedLocationIds: Set; verifiedPaymentTermsIds: Set }
//     const caches = {
//       verifiedLocationIds: new Set(dbLocations.map((l) => l.inflowId)),
//       verifiedPaymentTermsIds: new Set(dbTerms.map((t) => t.inflowId)),
//     };

//     // Execute atomic database operation passing the tx execution client context
//     const customer = await prisma.$transaction(async (tx) => {
//       await syncCustomer(tx, fullCustomerData, caches);
//     }, { timeout: 30000 }); 

//     return { success: true };
//   }
// }