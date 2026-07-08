// lib/locations/services/webhook-taxing-scheme.service.ts
import { prisma } from "@/lib/prisma";

export interface SyncResult {
  success: boolean;
  message?: string;
  inflowPayload?: any; // Matches your STEP 5 schema
}

export class InflowTaxingSchemeWebhookService {

  static async handleTaxingSchemeUpsert(taxingSchemeId: string, localId: string, eventId: string, locationId: string): Promise<SyncResult> {
    console.log(`[Webhook Service] Processing real-time update for taxing scheme ID: ${taxingSchemeId}`);
    
    const result = await prisma.taxingSchemeLocationMap.upsert({
      where: {
        taxingSchemeId_locationId: {
          taxingSchemeId: taxingSchemeId, // Central cloudId string
          locationId: locationId,          // Location branch identifier string
        }
      },
      update: {
        localId: Number(localId)               // Ensure it registers cleanly as an Int
      },
      create: {
        taxingSchemeId: taxingSchemeId,
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

