import Link from "next/link";
import {
  ArrowLeft,
} from "lucide-react";
import PageHeader from "@/components/layout/dashboard/PageHeader";
import { prisma } from "@/lib/prisma";
import { ProductGroupForm } from "@/components/products/group-form";


async function getAttributes() {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/admin/attributes/basic`,
      {
        cache: "no-store",
      }
    );

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error("Error loading attributes data:", error);
    return null;
  }
}

export default async function CreateProductGroupPage() {
  
  const [brands, categories, attributes, productsLookup] = await Promise.all([
    prisma.brand.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: "asc" },
    }),

    prisma.category.findMany({
      select: {
        id: true,
        inflowId: true,
        name: true,
      },
      orderBy: { name: "asc" },
    }),

    getAttributes(),

    prisma.product.findMany({
      select: {
        id: true,
        inflowId: true,
        name: true,
        sku: true
      },
      orderBy: { name: "asc" },
    }),
  ])

  return (
    <div className="w-full max-w-5xl mx-auto p-6 space-y-6">
      {/* HEADER */}
      <Link
        href="/dashboard/groups"
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Group Products
      </Link>
      <PageHeader 
        title="Create Group Product"
        description=" Add a new group product." 
      />
      <ProductGroupForm 
        brands={brands} 
        categories={categories} 
        attributes={attributes}
        />
    </div>
  );
}
