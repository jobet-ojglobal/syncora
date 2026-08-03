"use server";

import { prisma } from "@/lib/prisma";

export interface TrashItem {
  id: string;
  inflowId?: string;
  title: string;
  modelType:
    | "User"
    | "Attribute"
    | "Category"
    | "Currency"
    | "Taxing Scheme"
    | "Pricing Scheme"
    | "Payment Term"
    | "Product"
    | "Brand"
    | "Customer"
    | "Vendor"
    | "Product Group"
    | "Location"
    | "Team Member"
    | "Adjustment Reason"
  deletedAt: Date;
}

export async function getGlobalTrash(): Promise<TrashItem[]> {
  const [
    users,
    attributes,
    categories,
    currencies,
    taxingSchemes,
    pricingSchemes,
    paymentTerms,
    products,
    brands,
    customers,
    vendors,
    productGroups,
    locations,
    teamMembers,
    adjusmentReasons
  ] = await Promise.all([
    prisma.user.findMany({ where: { deletedAt: { not: null } } }),
    prisma.attribute.findMany({ where: { deletedAt: { not: null } } }),
    prisma.category.findMany({ where: { deletedAt: { not: null } } }),
    prisma.currency.findMany({ where: { deletedAt: { not: null } } }),
    prisma.taxingScheme.findMany({ where: { deletedAt: { not: null } } }),
    prisma.pricingScheme.findMany({ where: { deletedAt: { not: null } } }),
    prisma.paymentTerm.findMany({ where: { deletedAt: { not: null } } }),
    prisma.product.findMany({ where: { deletedAt: { not: null } } }),
    prisma.brand.findMany({ where: { deletedAt: { not: null } } }),
    prisma.customer.findMany({
      where: { deletedAt: { not: null } },
      include: { businessPartner: true },
    }),
    prisma.vendor.findMany({
      where: { deletedAt: { not: null } },
      include: { businessPartner: true },
    }),
    prisma.productGroup.findMany({ where: { deletedAt: { not: null } } }),
    prisma.location.findMany({ where: { deletedAt: { not: null } } }),
    prisma.teamMember.findMany({ where: { deletedAt: { not: null } } }),
    prisma.adjustmentReason.findMany({ where: { deletedAt: { not: null } } }),
  ]);

  const trash: TrashItem[] = [
    ...users.map((u) => ({
      id: u.id,
      title: u.name,
      modelType: "User" as const,
      deletedAt: u.deletedAt!,
    })),

    ...attributes.map((a) => ({
      id: a.id,
      title: a.name,
      modelType: "Attribute" as const,
      deletedAt: a.deletedAt!,
    })),

    ...categories.map((c) => ({
      id: c.id,
      title: c.name,
      modelType: "Category" as const,
      deletedAt: c.deletedAt!,
    })),

    ...currencies.map((c) => ({
      id: c.id,
      title: c.name,
      modelType: "Currency" as const,
      deletedAt: c.deletedAt!,
    })),

    ...taxingSchemes.map((t) => ({
      id: t.id,
      inflowId: t.inflowId,
      title: t.name,
      modelType: "Taxing Scheme" as const,
      deletedAt: t.deletedAt!,
    })),

    ...pricingSchemes.map((p) => ({
      id: p.id,
      inflowId: p.inflowId,
      title: p.name,
      modelType: "Pricing Scheme" as const,
      deletedAt: p.deletedAt!,
    })),

    ...paymentTerms.map((p) => ({
      id: p.id,
      inflowId: p.inflowId,
      title: p.name,
      modelType: "Payment Term" as const,
      deletedAt: p.deletedAt!,
    })),

    ...products.map((p) => ({
      id: p.id,
      title: p.name,
      modelType: "Product" as const,
      deletedAt: p.deletedAt!,
    })),

    ...brands.map((b) => ({
      id: b.id,
      title: b.name,
      modelType: "Brand" as const,
      deletedAt: b.deletedAt!,
    })),

    ...customers.map((c) => ({
      id: c.id,
      inflowId: c.inflowId,
      title: c.businessPartner.name,
      modelType: "Customer" as const,
      deletedAt: c.deletedAt!,
    })),

    ...vendors.map((v) => ({
      id: v.id,
      inflowId: v.inflowId,
      title: v.businessPartner.name,
      modelType: "Vendor" as const,
      deletedAt: v.deletedAt!,
    })),

    ...productGroups.map((g) => ({
      id: g.id,
      title: g.name,
      modelType: "Product Group" as const,
      deletedAt: g.deletedAt!,
    })),

    ...locations.map((l) => ({
      id: l.id,
      title: l.name,
      modelType: "Location" as const,
      deletedAt: l.deletedAt!,
    })),

    ...teamMembers.map((l) => ({
      id: l.id,
      title: l.name,
      modelType: "Team Member" as const,
      deletedAt: l.deletedAt!,
    })),

    ...adjusmentReasons.map((l) => ({
      id: l.id,
      title: l.name,
      modelType: "Adjustment Reason" as const,
      deletedAt: l.deletedAt!,
    })),
  ];

  return trash.sort(
    (a, b) => b.deletedAt.getTime() - a.deletedAt.getTime()
  );
}