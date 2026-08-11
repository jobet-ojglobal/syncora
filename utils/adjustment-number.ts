import { Prisma, PrismaClient } from "@/generated/prisma/client";

export async function generateAdjustmentNumber(tx: Prisma.TransactionClient | PrismaClient): Promise<string> {
  // Explicitly lock the table in EXCLUSIVE mode for the duration of this transaction.
  // Other concurrent transactions will wait until this transaction commits.
  await tx.$executeRaw`
    LOCK TABLE "inventory_adjustment" IN EXCLUSIVE MODE;
  `;

  // Fetch the current MAXIMUM numeric ID value instead of COUNT to safely handle deletes
  const result = await tx.$queryRaw<Array<{ max_num: bigint | number | null }>>`
    SELECT MAX(
      NULLIF(
        regexp_replace("adjustmentNumber", '^ADJ-', ''), 
        ''
      )::bigint
    ) AS max_num 
    FROM "inventory_adjustment"
  `;

  const currentMax = Number(result[0]?.max_num ?? 0);
  const nextNum = (currentMax + 1).toString().padStart(5, "0");

  return `ADJ-${nextNum}`;
}