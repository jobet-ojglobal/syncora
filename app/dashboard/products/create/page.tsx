import Link from "next/link";
import { ArrowLeft, PackagePlus } from "lucide-react";
import PageHeader from "@/components/layout/dashboard/PageHeader";
import { ProductForm } from "@/components/product/product-form";
import { getProductMetadata } from "@/services/product-metadata";

export default async function CreateProductPage() {
  const metadata = await getProductMetadata();

  return (
    <div className="w-full max-w-[90rem] mx-auto px-6 py-12 space-y-6">
      {/* NAVIGATION CONTROLS */}
      <Link
        href="/dashboard/products"
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Products
      </Link>

      <PageHeader 
        title="Create Product"
        description="Add a new product to your inventory catalog with custom pricing, variants, and units." 
        icon={PackagePlus}
      />
      
      <ProductForm 
        {...metadata}
      />
    </div>
  );
}