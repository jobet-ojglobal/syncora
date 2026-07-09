// app/api/admin/currencies/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMidSyncQueue } from "@/lib/queues/sync.queue";
import { WebhookService } from "@/services/webhook.service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, isoCode, symbol, decimalPlaces, decimalSeparator, thousandsSeparator, isSymbolFirst, negativeType, exchangeRate, isManual } = body;

    if (!isoCode || !name || !symbol) {
      return NextResponse.json({ error: "Missing mandatory structural corporate standard validation fields parameters criteria tokens." }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Establish structural base localization formatting layout standard rules map card
      const currency = await tx.currency.create({
        data: {
          inflowId: crypto.randomUUID().toLowerCase(),
          name: name.trim(),
          isoCode: isoCode.trim().toUpperCase(),
          symbol: symbol.trim(),
          decimalPlaces,
          decimalSeparator,
          thousandsSeparator,
          isSymbolFirst,
          negativeType
        }
      });

      // 2. Instantiate matching active exchange multiplication calibration reference record index row lines
      const conversion = await tx.currencyConversion.create({
        data: {
          inflowId: crypto.randomUUID().toLowerCase(),
          currencyId: currency.inflowId,
          exchangeRate: exchangeRate || 1.00000000,
          isManual: isManual ?? true
        }
      });

      // Re-map structural fields targeting Cloud Global Identifiers
      const inflowPayload = {
        cloudId: currency.inflowId,
        decimalPlaces: currency.decimalPlaces,
        decimalSeparator: currency.decimalSeparator,
        isoCode: currency.isoCode,
        isSymbolFirst: currency.isSymbolFirst,
        name: currency.name,
        negativeType: currency.negativeType,
        symbol: currency.symbol,
        thousandsSeparator: currency.thousandsSeparator,
        currencyConversions: [
          {
            cloudId: conversion.inflowId,
            currencyId: currency.inflowId,
            exchangeRate: conversion.exchangeRate,
            isManual: conversion.isManual,
          }
        ]
      };

      return { res: currency, inflowPayload };
    });
    
    if (!result.res || !result.inflowPayload) {
      return NextResponse.json({ error: "Failed to assemble currency scheme components." }, { status: 500 });
    }

    const { cloudId, currencyConversions, ...cleanInflowPayload } = result.inflowPayload;

    // ==========================================
    // 🏢 STEP 1: DISPATCH CLOUD SYNC JOB
    // ==========================================
    const validCloudWebhook = await WebhookService.getCloudWebhookURL("currency");

    if (validCloudWebhook) {
      await getMidSyncQueue().add(
        "currency_cloudsync_job",
        {
          source: "CURRENCY_UPSERT_CLOUD",
          model: "CurrencyScheme",
          payload: {
            ...cleanInflowPayload,
            currencyId: cloudId,
            currencyConversions: currencyConversions.map(c => ({
              currencyConversionId: c.cloudId,
              currencyId: c.currencyId,
              exchangeRate: c.exchangeRate,
              isManual: c.isManual,
            }))
          },
          timestamp: new Date().toISOString(),
        },
        { 
          attempts: 3, 
          backoff: { type: "exponential", delay: 2000 },
          removeOnComplete: true
        }
      );
      console.log(`[Queue] Successfully broadcasted sync job to inflow cloud.`);
    }

    // ==========================================
    // 📍 STEP 2: BROADCAST LOCAL SYNC JOBS
    // ==========================================
    const validWebhooks = await WebhookService.getLocationWebhookURLs("currency");

    if (validWebhooks.length > 0) {
      const jobsToQueue = validWebhooks
      .filter(webhook => webhook.location.url && webhook.location.url.trim() !== "")
      .map((webhook) => ({
        name: "currency_localsync_job",
        data: {
          source: "CURRENCY_UPSERT_LOCAL",
          model: "CurrencyScheme", 
          payload: {
            ...cleanInflowPayload,
            currencyId: cloudId, 
            localId: null, 
            currencyConversions: currencyConversions.map(c => ({
              currencyConversionId: null,
              currencyId: c.currencyId,
              exchangeRate: c.exchangeRate,
              isManual: c.isManual,
            }))
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
      }));

      await getMidSyncQueue().addBulk(jobsToQueue);
      console.log(`[Queue] Successfully broadcasted sync jobs to ${jobsToQueue.length} locations.`);
    }

    return NextResponse.json(result.res, { status: 201 });
  } catch (error: any) {
    console.error("Forex engine architecture mapping configuration storage crashed:", error);
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Monetary ISO unique collision constraints breach. This currency handle exists inside ledger archives." }, { status: 409 });
    }
    return NextResponse.json({ error: "Database storage engine pipeline dropped writing currency vectors parameters rows." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      id, name, symbol, decimalPlaces, decimalSeparator, 
      thousandsSeparator, isSymbolFirst, negativeType, exchangeRate, isManual 
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing currency reference tracker payload identification identifier." }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Core structural typographic updates using strict optional checking
      const currency = await tx.currency.update({
        where: { id },
        data: {
          name: name !== undefined ? name?.trim() : undefined,
          symbol: symbol !== undefined ? symbol?.trim() : undefined,
          decimalPlaces: decimalPlaces !== undefined ? decimalPlaces : undefined,
          decimalSeparator: decimalSeparator !== undefined ? decimalSeparator : undefined,
          thousandsSeparator: thousandsSeparator !== undefined ? thousandsSeparator : undefined,
          isSymbolFirst: isSymbolFirst !== undefined ? isSymbolFirst : undefined,
          negativeType: negativeType !== undefined ? negativeType : undefined
        }
      });

      // 2. Safe, non-destructive alignment of the active currency conversion rate configuration matrix
      // Instead of dropping rows, we find or update the existing active record
      const existingConversion = await tx.currencyConversion.findFirst({
        where: { currencyId: currency.inflowId }
      });

      let conversion;
      if (existingConversion) {
        conversion = await tx.currencyConversion.update({
          where: { id: existingConversion.id },
          data: {
            exchangeRate: exchangeRate !== undefined ? (exchangeRate || 1.00000000) : undefined,
            isManual: isManual !== undefined ? isManual : undefined
          }
        });
      } else {
        conversion = await tx.currencyConversion.create({
          data: {
            inflowId: crypto.randomUUID().toLowerCase(),
            currencyId: currency.inflowId,
            exchangeRate: exchangeRate || 1.00000000,
            isManual: isManual ?? true
          }
        });
      }

      // 3. Remap payload parameters targeting standard Global Cloud Layout representations
      const inflowPayload = {
        cloudId: currency.inflowId,
        decimalPlaces: currency.decimalPlaces,
        decimalSeparator: currency.decimalSeparator,
        isoCode: currency.isoCode,
        isSymbolFirst: currency.isSymbolFirst,
        name: currency.name,
        negativeType: currency.negativeType,
        symbol: currency.symbol,
        thousandsSeparator: currency.thousandsSeparator,
        currencyConversions: [
          {
            cloudId: conversion.inflowId,
            currencyId: currency.inflowId,
            exchangeRate: conversion.exchangeRate,
            isManual: conversion.isManual,
          }
        ]
      };

      return { currency, inflowPayload };
    });

    if (!result.currency || !result.inflowPayload) {
      return NextResponse.json({ error: "Failed to assemble currency scheme components." }, { status: 500 });
    }

    const { cloudId, currencyConversions, ...cleanInflowPayload } = result.inflowPayload;

    // ==========================================
    // 🏢 STEP 1: DISPATCH CLOUD SYNC JOB
    // ==========================================
    const validCloudWebhook = await WebhookService.getCloudWebhookURL("currency");

    if (validCloudWebhook) {
      await getMidSyncQueue().add(
        "currency_cloudsync_job",
        {
          source: "CURRENCY_UPSERT_CLOUD",
          model: "CurrencyScheme",
          payload: {
            ...cleanInflowPayload,
            currencyId: cloudId,
            currencyConversions: currencyConversions.map(c => ({
              currencyConversionId: c.cloudId,
              currencyId: c.currencyId,
              exchangeRate: c.exchangeRate,
              isManual: c.isManual,
            }))
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
    const validWebhooks = await WebhookService.getLocationWebhookURLs("currency");

    if (validWebhooks.length > 0) {
      // 🗺️ Query identity map registry to see which location already knows this record
      const existingMappings = await prisma.currencyLocationMap.findMany({
        where: { currencyId: cloudId },
        select: { locationId: true, localId: true }
      });

      const jobsToQueue = validWebhooks
        .filter(webhook => webhook.location.url && webhook.location.url.trim() !== "")
        .map((webhook) => {
        // Find if this specific store branch has an integer mapping matching this entry
        const match = existingMappings.find(m => m.locationId === webhook.locationId);

        return {
          name: "currency_localsync_job",
          data: {
            source: "CURRENCY_UPSERT_LOCAL",
            model: "Currency",
            payload: {
              ...cleanInflowPayload,
              currencyId: cloudId, // Keeps the global trace uniform
              localId: match ? match.localId : null, // 💡 If exists, passes Int (e.g. 5). If null, local nodes create a fresh entry
              currencyConversions: currencyConversions.map(c => ({
                currencyConversionId: null,
                currencyId: c.currencyId,
                exchangeRate: c.exchangeRate,
                isManual: c.isManual,
              }))
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

    return NextResponse.json(result.currency, { status: 200 });
  } catch (error) {
    console.error("Forex structural pipeline adjustment aborted:", error);
    return NextResponse.json({ error: "Internal operational write database connection abort error." }, { status: 500 });
  }
}


