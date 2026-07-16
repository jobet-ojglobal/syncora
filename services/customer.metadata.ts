// services/customer.metadata.ts
import { SoftDeleteRepository } from "@/lib/softDeleteRepository";

export async function getBusinessPartnerMetadata() {
  try {
    // Execute all queries concurrently on the database engine
    const [
      currencyRaw,
      pricingRaw,
      taxingRaw,
      termsRaw,
      locationsRaw,
      repsRaw
    ] = await Promise.all([
      SoftDeleteRepository.findMany("currency", { select: { inflowId: true, name: true }, orderBy: { name: "asc" } }),
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
      currencies: currencyRaw.map((p) => ({ id: p.inflowId, name: p.name })),
      pricingSchemes: pricingRaw.map((p) => ({ id: p.inflowId, name: p.name })),
      taxingSchemes: taxingRaw.map((t) => ({ id: t.inflowId, name: t.name })),
      paymentTerms: termsRaw.map((t) => ({ id: t.inflowId, name: t.name })),
      locations: locationsRaw.map((l) => ({ id: l.inflowId, name: l.name })),
      salesReps: repsRaw.map((r) => ({ id: r.inflowId, name: r.name })),
    };
  } catch (error) {
    // If the database is missing during a Docker build step, fail gracefully
    console.warn("⚠️ Database unavailable during generation sequence. Falling back to empty arrays.");
    return { currencies: [], pricingSchemes: [], taxingSchemes: [], paymentTerms: [], locations: [], salesReps: [] };
  }
}