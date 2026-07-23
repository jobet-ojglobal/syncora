
// location.sync.ts
import { Prisma, PrismaClient } from "@/generated/prisma/client";
import { InflowLocation } from "../types";

type DbClient = Prisma.TransactionClient | PrismaClient;

/**
 * Executes a single atomic write operation for an individual Location record 
 * and its nested 1-to-1 Address details.
 */
export async function syncLocation(
  tx: DbClient, 
  location: InflowLocation
) {
  // 1. Map embedded address payload if provided
  const addressData = location.address
    ? {
        address1: location.address.address1 ?? null,
        address2: location.address.address2 ?? null,
        city: location.address.city ?? null,
        state: location.address.state ?? null,
        country: location.address.country ?? null,
        postalCode: location.address.postalCode ?? null,
        remarks: location.address.remarks ?? null,
        addressType: location.address.addressType ?? null,
      }
    : null;

  // 2. Upsert Core Location and 1:1 LocationAddress relation atomically
  return await tx.location.upsert({
    where: { inflowId: location.locationId },
    create: {
      inflowId: location.locationId,
      name: location.name,
      isActive: location.isActive ?? true,
      isDefault: location.isDefault ?? false,
      ...(addressData && {
        address: {
          create: addressData,
        },
      }),
    },
    update: {
      name: location.name,
      isActive: location.isActive ?? true,
      isDefault: location.isDefault ?? false,
      ...(addressData && {
        address: {
          upsert: {
            create: addressData,
            update: addressData,
          },
        },
      }),
    },
  });
}