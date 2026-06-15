import Link from "next/link";
import {
  ArrowLeft,
} from "lucide-react";
import PageHeader from "@/components/layout/dashboard/PageHeader";
import { ProductForm } from "@/components/products/product-form";
import { prisma } from "@/lib/prisma";

export default async function CreateBrandPage() {
  const brands = await  prisma.brand.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="w-full max-w-5xl mx-auto p-6 space-y-6">
      {/* HEADER */}
      <Link
        href="/dashboard/brands"
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Brands
      </Link>
      <PageHeader 
        title="Create Brand"
        description=" Add a new manufacturer or product brand." 
      />
      <ProductForm brands={brands} />
    </div>
  );
}
