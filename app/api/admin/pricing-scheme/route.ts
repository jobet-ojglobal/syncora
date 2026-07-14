// app/api/admin/pricing-schemes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { WebhookService } from "@/services/webhook.service";
import { getMidSyncQueue } from "@/lib/queues/sync.queue";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { currencyId, name, isActive, isDefault, isTaxInclusive } = body;

    if (!name?.trim() || !currencyId) {
      return NextResponse.json({ error: "Missing required naming titles or currency relationship tokens." }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. If this matrix is flagged as global baseline, un-flag current entries to avoid schema corruption
      if (isDefault) {
        await tx.pricingScheme.updateMany({
          where: { isDefault: true },
          data: { isDefault: false }
        });
      }

      // 2. Commit transaction record row entry mapping object card onto parent scheme context
      const res = await tx.pricingScheme.create({
        data: {
          inflowId: crypto.randomUUID().toLowerCase(),
          currencyId,
          name: name.trim(),
          isActive,
          isDefault,
          isTaxInclusive
        }
      });

      if (!res) return { res: null, inflowPayload: null };

      // Re-map structural fields targeting Cloud Global Identifiers
      const inflowPayload = {
        cloudId: res.inflowId, // The central source-of-truth ID
        currencyId: res.currencyId,
        name: res.name,
        isActive: res.isActive,
        isDefault: res.isDefault,
        isTaxInclusive: res.isTaxInclusive
      };

      return { res, inflowPayload };
    });

    if (!result.res || !result.inflowPayload) {
      return NextResponse.json({ error: "Failed to assemble currency scheme components." }, { status: 500 });
    }

    const { cloudId, ...cleanInflowPayload } = result.inflowPayload;

    const validWebhooks = await WebhookService.getLocationWebhookURLs("pricingSchemeLocal");

    const existingCurrencyMaps = await prisma.currencyLocationMap.findMany({
      where: { currencyId: cleanInflowPayload.currencyId },
      select: { locationId: true, localId: true }
    });
    
    if (validWebhooks.length > 0) {
      const jobsToQueue = validWebhooks
      .filter(webhook => webhook.location.url && webhook.location.url.trim() !== "")
      .map((webhook) => {
        const matchCurrency = existingCurrencyMaps.find(m => m.locationId === webhook.locationId);
        
        return {
        name: "pricing_scheme_localsync_job",
        data: {
          source: "PRICING_SCHEME_UPSERT_LOCAL",
          model: "PricingScheme", 
          payload: {
            ...cleanInflowPayload,
            pricingSchemeId: cloudId, 
            currencyId: matchCurrency?.localId || null,
            localId: null,
            isActive: cleanInflowPayload.isActive === true ? 1 : 0,
            isDefault:  cleanInflowPayload.isDefault === true ? 1 : 0,
            isTaxInclusive:  cleanInflowPayload.isTaxInclusive === true ? 1 : 0,
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
      }});

      await getMidSyncQueue().addBulk(jobsToQueue);
      console.log(`[Queue] Successfully broadcasted sync jobs to ${jobsToQueue.length} locations.`);
    }

    return NextResponse.json(result.res, { status: 201 });
  } catch (error) {
    console.error("Pricing scheme deployment transaction aborted:", error);
    return NextResponse.json({ error: "Internal operational database connection transaction error." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, isActive, isDefault, isTaxInclusive } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing required profile primary identity lookup parameters." }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Balance systems options rules globally
      if (isDefault) {
        await tx.pricingScheme.updateMany({
          where: { NOT: { id }, isDefault: true },
          data: { isDefault: false }
        });
      }

      const res = await tx.pricingScheme.update({
        where: { id },
        data: {
          name: name.trim(),
          isActive,
          isDefault,
          isTaxInclusive
        }
      });

      if (!res) return { res: null, inflowPayload: null };

      // Re-map structural fields targeting Cloud Global Identifiers
      const inflowPayload = {
        cloudId: res.inflowId, 
        currencyId: res.currencyId,
        name: res.name,
        isActive: res.isActive,
        isDefault: res.isDefault,
        isTaxInclusive: res.isTaxInclusive,
      };

      return { res, inflowPayload };
    });

    if (!result.res || !result.inflowPayload) {
      return NextResponse.json({ error: "Failed to assemble currency scheme components." }, { status: 500 });
    }

    const { cloudId, ...cleanInflowPayload } = result.inflowPayload;

    const validWebhooks = await WebhookService.getLocationWebhookURLs("pricingSchemeLocal");

    const existingCurrencyMaps = await prisma.currencyLocationMap.findMany({
      where: { currencyId: cleanInflowPayload.currencyId },
      select: { locationId: true, localId: true }
    });

    const existingMappings = await prisma.pricingSchemeLocationMap.findMany({
      where: { pricingSchemeId: cloudId },
      select: { locationId: true, localId: true }
    });

    if (validWebhooks.length > 0) {
      const jobsToQueue = validWebhooks
      .filter(webhook => webhook.location.url && webhook.location.url.trim() !== "")
      .map((webhook) => {
        const match = existingMappings.find(m => m.locationId === webhook.locationId);
        const matchCurrency = existingCurrencyMaps.find(m => m.locationId === webhook.locationId);
        
        return {
        name: "pricing_scheme_localsync_job",
        data: {
          source: "PRICING_SCHEME_UPSERT_LOCAL",
          model: "PricingScheme", 
          payload: {
            ...cleanInflowPayload,
            pricingSchemeId: cloudId, 
            currencyId: matchCurrency?.localId || null,
            localId: match?.localId || null,
            isActive: cleanInflowPayload.isActive === true ? 1 : 0,
            isDefault:  cleanInflowPayload.isDefault === true ? 1 : 0,
            isTaxInclusive:  cleanInflowPayload.isTaxInclusive === true ? 1 : 0,
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
      }});

      await getMidSyncQueue().addBulk(jobsToQueue);
      console.log(`[Queue] Successfully broadcasted sync jobs to ${jobsToQueue.length} locations.`);
    }

    return NextResponse.json(result.res, { status: 200 });
  } catch (error) {
    console.error("Pricing scheme properties alteration aborted:", error);
    return NextResponse.json({ error: "Internal Server error processing transactional update sequence modifications." }, { status: 500 });
  }
}