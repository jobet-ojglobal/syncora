
import { Prisma, UomCategory } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type Tx = Prisma.TransactionClient;

export async function syncUom(
  tx: typeof prisma | Tx,
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