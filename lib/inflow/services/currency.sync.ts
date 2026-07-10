import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { InflowCurrency } from "../types";

/**
 * Executes a single atomic database synchronization event for an individual currency schema 
 * and its nested children collections.
 */
export async function upsertCurrencyScheme(currency: InflowCurrency) {
  return await prisma.$transaction(async (tx) => {
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
    const syncedCurrency = await tx.currency.upsert({
      where: { inflowId: currency.currencyId },
      create: { ...payload, inflowId: currency.currencyId },
      update: payload,
    });

    const conversions = currency.currencyConversions ?? [];
    const conversionIds = conversions.map((c) => c.currencyConversionId);

    // 2. Clear deleted downstream mappings 
    await tx.currencyConversion.deleteMany({
      where: {
        currencyId: currency.currencyId,
        inflowId: { notIn: conversionIds },
      },
    });

    // 3. Upsert associated active currency vectors
    if (conversions.length > 0) {
      await Promise.all(
        conversions.map((conversion) => {
          const conversionPayload = {
            currencyId: conversion.currencyId,
            exchangeRate: new Prisma.Decimal(conversion.exchangeRate as any),
            isManual: conversion.isManual,
          };

          return tx.currencyConversion.upsert({
            where: { inflowId: conversion.currencyConversionId },
            create: { ...conversionPayload, inflowId: conversion.currencyConversionId },
            update: conversionPayload,
          });
        })
      );
    }

    return syncedCurrency;
  });
}