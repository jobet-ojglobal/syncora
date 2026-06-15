import Link from "next/link";

import {
  ArrowLeft,
} from "lucide-react";

import { CategoryForm } from "@/components/category/category-form";
import PageHeader from "@/components/layout/dashboard/PageHeader";

export default function CreateCategoryPage() {
  return (
    <div className="w-full max-w-xl mx-auto p-6 space-y-6">
      {/* HEADER */}
      <Link
        href="/dashboard/categories"
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Categories
      </Link>
      <PageHeader 
        title="Create Category"
        description="Add a new product category or hierarchy." 
      />
      <CategoryForm />
    </div>
  );
}