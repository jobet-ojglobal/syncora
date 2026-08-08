import { Prisma, PrismaClient } from "@/generated/prisma/client";
import { InflowCurrency } from "../types";

type DbClient = Prisma.TransactionClient | PrismaClient;

/**
 * Executes a single atomic write operation for an individual currency schema 
 * and its nested children collections.
 */
export async function upsertCurrencyScheme(db: DbClient, currency: InflowCurrency) {
  const payload = {
    name: currency.name,
    symbol: currency.symbol,
    decimalPlaces: currency.decimalPlaces,
    decimalSeparator: currency.decimalSeparator,
    thousandsSeparator: currency.thousandsSeparator,
    isSymbolFirst: currency.isSymbolFirst,
    negativeType: currency.negativeType,
  };

  let targetIsoCode = currency.isoCode;

  // 1. Check if ISO code already exists on another record
  if (currency.isoCode) {
    const isoConflict = await db.currency.findFirst({
      where: {
        isoCode: currency.isoCode,
        NOT: { inflowId: currency.currencyId },
      },
      select: { id: true, inflowId: true },
    });

    if (isoConflict) {
      if (!isoConflict.inflowId) {
        // Case A: Unlinked local currency with the same isoCode exists.
        // Attach the inflowId and update its values directly.
        const updatedCurrency = await db.currency.update({
          where: { id: isoConflict.id },
          data: {
            ...payload,
            isoCode: currency.isoCode,
            inflowId: currency.currencyId,
          },
        });

        await syncConversions(db, currency);
        return updatedCurrency;
      } else {
        // Case B: Collision with a different external record.
        // Disambiguate ISO code to satisfy `@unique` index constraints.
        targetIsoCode = `${currency.isoCode}_${currency.currencyId.slice(-4)}`;
      }
    }
  }

  const finalPayload = {
    ...payload,
    isoCode: targetIsoCode,
  };

  // 2. Upsert Core Parent Currency Node
  const syncedCurrency = await db.currency.upsert({
    where: { inflowId: currency.currencyId },
    create: { ...finalPayload, inflowId: currency.currencyId },
    update: finalPayload,
  });

  // 3. Sync Child Currency Conversions
  await syncConversions(db, currency);

  return syncedCurrency;
}

/**
 * Helper to process downstream currency conversions safely
 */
async function syncConversions(db: DbClient, currency: InflowCurrency) {
  const conversions = currency.currencyConversions ?? [];
  const conversionIds = conversions.map((c) => c.currencyConversionId);

  // Clear deleted downstream mappings
  await db.currencyConversion.deleteMany({
    where: {
      currencyId: currency.currencyId,
      inflowId: { notIn: conversionIds },
    },
  });

  // Upsert active conversion records sequentially
  for (const conversion of conversions) {
    const conversionPayload = {
      currencyId: conversion.currencyId,
      exchangeRate: new Prisma.Decimal(conversion.exchangeRate as any),
      isManual: conversion.isManual,
    };

    await db.currencyConversion.upsert({
      where: { inflowId: conversion.currencyConversionId },
      create: { ...conversionPayload, inflowId: conversion.currencyConversionId },
      update: conversionPayload,
    });
  }
}