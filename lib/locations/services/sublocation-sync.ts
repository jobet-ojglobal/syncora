// lib/inflow/services/sublocation.sync.ts

import { Prisma } from "@/generated/prisma/client";

export type SublocationSyncPayload = {
  locationId: string;
  name: string;
};

/**
 * Upserts a global Sublocation record within an existing Prisma transaction context.
 * Uses the compound unique constraint [locationId, name].
 */
export async function sublocationSync(
  tx: Prisma.TransactionClient,
  payload: SublocationSyncPayload
) {
  const { locationId, name } = payload;

  const sublocation = await tx.sublocation.upsert({
    where: {
      locationId_name: {
        locationId,
        name,
      },
    },
    update: {
      name,
    },
    create: {
      locationId,
      name,
    },
    select: {
      id: true,
      locationId: true,
      name: true,
    },
  });

  return sublocation;
}