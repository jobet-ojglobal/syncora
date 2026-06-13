import Link from "next/link";
import {
  ArrowLeft,
} from "lucide-react";

import { EditCategoryForm } from "@/components/category/edit-category-form";
import { notFound } from "next/navigation";
import PageHeader from "@/components/layout/dashboard/PageHeader";

async function getCategory(id: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/admin/categories/${id}/basic`,
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

export default async function EditCategoryPage({ params }: Props) {
  const { id } = await params;
  const category = await getCategory(id);

  if(!category) notFound();

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
          title="Edit Category" 
          description="Update category information and hierarchy." 
        />

        <EditCategoryForm initialCategory={category} />
      </div>
  );
}
