import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type Tx = Prisma.TransactionClient;

export async function syncBrand(
  tx:  typeof prisma | Tx,
  brandName?: string | null
): Promise<{ id: string, name: string} | null> {
  if (!brandName?.trim()) {
    return null;
  }

  const brand = await tx.brand.upsert({
    where: {
      name: brandName.trim(),
    },
    create: {
      name: brandName.trim(),
    },
    update: {},
  });
 
  return brand;
}

// import { Prisma, PrismaClient } from "@/generated/prisma/client";
// import { genInflowUniqueSlug } from "@/helpers/genUniqueSlug";

// type DbClient = Prisma.TransactionClient | PrismaClient;

// /**
//  * Safely upserts a standard PaymentTerms skeleton shell.
//  * Guarantees foreign key integrity for relation pipelines.
//  */
// export async function ensureCategoryShell(
//   tx: DbClient,
//   payload: InflowCategory
// ) {
//   if (!payload.categoryId) return null;

//   const slug = await genInflowUniqueSlug(
//     payload.name || "category",
//     tx.category,
//     payload.categoryId
//   );

//   return await tx.category.upsert({
//     where: { inflowId: payload.categoryId },
//     create: {
//       inflowId: payload.categoryId,
//       name: payload.name,
//       slug,
//     },
//     update: {},
//   });
// }

// /**
//  * Safely upserts a standard core location shell along with its required 
//  * structural address and "Default" sublocation sub-records.
//  * Guarantees foreign key integrity across downstream synchronizers.
//  */
// export async function ensureLocationShell(
//   tx: DbClient,
//   payload: InflowLocation
// ) {
//   if (!payload.locationId) return null;

//   // 1. Core Location record
//   const location = await tx.location.upsert({
//     where: { inflowId: payload.locationId },
//     create: {
//       inflowId: payload.locationId,
//       name: payload.name,
//       isActive: payload.isActive ?? true,
//       isDefault: payload.isDefault ?? false,
//     },
//     update: {},
//   });
  
//   return location;
// }

// /**
//  * Safely upserts a standard PaymentTerms skeleton shell.
//  * Guarantees foreign key integrity for relation pipelines.
//  */
// export async function ensureOperationTypeShell(
//   tx: DbClient,
//   payload: InflowOperationType
// ) {
//   if (!payload.operationTypeId) return null;

//   return await tx.operationType.upsert({
//     where: { inflowId: payload.operationTypeId },
//     create: {
//       inflowId: payload.operationTypeId,
//       name: payload.name,
//       estimatedPerHourCost: payload.estimatedPerHourCost,
//       isActive: payload.isActive ?? true,
//       isDefault: payload.isDefault ?? false,
//       trackTime: payload.isDefault ?? true,
//     },
//     update: {}, // Leave properties unmodified if the true sync already ran
//   });
// }

// /**
//  * Safely upserts a standard PaymentTerms skeleton shell.
//  * Guarantees foreign key integrity for relation pipelines.
//  */
// export async function ensurePaymentTermsShell(
//   tx: DbClient,
//   payload: InflowPaymentTerms
// ) {
//   if (!payload.paymentTermsId) return null;

//   return await tx.paymentTerm.upsert({
//     where: { inflowId: payload.paymentTermsId },
//     create: {
//       inflowId: payload.paymentTermsId,
//       name: payload.name,
//     },
//     update: {}, // Leave properties unmodified if the true sync already ran
//   });
// }


// /**
//  * Safely upserts a standard PaymentTerms skeleton shell.
//  * Guarantees foreign key integrity for relation pipelines.
//  */
// export async function ensureCurrencyShell(
//   tx: DbClient,
//   payload: InflowCurrency
// ) {
//   if (!payload.currencyId) return null;

//   return await tx.currency.upsert({
//     where: { inflowId: payload.currencyId },
//     create: {
//       inflowId: payload.currencyId,
//       name: payload.name,
//       isoCode: payload.isoCode,
//       symbol: payload.symbol,
//       decimalPlaces: payload.decimalPlaces,
//       decimalSeparator: payload.decimalSeparator,
//       thousandsSeparator: payload.thousandsSeparator,
//       isSymbolFirst: payload.isSymbolFirst,
//       negativeType: payload.negativeType
//     },
//     update: {}, // Leave properties unmodified if the true sync already ran
//   });
// }

// export async function ensurePricingSchemeShell(
//   tx: DbClient,
//   payload: InflowPricingScheme
// ) {
//   if (!payload.pricingSchemeId) return null;

//   const localCurrency = await tx.currency.findUnique({
//     where: { inflowId: payload.currencyId },
//     select: { inflowId: true },
//   });

//   let validCurrencyId: string | null = null;

//   if(localCurrency) {
//     validCurrencyId = localCurrency?.inflowId;
//   } else if (payload.currency) {
//     const currency = await ensureCurrencyShell(tx, payload.currency);
//     if(currency) {
//       validCurrencyId = currency?.inflowId;
//     }
//   }

//   if(!validCurrencyId) return null;

//   return await tx.pricingScheme.upsert({
//     where: { inflowId: payload.pricingSchemeId },
//     create: {
//       inflowId: payload.pricingSchemeId,
//       currencyId: validCurrencyId,
//       name: payload.name,
//       isActive: payload.isActive,
//       isDefault: payload.isDefault,
//       isTaxInclusive: payload.isTaxInclusive,
//     },
//     update: {}, 
//   });
// }

// /**
//  * Safely upserts a standard TaxingScheme skeleton shell.
//  * Guarantees foreign key integrity for relation pipelines.
//  */
// export async function ensureTaxingSchemeShell(
//   tx: DbClient,
//   payload: InflowTaxingScheme
// ) {
//   if (!payload.taxingSchemeId) return null;

//   return await tx.taxingScheme.upsert({
//     where: { inflowId: payload.taxingSchemeId },
//     create: {
//       inflowId: payload.taxingSchemeId,
//       name: payload.name,
//       isActive: payload.isActive,
//       isDefault: payload.isDefault,
//       calculateTax2OnTax1: payload.calculateTax2OnTax1,
//       tax1Name: payload.tax1Name,
//       tax1OnShipping: payload.tax1OnShipping,
//       tax2Name: payload.tax2Name,
//       tax2OnShipping: payload.tax2OnShipping,
//     },
//     update: {}, // Leave properties unmodified if full sync already ran
//   });
// }

// /**
//  * Safely upserts a standard TaxingCode skeleton shell.
//  * Guarantees foreign key integrity for relation pipelines.
//  */
// export async function ensureTaxCodeShell(
//   tx: DbClient,
//   payload: InflowTaxCode
// ) {
//   if (!payload.taxCodeId || payload.taxingSchemeId) return null;

//   const localScheme = await tx.taxingScheme.findUnique({
//     where: { inflowId: payload.taxCodeId },
//     select: { inflowId: true },
//   });

//   let validTaxingSchemeId: string | null = null;

//   if(localScheme) {
//     validTaxingSchemeId = localScheme?.inflowId;
//   } else if (payload.taxingScheme) {
//     const taxingScheme = await ensureTaxingSchemeShell(tx, payload.taxingScheme);
//     if(taxingScheme) {
//       validTaxingSchemeId = taxingScheme?.inflowId;
//     }
//   }

//   if(!validTaxingSchemeId) return null;

//   return await tx.taxCode.upsert({
//     where: { inflowId: payload.taxCodeId },
//     create: {
//       inflowId: payload.taxCodeId,
//       name: payload.name,
//       taxingSchemeId: validTaxingSchemeId
//     },
//     update: {}, 
//   });
// }

// /**
//  * Safely upserts a standard Vendor skeleton shell.
//  * Guarantees foreign key integrity for relation pipelines.
//  */
// export async function ensureVendorShell(
//   tx: DbClient,
//   payload: InflowVendor
// ) {
//   if (!payload.vendorId) return null;

//   const cleanEmail = payload.email?.trim().toLowerCase();
 
//   const existingVendorWithPartner = await tx.vendor.findUnique({
//     where: { inflowId: payload.vendorId },
//     select: { businessPartnerId: true },
//   });

//   const partnerPayload = {
//     name: payload.name,
//     contactName: payload.contactName,
//     email: cleanEmail,
//     phone: payload.phone,
//     fax: payload.fax,
//     website: payload.website,
//     remarks: payload.remarks,
//     isActive: payload.isActive ?? true,
//   };

//   const partner = await tx.businessPartner.upsert({
//     where: {
//       id: existingVendorWithPartner?.businessPartnerId ?? "NEVER_MATCH_GUID",
//     },
//     create: partnerPayload,
//     update: partnerPayload,
//   });

//   const vendorPayload = {
//     isTaxInclusivePricing: payload.isTaxInclusivePricing ?? false,
//   };

//   return await tx.vendor.upsert({
//     where: { inflowId: payload.vendorId },
//     create: {
//       ...vendorPayload,
//       inflowId: payload.vendorId,
//       businessPartnerId: partner.id,
//     },
//     update: {},
//   });
// }

// /**
//  * Safely upserts a standard Product skeleton shell.
//  * Guarantees foreign key integrity for relation pipelines.
//  */
// export async function ensureProductShell(
//   tx: DbClient,
//   payload: InflowProduct
// ) {
//   if (!payload.productId) return null;

//   const baseSlug = await genInflowUniqueSlug(
//     payload.name || "product-variant", 
//     tx.product, 
//     payload.productId
//   );

//   // Payload structure for Upsert
//   const productPayload = {
//     sku: payload.sku,
//     name: payload.name,
//     autoAssemble: payload.autoAssemble,
//     isActive: payload.isActive,
//     isManufacturable: payload.isManufacturable,
//     includeQuantityBuildable: payload.includeQuantityBuildable,
//     trackExpiry: payload.trackExpiry,
//     trackLots: payload.trackLots,
//     trackSerials: payload.trackSerials,
//   };

//   // 5. Core Product Upsert
//   return await tx.product.upsert({
//     where: { inflowId: payload.productId },
//     create: {
//       ...productPayload,
//       inflowId: payload.productId,
//       slug: baseSlug,
//     },
//     update: {},
//   });
// }


