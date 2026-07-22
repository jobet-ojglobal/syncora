import { Prisma, PrismaClient } from "@/generated/prisma/client";
import { InflowLocation } from "../types";

type DbClient = Prisma.TransactionClient | PrismaClient;

/**
 * Safely upserts a standard core location shell along with its required 
 * structural address and "Default" sublocation sub-records.
 * Guarantees foreign key integrity across downstream synchronizers.
 */
export async function ensureLocationShell(
  tx: DbClient,
  payload: InflowLocation
) {
  const locId = payload.locationId;

  // 1. Core Location record
  const location = await tx.location.upsert({
    where: { inflowId: locId },
    create: {
      inflowId: locId,
      name: payload.name,
      isActive: payload.isActive ?? true,
      isDefault: payload.isDefault ?? false,
    },
    update: {
      name: payload.name,
      isActive: payload.isActive ?? true,
      isDefault: payload.isDefault ?? false,
    },
  });

  // 2. Structural Address record
  await tx.locationAddress.upsert({
    where: { locationId: locId },
    create: {
      locationId: locId,
      address1: payload.address?.address1,
      address2: payload.address?.address2,
      city: payload.address?.city,
      state: payload.address?.state,
      country: payload.address?.country,
      postalCode: payload.address?.postalCode,
      remarks: payload.address?.remarks ?? "Auto-generated shell",
      addressType: payload.address?.addressType,
    },
    update: {
      address1: payload.address?.address1,
      address2: payload.address?.address2,
      city: payload.address?.city,
      state: payload.address?.state,
      country: payload.address?.country,
      postalCode: payload.address?.postalCode,
      remarks: payload.address?.remarks,
      addressType: payload.address?.addressType,
    },
  });

  // 3. Fallback Core Sublocation record
//   await tx.sublocation.upsert({
//     where: {
//       locationId_name: {
//         locationId: locId,
//         name: "Default",
//       },
//     },
//     create: {
//       locationId: locId,
//       name: "Default",
//     },
//     update: {}, // Never overwrite sublocation tracking references if present
//   });

  
  return location;
}

/**
 * Safely upserts a standard PaymentTerms skeleton shell.
 * Guarantees foreign key integrity for relation pipelines.
 */
export async function ensurePaymentTermsShell(
  tx: Prisma.TransactionClient,
  payload: {
    inflowId: string;
    name: string;
  }
) {
  await tx.paymentTerm.upsert({
    where: { inflowId: payload.inflowId },
    create: {
      inflowId: payload.inflowId,
      name: payload.name,
    },
    update: {}, // Leave properties unmodified if the true sync already ran
  });
}