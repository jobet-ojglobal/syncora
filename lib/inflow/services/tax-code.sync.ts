import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { InflowTaxCode } from "../types";

/**
 * Executes a single atomic database upsert for an inFlow Tax Code.
 * Safe for use in queues, looping orchestrators, or direct webhook endpoints.
 */
export async function upsertTaxCode(taxCode: InflowTaxCode) {
  return await prisma.$transaction(async (tx) => {
    const payload = {
      taxingSchemeId: taxCode.taxingSchemeId,
      name: taxCode.name,
      isActive: taxCode.isActive,
      tax1Rate: taxCode.tax1Rate !== null && taxCode.tax1Rate !== undefined 
        ? new Prisma.Decimal(taxCode.tax1Rate.toString()) 
        : null,
      tax2Rate: taxCode.tax2Rate !== null && taxCode.tax2Rate !== undefined 
        ? new Prisma.Decimal(taxCode.tax2Rate.toString()) 
        : null,
    };

    return await tx.taxCode.upsert({
      where: {
        inflowId: taxCode.taxCodeId,
      },
      create: {
        ...payload,
        inflowId: taxCode.taxCodeId,
      },
      update: payload,
    });
  });
}