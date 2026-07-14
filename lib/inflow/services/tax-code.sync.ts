import { Prisma } from "@/generated/prisma/client";
import { InflowTaxCode } from "../types";
import { prisma } from "@/lib/prisma";

type Tx = Prisma.TransactionClient;

/**
 * Executes a single database upsert for an inFlow Tax Code.
 * Accepts an optional transaction client context to stay within existing sync blocks.
 */
export async function upsertTaxCode(
  txOrPrisma: typeof prisma | Tx,
  taxCode: InflowTaxCode
) {
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

  return await txOrPrisma.taxCode.upsert({
    where: {
      inflowId: taxCode.taxCodeId,
    },
    create: {
      ...payload,
      inflowId: taxCode.taxCodeId,
    },
    update: payload,
  });
}