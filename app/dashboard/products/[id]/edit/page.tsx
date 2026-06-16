import Link from "next/link";
import {
  ArrowLeft,
} from "lucide-react";
import PageHeader from "@/components/layout/dashboard/PageHeader";
import { ProductForm } from "@/components/products/product-form";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

async function getProduct(id: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/admin/products/${id}/basic`,
      {
        cache: "no-store",
      }
    );

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error("Error loading product data:", error);
    return null;
  }
}

interface Props {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;
  const product = await getProduct(id);

  if(!product) notFound();
  
  const [ brands, categories] = await Promise.all([
    prisma.brand.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: "asc" },
    }),

    prisma.category.findMany({
      select: {
        inflowId: true,
        name: true,
      },
      orderBy: { name: "asc" },
    }),
  ])

  return (
    <div className="w-full max-w-5xl mx-auto p-6 space-y-6">
      {/* HEADER */}
      <Link
        href="/dashboard/products"
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Products
      </Link>
      <PageHeader 
        title="Create Product"
        description=" Add a new product." 
      />
      <ProductForm initialData={product} brands={brands} categories={categories} />
    </div>
  );
}
