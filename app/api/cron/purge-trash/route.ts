// app/api/cron/purge-trash/route.ts
/*
Soft deleting means tables will bloat over time. 
To avoid accumulation problems, write an automated script or API route run nightly 
(via Vercel Crons or a background job worker) to permanently 
drop anything inside the trash for more than 30 days:
*/
import { prisma } from "@/lib/prisma";
import { subDays } from "date-fns";

export async function GET() {
  const cutoffDate = subDays(new Date(), 30);

  // Hard delete anything deleted over 30 days ago
  await prisma.product.deleteMany({
    where: { deletedAt: { lte: cutoffDate } }
  });

  return new Response("Purged expired archives successfully", { status: 200 });
}