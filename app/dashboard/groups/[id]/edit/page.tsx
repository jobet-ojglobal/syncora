import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PageHeader from "@/components/layout/dashboard/PageHeader";
import { notFound } from "next/navigation";
import { ProductGroupForm } from "@/components/product/group-form";
import { prisma } from "@/lib/prisma";
import { getProductGroupMetadata } from "@/services/product-metadata";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: Props) {
  const { id: targetId } = await params;

  // Resolve metadata lookups and individual item queries in true parallel pipeline
  const [metadata, groupData] = await Promise.all([
    getProductGroupMetadata(),
    prisma.productGroup.findFirst({
      where: {
        OR: [{ id: targetId }, { slug: targetId }],
      },
      include: {
        options: {
          orderBy: { lineNum: "asc" },
          include: {
            attribute: { select: { name: true } },
            values: {
              orderBy: { lineNum: "asc" },
              include: { attributeValue: { select: { value: true } } },
            },
          },
        },
        variants: {
          include: {
            product: {
              select: { inflowId: true, sku: true, name: true, isActive: true },
            },
          },
        },
        features: {
          include: {
            feature: true,
            featureValue: { select: { value: true } },
          },
        },
        tags: { include: { tag: true } },
      },
    }),
  ]);

  if (!groupData) return notFound();

  const formattedData = {
    id: groupData.inflowId,
    name: groupData.name,
    slug: groupData.slug,
    description: groupData.description,
    brandId: groupData.brandId,
    categoryId: groupData.categoryId,
    isActive: groupData.isActive,
    tags: groupData.tags.map((pt) => pt.tag.name),
    features: groupData.features.map((f) => ({
      key: f.feature.name,
      value: f.featureValue?.value,
    })),
    options: groupData.options.map((opt) => ({
      name: opt.attribute?.name || "",
      attributeId: opt.attributeId || "",
      values: opt.values.map((v) => ({
        value: v.attributeValue?.value || "",
      })),
    })),
    variants: groupData.variants.map((v) => ({
      productId: v.productId,
      variantId: v.inflowId,
      sku: v.product.sku,
      name: v.product.name,
      defaultPrice: Number(v.defaultPrice),
      isExisting: true,
      status: "active",
    })),
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-6 space-y-6">
      <Link
        href="/dashboard/groups"
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Groups
      </Link>
      <PageHeader title="Edit Product Group" description="Edit a product group." />
      <ProductGroupForm initialData={formattedData} {...metadata} />
    </div>
  );
}