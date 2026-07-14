import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type Tx = Prisma.TransactionClient;

export type InflowPaymentTermInput = {
  paymentTermsId: string;
  name: string;
  daysDue: number;
  isActive: boolean;
};

/**
 * Executes a single atomic database upsert for an inFlow Payment Term.
 * Accepts an optional transaction client context to stay within existing sync blocks.
 */
export async function upsertPaymentTerm(
  txOrPrisma: typeof prisma | Tx,
  term: InflowPaymentTermInput
) {
  // Use 'any' type conversion conditionally if the underlying runtime throws an internal matching issue,
  // or call the client operation directly as shown here:
  return await (txOrPrisma as any).paymentTerm.upsert({
    where: {
      inflowId: term.paymentTermsId,
    },
    create: {
      inflowId: term.paymentTermsId,
      name: term.name,
      daysDue: term.daysDue,
      isActive: term.isActive,
    },
    update: {
      name: term.name,
      daysDue: term.daysDue,
      isActive: term.isActive,
    },
  });
}