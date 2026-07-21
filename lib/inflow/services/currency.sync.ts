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
    isoCode: currency.isoCode,
    symbol: currency.symbol,
    decimalPlaces: currency.decimalPlaces,
    decimalSeparator: currency.decimalSeparator,
    thousandsSeparator: currency.thousandsSeparator,
    isSymbolFirst: currency.isSymbolFirst,
    negativeType: currency.negativeType,
  };

  // 1. Upsert Core Parent Currency Node
  const syncedCurrency = await db.currency.upsert({
    where: { inflowId: currency.currencyId },
    create: { ...payload, inflowId: currency.currencyId },
    update: payload,
  });

  const conversions = currency.currencyConversions ?? [];
  const conversionIds = conversions.map((c) => c.currencyConversionId);

  // 2. Clear deleted downstream mappings
  await db.currencyConversion.deleteMany({
    where: {
      currencyId: currency.currencyId,
      inflowId: { notIn: conversionIds },
    },
  });

  // 3. Upsert associated active currency vectors sequentially or via loop
  // (Executing sequential promises on a single tx client is safer than Promise.all)
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

  return syncedCurrency;
}