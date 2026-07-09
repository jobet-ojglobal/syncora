// lib/locations/services/webhook-taxing-scheme.service.ts
import { prisma } from "@/lib/prisma";

export interface SyncResult {
  success: boolean;
  message?: string;
  inflowPayload?: any; // Matches your STEP 5 schema
}

export class MappingWebhookService {

  static async handleTaxingSchemeMap(inflowId: string, localId: string, eventId: string, locationId: string): Promise<SyncResult> {
    console.log(`[Webhook Service] Processing real-time update for taxing scheme ID: ${inflowId}`);
    
    const result = await prisma.taxingSchemeLocationMap.upsert({
      where: {
        taxingSchemeId_locationId: {
          taxingSchemeId: inflowId, 
          locationId: locationId,   
        }
      },
      update: {
        localId: Number(localId)            
      },
      create: {
        taxingSchemeId: inflowId,
        locationId: locationId,
        localId: Number(localId)
      }
    });

    if (result && eventId) {
      await prisma.locationWebhookEvent.update({
        where: { id: eventId },
        data: { processed: true }
      });

      return { success: true };
    }

    return { success: false };
  }

  static async handleCustomerMap(inflowId: string, localId: string, eventId: string, locationId: string): Promise<SyncResult> {
    console.log(`[Webhook Service] Processing real-time update for taxing scheme ID: ${inflowId}`);
    
    const result = await prisma.customerLocationMap.upsert({
      where: {
        customerId_locationId: {
          customerId: inflowId, // Central cloudId string
          locationId: locationId,          // Location branch identifier string
        }
      },
      update: {
        localId: Number(localId)               // Ensure it registers cleanly as an Int
      },
      create: {
        customerId: inflowId,
        locationId: locationId,
        localId: Number(localId)
      }
    });

    if (result && eventId) {
      await prisma.locationWebhookEvent.update({
        where: { id: eventId },
        data: { processed: true }
      });

      return { success: true };
    }

    return { success: false };
  }

  static async handleCurrencyMap(inflowId: string, localId: string, eventId: string, locationId: string): Promise<SyncResult> {
    console.log(`[Webhook Service] Processing real-time update for taxing scheme ID: ${inflowId}`);
    
    const result = await prisma.currencyLocationMap.upsert({
      where: {
        currencyId_locationId: {
          currencyId: inflowId, // Central cloudId string
          locationId: locationId,          // Location branch identifier string
        }
      },
      update: {
        localId: Number(localId)               // Ensure it registers cleanly as an Int
      },
      create: {
        currencyId: inflowId,
        locationId: locationId,
        localId: Number(localId)
      }
    });

    if (result && eventId) {
      await prisma.locationWebhookEvent.update({
        where: { id: eventId },
        data: { processed: true }
      });

      return { success: true };
    }

    return { success: false };
  }

  
}

