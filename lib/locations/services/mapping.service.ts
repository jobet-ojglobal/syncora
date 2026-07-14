// lib/locations/services/webhook-taxing-scheme.service.ts
import { prisma } from "@/lib/prisma";

export interface SyncResult {
  success: boolean;
  message?: string;
  inflowPayload?: any; // Matches your STEP 5 schema
}

export class MappingWebhookService {

  static async handleCategoryMap(inflowId: string, localId: string, eventId: string, locationId: string): Promise<SyncResult> {
    console.log(`[Webhook Service] Processing real-time update for category ID: ${inflowId}`);
    
    const result = await prisma.categoryLocationMap.upsert({
      where: {
        categoryId_locationId: {
          categoryId: inflowId, 
          locationId: locationId,   
        }
      },
      update: {
        localId: Number(localId)            
      },
      create: {
        categoryId: inflowId,
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

  static async handleLocationMap(inflowId: string, localId: string, eventId: string, locationId: string): Promise<SyncResult> {
    console.log(`[Webhook Service] Processing real-time update for taxing code ID: ${inflowId}`);
    
    const result = await prisma.taxCodeLocationMap.upsert({
      where: {
        taxCodeId_locationId: {
          taxCodeId: inflowId, 
          locationId: locationId,   
        }
      },
      update: {
        localId: Number(localId)            
      },
      create: {
        taxCodeId: inflowId,
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

  // static async handleCurrencyMap(inflowId: string, localId: string, eventId: string, locationId: string): Promise<SyncResult> {
  //   console.log(`[Webhook Service] Processing real-time update for taxing scheme ID: ${inflowId}`);
    
  //   const result = await prisma.currencyLocationMap.upsert({
  //     where: {
  //       currencyId_locationId: {
  //         currencyId: inflowId, 
  //         locationId: locationId,    
  //       }
  //     },
  //     update: {
  //       localId: Number(localId)   
  //     },
  //     create: {
  //       currencyId: inflowId,
  //       locationId: locationId,
  //       localId: Number(localId)
  //     }
  //   });

  //   if (result && eventId) {
  //     await prisma.locationWebhookEvent.update({
  //       where: { id: eventId },
  //       data: { processed: true }
  //     });

  //     return { success: true };
  //   }

  //   return { success: false };
  // }

  // static async handlePricingSchemeMap(inflowId: string, localId: string, eventId: string, locationId: string): Promise<SyncResult> {
  //   console.log(`[Webhook Service] Processing real-time update for Pricing Scheme ID: ${inflowId}`);
    
  //   const result = await prisma.pricingSchemeLocationMap.upsert({
  //     where: {
  //       pricingSchemeId_locationId: {
  //         pricingSchemeId: inflowId, 
  //         locationId: locationId,    
  //       }
  //     },
  //     update: {
  //       localId: Number(localId)   
  //     },
  //     create: {
  //       pricingSchemeId: inflowId,
  //       locationId: locationId,
  //       localId: Number(localId)
  //     }
  //   });

  //   if (result && eventId) {
  //     await prisma.locationWebhookEvent.update({
  //       where: { id: eventId },
  //       data: { processed: true }
  //     });

  //     return { success: true };
  //   }

  //   return { success: false };
  // }

  static async handleCustomerMap(inflowId: string, localId: string, eventId: string, locationId: string): Promise<SyncResult> {
    console.log(`[Webhook Service] Processing real-time update for customer ID: ${inflowId}`);
    
    const result = await prisma.customerLocationMap.upsert({
      where: {
        customerId_locationId: {
          customerId: inflowId, 
          locationId: locationId,    
        }
      },
      update: {
        localId: Number(localId)    
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

  

  
}

