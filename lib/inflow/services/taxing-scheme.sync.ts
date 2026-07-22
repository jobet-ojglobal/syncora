import { PrismaClient, Prisma } from "@/generated/prisma/client";

export type TaxingSchemeSyncPayload = {
  taxingSchemeId: string;
  name: string;
  isActive: boolean;
  isDefault: boolean;
  calculateTax2OnTax1: boolean;
  tax1Name: string | null;
  tax1OnShipping: boolean;
  tax2Name: string | null;
  tax2OnShipping: boolean;
  defaultTaxCodeId?: string | null;
  taxCodes?: Array<{
    taxCodeId: string;
    taxingSchemeId: string;
    name: string;
    isActive: boolean;
    tax1Rate: number | string;
    tax2Rate: number | string;
  }> | null;
};

/**
 * Stage 1: Synchronizes a single taxing scheme record and its nested child tax codes.
 * Designed to execute safely within an active Prisma transaction block.
 */
export async function syncTaxingScheme(
  tx: Prisma.TransactionClient,
  scheme: TaxingSchemeSyncPayload
): Promise<void> {
  // 1. Sync parent Taxing Scheme config (omitting circular defaultTaxCodeId initially)
  const schemePayload = {
    name: scheme.name,
    isActive: scheme.isActive,
    isDefault: scheme.isDefault,
    calculateTax2OnTax1: scheme.calculateTax2OnTax1,
    tax1Name: scheme.tax1Name,
    tax1OnShipping: scheme.tax1OnShipping,
    tax2Name: scheme.tax2Name,
    tax2OnShipping: scheme.tax2OnShipping,
  };

  const schemePromise = tx.taxingScheme.upsert({
    where: { inflowId: scheme.taxingSchemeId },
    create: { ...schemePayload, inflowId: scheme.taxingSchemeId },
    update: schemePayload,
  });

  // 2. Sync associated child Tax Codes
  const taxCodes = scheme.taxCodes ?? [];
  const taxCodePromises = taxCodes.map((taxCode) => {
    const codePayload = {
      taxingSchemeId: taxCode.taxingSchemeId,
      name: taxCode.name,
      isActive: taxCode.isActive,
      tax1Rate: new Prisma.Decimal(taxCode.tax1Rate),
      tax2Rate: new Prisma.Decimal(taxCode.tax2Rate),
    };

    return tx.taxCode.upsert({
      where: { inflowId: taxCode.taxCodeId },
      create: { ...codePayload, inflowId: taxCode.taxCodeId },
      update: codePayload,
    });
  });

  // Execute parent scheme and child structures concurrently
  await Promise.all([schemePromise, ...taxCodePromises]);
}

/**
 * Stage 2: Updates the default tax code connection.
 * Call this ONLY after all tax codes across the batch are verified to exist in the database.
 */
export async function linkDefaultTaxCode(
  tx: Prisma.TransactionClient,
  scheme: TaxingSchemeSyncPayload
): Promise<void> {
  if (!scheme.defaultTaxCodeId) return;

  await tx.taxingScheme.update({
    where: { inflowId: scheme.taxingSchemeId },
    data: { defaultTaxCodeId: scheme.defaultTaxCodeId },
  });
}



// export type TaxingSchemeSyncPayload = {
//   taxingSchemeId: string;
//   name: string;
//   isActive: boolean;
//   isDefault: boolean;
//   calculateTax2OnTax1: boolean;
//   tax1Name: string | null;
//   tax1OnShipping: boolean;
//   tax2Name: string | null;
//   tax2OnShipping: boolean;
//   defaultTaxCodeId?: string | null;
//   taxCodes?: Array<{
//     taxCodeId: string;
//     taxingSchemeId: string;
//     name: string;
//     isActive: boolean;
//     tax1Rate: number | string;
//     tax2Rate: number | string;
//   }> | null;
// };

// /**
//  * Stage 1: Synchronizes a single taxing scheme record and its nested child tax codes.
//  * Designed to execute safely within an active Prisma transaction block.
//  */
// export async function syncTaxingScheme(
//   tx: Prisma.TransactionClient,
//   scheme: TaxingSchemeSyncPayload
// ): Promise<void> {
//   // 1. Sync parent Taxing Scheme config (omitting circular defaultTaxCodeId initially)
//   const schemePayload = {
//     name: scheme.name,
//     isActive: scheme.isActive,
//     isDefault: scheme.isDefault,
//     calculateTax2OnTax1: scheme.calculateTax2OnTax1,
//     tax1Name: scheme.tax1Name,
//     tax1OnShipping: scheme.tax1OnShipping,
//     tax2Name: scheme.tax2Name,
//     tax2OnShipping: scheme.tax2OnShipping,
//   };

//   const schemePromise = tx.taxingScheme.upsert({
//     where: { inflowId: scheme.taxingSchemeId },
//     create: { ...schemePayload, inflowId: scheme.taxingSchemeId },
//     update: schemePayload,
//   });

//   // 2. Sync associated child Tax Codes
//   const taxCodes = scheme.taxCodes ?? [];
//   const taxCodePromises = taxCodes.map((taxCode) => {
//     const codePayload = {
//       taxingSchemeId: taxCode.taxingSchemeId,
//       name: taxCode.name,
//       isActive: taxCode.isActive,
//       tax1Rate: new Prisma.Decimal(taxCode.tax1Rate),
//       tax2Rate: new Prisma.Decimal(taxCode.tax2Rate),
//     };

//     return tx.taxCode.upsert({
//       where: { inflowId: taxCode.taxCodeId },
//       create: { ...codePayload, inflowId: taxCode.taxCodeId },
//       update: codePayload,
//     });
//   });

//   // Execute parent scheme and child structures concurrently
//   await Promise.all([schemePromise, ...taxCodePromises]);
// }

// /**
//  * Stage 2: Updates the default tax code connection.
//  * Call this ONLY after all tax codes across the batch are verified to exist in the database.
//  */
// export async function linkDefaultTaxCode(
//   tx: Prisma.TransactionClient,
//   scheme: TaxingSchemeSyncPayload
// ): Promise<void> {
//   if (!scheme.defaultTaxCodeId) return;

//   await tx.taxingScheme.update({
//     where: { inflowId: scheme.taxingSchemeId },
//     data: { defaultTaxCodeId: scheme.defaultTaxCodeId },
//   });
// }