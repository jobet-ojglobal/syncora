import { Prisma, PrismaClient } from "@/generated/prisma/client";
import { InflowCurrency, InflowLocation, InflowPaymentTerms, InflowTaxingScheme } from "../types";

type DbClient = Prisma.TransactionClient | PrismaClient;

/**
 * Safely upserts a standard core location shell along with its required 
 * structural address and "Default" sublocation sub-records.
 * Guarantees foreign key integrity across downstream synchronizers.
 */
export async function ensureLocationShell(
  tx: DbClient,
  payload: InflowLocation
) {
  const locId = payload.locationId;

  // 1. Core Location record
  const location = await tx.location.upsert({
    where: { inflowId: locId },
    create: {
      inflowId: locId,
      name: payload.name,
      isActive: payload.isActive ?? true,
      isDefault: payload.isDefault ?? false,
    },
    update: {
      name: payload.name,
      isActive: payload.isActive ?? true,
      isDefault: payload.isDefault ?? false,
    },
  });

  // 2. Structural Address record
  await tx.locationAddress.upsert({
    where: { locationId: locId },
    create: {
      locationId: locId,
      address1: payload.address?.address1,
      address2: payload.address?.address2,
      city: payload.address?.city,
      state: payload.address?.state,
      country: payload.address?.country,
      postalCode: payload.address?.postalCode,
      remarks: payload.address?.remarks ?? "Auto-generated shell",
      addressType: payload.address?.addressType,
    },
    update: {},
  });
  
  return location;
}

/**
 * Safely upserts a standard PaymentTerms skeleton shell.
 * Guarantees foreign key integrity for relation pipelines.
 */
export async function ensurePaymentTermsShell(
  tx: Prisma.TransactionClient,
  payload: InflowPaymentTerms
) {
  return await tx.paymentTerm.upsert({
    where: { inflowId: payload.paymentTermsId },
    create: {
      inflowId: payload.paymentTermsId,
      name: payload.name,
    },
    update: {}, // Leave properties unmodified if the true sync already ran
  });
}

/**
 * Safely upserts a standard PaymentTerms skeleton shell.
 * Guarantees foreign key integrity for relation pipelines.
 */
export async function ensureCurrencyShell(
  tx: Prisma.TransactionClient,
  payload: InflowCurrency
) {

  return await tx.currency.upsert({
    where: { inflowId: payload.currencyId },
    create: {
      inflowId: payload.currencyId,
      name: payload.name,
      isoCode: payload.isoCode,
      symbol: payload.symbol,
      decimalPlaces: payload.decimalPlaces,
      decimalSeparator: payload.decimalSeparator,
      thousandsSeparator: payload.thousandsSeparator,
      isSymbolFirst: payload.isSymbolFirst,
      negativeType: payload.negativeType
    },
    update: {}, // Leave properties unmodified if the true sync already ran
  });
}

/**
 * Safely upserts a standard TaxingScheme skeleton shell.
 * Guarantees foreign key integrity for relation pipelines.
 */
export async function ensureTaxingSchemeShell(
  tx: DbClient,
  payload: InflowTaxingScheme
) {
  if (!payload.taxingSchemeId) return null;

  return await tx.taxingScheme.upsert({
    where: { inflowId: payload.taxingSchemeId },
    create: {
      inflowId: payload.taxingSchemeId,
      name: payload.name,
      isActive: payload.isActive,
      isDefault: payload.isDefault,
      calculateTax2OnTax1: payload.calculateTax2OnTax1,
      tax1Name: payload.tax1Name,
      tax1OnShipping: payload.tax1OnShipping,
      tax2Name: payload.tax2Name,
      tax2OnShipping: payload.tax2OnShipping,
    },
    update: {}, // Leave properties unmodified if full sync already ran
  });
}


