import { prisma } from "@/lib/prisma";

// Define a type matching the incoming structure from your external data source
export type InflowPaymentTermInput = {
  paymentTermsId: string;
  name: string;
  daysDue: number;
  isActive: boolean;
};

/**
 * Executes a single atomic database upsert for an inFlow Payment Term.
 * Can be reused in loops, webhook handlers, or API endpoints.
 */
export async function upsertPaymentTerm(term: InflowPaymentTermInput) {
  return await prisma.$transaction(async (tx) => {
    return await tx.paymentTerm.upsert({
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
  });
}