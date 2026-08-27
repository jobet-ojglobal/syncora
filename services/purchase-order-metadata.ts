import { prisma } from "@/lib/prisma";

export async function getPurchaseMetadata() {
  try {
    const [
      rawVendors,
      rawProducts,
      currencies,
      paymentTerms,
      taxingSchemes,
      locations,
      teamMembers,
    ] = await Promise.all([
      prisma.vendor.findMany({
        where: {
          deletedAt: null,
          businessPartner: { isActive: true },
        },
        select: {
          inflowId: true,
          businessPartner: {
            select: { name: true },
          },
        },
        orderBy: {
          businessPartner: { name: "asc" },
        },
      }),

      prisma.product.findMany({
        where: { deletedAt: null },
        select: { inflowId: true, name: true },
        orderBy: { name: "asc" },
      }),

      prisma.currency.findMany({
        where: { deletedAt: null },
        select: { inflowId: true, name: true },
        orderBy: { name: "asc" },
      }),

      prisma.paymentTerm.findMany({
        where: { deletedAt: null },
        select: { inflowId: true, name: true },
        orderBy: { name: "asc" },
      }),

      prisma.taxingScheme.findMany({
        where: { deletedAt: null },
        select: { inflowId: true, name: true },
        orderBy: { name: "asc" },
      }),

      prisma.location.findMany({
        where: { deletedAt: null },
        select: { inflowId: true, name: true },
        orderBy: { name: "asc" },
      }),

      prisma.teamMember.findMany({
        where: { deletedAt: null },
        select: { inflowId: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

    return {
      vendors: rawVendors.map((v) => ({
        id: v.inflowId,
        name: v.businessPartner.name,
      })),

      products: rawProducts.map((p) => ({
        id: p.inflowId,
        name: p.name,
        unitPrice: 0
      })),

      currencies: currencies.map((c) => ({
        id: c.inflowId,
        name: c.name,
      })),

      paymentTerms: paymentTerms.map((p) => ({
        id: p.inflowId,
        name: p.name,
      })),

      taxingSchemes: taxingSchemes.map((t) => ({
        id: t.inflowId,
        name: t.name,
      })),

      locations: locations.map((l) => ({
        id: l.inflowId,
        name: l.name,
      })),

      teamMembers: teamMembers.map((t) => ({
        id: t.inflowId,
        name: t.name,
      })),
    };
  } catch (error) {
    console.warn(
      "⚠️ Database unavailable during generation sequence. Falling back to empty arrays."
    );

    return {
      vendors: [],
      products: [],
      currencies: [],
      paymentTerms: [],
      taxingSchemes: [],
      locations: [],
      teamMembers: [],
    };
  }
}

// vendors: { id: string; name: string }[];
// products: { id: string; name: string; unitPrice?: number }[];
// currencies: { id: string; name: string }[];
// paymentTerms: { id: string; name: string }[];
// taxingSchemes: { id: string; name: string }[];
// locations: { id: string; name: string }[];
// teamMembers: { id: string; name: string }[];