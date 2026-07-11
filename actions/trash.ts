"use server"
import { prisma } from "@/lib/prisma";

export interface TrashItem {
  id: string;
  inflowId?: string; // Included since models like TaxingScheme use this heavily
  title: string;
  modelType: "Brand" | "Category" | "Product" | "Taxing Scheme" | "Tax Code" | "Customer";
  deletedAt: Date;
}

export async function getGlobalTrash(): Promise<TrashItem[]> {
  // Query tables in parallel, bypassing the global extension filter by passing { not: null }
  const [brands, categories, products, taxingSchemes, taxCodes, customers] = await Promise.all([
    prisma.brand.findMany({ where: { deletedAt: { not: null } } }),
    prisma.category.findMany({ where: { deletedAt: { not: null } } }),
    prisma.product.findMany({ where: { deletedAt: { not: null } } }),
    prisma.taxingScheme.findMany({ where: { deletedAt: { not: null } } }),
    prisma.taxCode.findMany({ where: { deletedAt: { not: null } } }),
    prisma.customer.findMany({ where: { deletedAt: { not: null } }, include: { businessPartner: true } }),
  ]);

  const trash: TrashItem[] = [
    ...brands.map(b => ({ id: b.id, title: b.name, modelType: "Brand" as const, deletedAt: b.deletedAt! })),
    ...categories.map(c => ({ id: c.id, title: c.name, modelType: "Category" as const, deletedAt: c.deletedAt! })),
    ...products.map(p => ({ id: p.id, title: p.name, modelType: "Product" as const, deletedAt: p.deletedAt! })),
    ...taxingSchemes.map(t => ({ id: t.id, inflowId: t.inflowId, title: t.name, modelType: "Taxing Scheme" as const, deletedAt: t.deletedAt! })),
    ...taxCodes.map(tc => ({ id: tc.id, inflowId: tc.inflowId, title: tc.name, modelType: "Tax Code" as const, deletedAt: tc.deletedAt! })),
    ...customers.map(c => ({ id: c.id, inflowId: c.inflowId, title: c.businessPartner.name, modelType: "Customer" as const, deletedAt: c.deletedAt! })),
  ];

  // Sort chronologically (most recently deleted first)
  return trash.sort((a, b) => b.deletedAt.getTime() - a.deletedAt.getTime());
}