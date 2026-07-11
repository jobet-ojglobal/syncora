// lib/inflow/services/taxing-scheme.sync.ts
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { ExtendedPrismaTransaction } from "@/lib/prisma";

export type InflowNestedTaxCodeInput = {
  taxCodeId: string;
  name: string;
  isActive: boolean;
  tax1Rate: number | string | Prisma.Decimal | null;
  tax2Rate: number | string | Prisma.Decimal | null;
};

export type InflowTaxingSchemeInput = {
  taxingSchemeId: string;
  name: string;
  isActive: boolean;
  isDefault: boolean;
  calculateTax2OnTax1: boolean;
  tax1Name: string | null;
  tax1OnShipping: boolean;
  tax2Name: string | null;
  tax2OnShipping: boolean;
  defaultTaxCodeId: string | null;
  // 👉 Optional array to cascade sync child codes directly
  taxCodes?: InflowNestedTaxCodeInput[]; 
};

/**
 * Executes a transactional upsert for an inFlow Taxing Scheme record along with its nested Tax Codes.
 */
export async function upsertTaxingScheme(
  txOrPrisma: typeof prisma | ExtendedPrismaTransaction,
  scheme: InflowTaxingSchemeInput
) {
  const payload = {
    name: scheme.name,
    isActive: scheme.isActive,
    isDefault: scheme.isDefault,
    calculateTax2OnTax1: scheme.calculateTax2OnTax1,
    tax1Name: scheme.tax1Name,
    tax1OnShipping: scheme.tax1OnShipping,
    tax2Name: scheme.tax2Name,
    tax2OnShipping: scheme.tax2OnShipping,
    defaultTaxCodeId: scheme.defaultTaxCodeId,
  };

  // 1. Primary Upsert: Ensure the parent TaxingScheme exists
  const parentScheme = await txOrPrisma.taxingScheme.upsert({
    where: {
      inflowId: scheme.taxingSchemeId,
    },
    create: {
      ...payload,
      inflowId: scheme.taxingSchemeId,
    },
    update: payload,
    select: {
      inflowId: true,
    },
  });

  // 2. Cascade Sync Child Tax Codes if provided in payload
  if (scheme.taxCodes && scheme.taxCodes.length > 0) {
    await Promise.all(
      scheme.taxCodes.map(async (code) => {
        const childPayload = {
          taxingSchemeId: parentScheme.inflowId, // Explicitly bound to our verified parent record
          name: code.name,
          isActive: code.isActive,
          tax1Rate: code.tax1Rate !== null && code.tax1Rate !== undefined 
            ? new Prisma.Decimal(code.tax1Rate.toString()) 
            : null,
          tax2Rate: code.tax2Rate !== null && code.tax2Rate !== undefined 
            ? new Prisma.Decimal(code.tax2Rate.toString()) 
            : null,
        };

        return await txOrPrisma.taxCode.upsert({
          where: {
            inflowId: code.taxCodeId,
          },
          create: {
            ...childPayload,
            inflowId: code.taxCodeId,
          },
          update: childPayload,
        });
      })
    );
  }

  return parentScheme;
}