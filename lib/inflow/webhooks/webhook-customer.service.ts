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
  static async handleCustomerCreate(inflowId: string, eventId?: string): Promise<CustomerSyncResult> {
    console.log(`[Webhook Service] Processing real-time creation for customer ID: ${inflowId}`);
    const result = await this.syncCustomerPayload(inflowId);

    if (result.success && eventId) {
      await prisma.inflowWebhookEvent.update({
        where: { id: eventId },
        data: { processed: true }
      });
    }
    return result;
  }

  static async handleCustomerUpdate(inflowId: string, eventId?: string): Promise<CustomerSyncResult> {
    console.log(`[Webhook Service] Processing real-time update for customer ID: ${inflowId}`);
    const result = await this.syncCustomerPayload(inflowId);

    if (result.success && eventId) {
      await prisma.inflowWebhookEvent.update({
        where: { id: eventId },
        data: { processed: true }
      });
    }
    return result;
  }

  private static async syncCustomerPayload(inflowId: string): Promise<CustomerSyncResult> {
    if (!inflowId) {
      throw new Error("Cannot process Customer webhook without a valid inflowId.");
    }

    const fullCustomerData = await getCustomer(inflowId);
    if (!fullCustomerData) {
      throw new Error(`Customer data for ID ${inflowId} could not be retrieved from the API.`);
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