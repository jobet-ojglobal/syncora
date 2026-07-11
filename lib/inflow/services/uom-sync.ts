import { Prisma, UomCategory } from "@/generated/prisma/client";
import type { ExtendedPrismaTransaction, prisma } from "@/lib/prisma";

export async function syncUom(
  tx: typeof prisma | ExtendedPrismaTransaction,
  code: string,
  name: string,
  category: UomCategory = "COUNT",
  baseFactor = 1
) {
  return tx.unitOfMeasure.upsert({
    where: { code },
    create: {
      code,
      name,
      category,
      baseFactor,
    },
    update: {
      name,
    },
  });
}