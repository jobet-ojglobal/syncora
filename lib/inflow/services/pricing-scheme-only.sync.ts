import { prisma } from "@/lib/prisma";
import { InflowPricingScheme } from "../types";
import type { ExtendedPrismaTransaction } from "@/lib/prisma";


/**
 * Executes a single atomic database upsert for an inFlow Pricing Scheme.
 * Accepts an optional transaction client context to stay within existing sync blocks.
 */
export async function upsertPricingScheme(
  txOrPrisma: typeof prisma | ExtendedPrismaTransaction,
  scheme: InflowPricingScheme
) {
  return await txOrPrisma.pricingScheme.upsert({
    where: {
      inflowId: scheme.pricingSchemeId,
    },
    create: {
      inflowId: scheme.pricingSchemeId,
      currencyId: scheme.currencyId,
      name: scheme.name,
      isActive: scheme.isActive,
      isDefault: scheme.isDefault,
      isTaxInclusive: scheme.isTaxInclusive,
    },
    update: {
      currencyId: scheme.currencyId,
      name: scheme.name,
      isActive: scheme.isActive,
      isDefault: scheme.isDefault,
      isTaxInclusive: scheme.isTaxInclusive,
    },
  });
}