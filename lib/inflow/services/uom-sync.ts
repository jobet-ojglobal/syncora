import { Prisma, UomCategory } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient;

export async function syncUom(
  tx: Tx,
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