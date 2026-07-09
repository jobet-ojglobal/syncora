// lib/locations/services/webhook-taxing-scheme.service.ts
import { prisma } from "@/lib/prisma";

export interface SyncResult {
  success: boolean;
  message?: string;
  inflowPayload?: any; // Matches your STEP 5 schema
}

export class InflowCurrencyWebhookService {

  
}

