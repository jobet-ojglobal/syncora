import { prisma } from "@/lib/prisma";
import { InflowPricingScheme } from "../types";

/**
 * Executes a single atomic database upsert for an inFlow Pricing Scheme.
 */
export async function upsertPricingScheme(scheme: InflowPricingScheme) {
  return await prisma.$transaction(async (tx) => {
    return await tx.pricingScheme.upsert({
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
  });
}