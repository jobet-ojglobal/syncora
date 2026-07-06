import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PageHeader from "@/components/layout/dashboard/PageHeader";
import { ProductGroupForm } from "@/components/product/group-form";
import { getProductGroupMetadata } from "@/services/product-metadata";

export default async function CreateProductGroupPage() {
  const metadata = await getProductGroupMetadata();

  return (
    <div className="w-full max-w-5xl mx-auto p-6 space-y-6">
      <Link
        href="/dashboard/groups"
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Group Products
      </Link>
      <PageHeader title="Create Group Product" description="Add a new group product." />
      <ProductGroupForm {...metadata} />
    </div>
  );
}