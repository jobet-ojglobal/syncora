import { prisma } from "@/lib/prisma";

export async function getVendorMetadata() {
  try {
    // Pull all base catalog lookup collections concurrently directly via Prisma
    const [taxingRaw, termsRaw, currenciesRaw] = await Promise.all([
      prisma.taxingScheme.findMany({ select: { inflowId: true, name: true }, orderBy: { name: "asc" } }),
      prisma.paymentTerm.findMany({ select: { inflowId: true, name: true }, orderBy: { name: "asc" } }),
      prisma.currency.findMany({ select: { inflowId: true, name: true }, orderBy: { name: "asc" } }),
    ]);

    // Transform structures into uniform { id, name } payloads expected by the VendorForm dropdowns
    return {
      taxing: taxingRaw.map((t) => ({ id: t.inflowId  , name: t.name })),
      terms: termsRaw.map((t) => ({ id: t.inflowId, name: t.name })),
      currencies: currenciesRaw.map((c) => ({ id: c.inflowId, name: c.name })),
    };
  } catch (error) {
    // If the database is missing during a Docker build step, fail gracefully
    console.warn("⚠️ Database unavailable during generation sequence. Falling back to empty arrays.");
    return { taxing: [], terms: [], currencies: [] };
  }
}