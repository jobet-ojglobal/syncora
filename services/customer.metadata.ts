// services/customer.metadata.ts
import { SoftDeleteRepository } from "@/lib/softDeleteRepository";

export async function getCustomerMetadata() {
  try {
    // Execute all queries concurrently on the database engine
    const [
      pricingRaw,
      taxingRaw,
      termsRaw,
      locationsRaw,
      repsRaw
    ] = await Promise.all([
      SoftDeleteRepository.findMany("pricingScheme", { select: { inflowId: true, name: true }, orderBy: { name: "asc" } }),
      SoftDeleteRepository.findMany("taxingScheme",{ select: { inflowId: true, name: true }, orderBy: { name: "asc" } }),
      SoftDeleteRepository.findMany("paymentTerm",{ select: { inflowId: true, name: true }, orderBy: { name: "asc" } }),
      SoftDeleteRepository.findMany("location",{ select: { inflowId: true, name: true }, orderBy: { name: "asc" } }),
      SoftDeleteRepository.findMany("teamMember", {
        where: { canBeSalesRep: true },
        select: { inflowId: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

    // Transform raw data structures into the standard UI shape in a single pass
    return {
      pricing: pricingRaw.map((p) => ({ id: p.inflowId, name: p.name })),
      taxing: taxingRaw.map((t) => ({ id: t.inflowId, name: t.name })),
      terms: termsRaw.map((t) => ({ id: t.inflowId, name: t.name })),
      locations: locationsRaw.map((l) => ({ id: l.inflowId, name: l.name })),
      reps: repsRaw.map((r) => ({ id: r.inflowId, name: r.name })),
    };
  } catch (error) {
    // If the database is missing during a Docker build step, fail gracefully
    console.warn("⚠️ Database unavailable during generation sequence. Falling back to empty arrays.");
    return { pricing: [], taxing: [], terms: [], locations: [], reps: [] };
  }
}