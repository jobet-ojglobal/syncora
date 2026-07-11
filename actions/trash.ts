// app/actions/trash.ts
"use server"
import { prisma } from "@/lib/prisma";

export interface TrashItem {
  id: string;
  title: string;
  modelType: "Product" | "Category" | "Brand" | "Location";
  deletedAt: Date;
}

export async function getGlobalTrash(): Promise<TrashItem[]> {
  // Query tables in parallel bypassing the extension's fallback filter by passing explicit deletedAt
  const [products, categories, brands] = await Promise.all([
    prisma.product.findMany({ where: { deletedAt: { not: null } } }),
    prisma.category.findMany({ where: { deletedAt: { not: null } } }),
    prisma.brand.findMany({ where: { deletedAt: { not: null } } }),
  ]);

  const trash: TrashItem[] = [
    ...products.map(p => ({ id: p.id, title: p.name, modelType: "Product" as const, deletedAt: p.deletedAt! })),
    ...categories.map(c => ({ id: c.id, title: c.name, modelType: "Category" as const, deletedAt: c.deletedAt! })),
    ...brands.map(b => ({ id: b.id, title: b.name, modelType: "Brand" as const, deletedAt: b.deletedAt! })),
  ];

  // Sort by most recently deleted
  return trash.sort((a, b) => b.deletedAt.getTime() - a.deletedAt.getTime());
}