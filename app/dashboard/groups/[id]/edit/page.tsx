import Link from "next/link";
import {
  ArrowLeft,
} from "lucide-react";
import PageHeader from "@/components/layout/dashboard/PageHeader";
import { notFound } from "next/navigation";
import { ProductGroupForm } from "@/components/product/group-form";

async function getBrands() {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/admin/brands/basic`,
      {
        cache: "no-store",
      }
    );

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error("Error loading brands data:", error);
    return null;
  }
}

async function getCategories() {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/admin/categories/basic`,
      {
        cache: "no-store",
      }
    );

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error("Error loading categories data:", error);
    return null;
  }
}

async function getAttributes() {
  try {
     const response = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/admin/attributes/basic`,
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


async function getGroup(id: string) {
  try {
     const response = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/admin/groups/${id}/basic`,
      {
        cache: "no-store",
        next: { revalidate: 0 }
      }
    );

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error("Error loading attributes data:", error);
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
  const group = await getGroup(id); 

  if(!group) notFound();
  
  const [brands, categories, attributes] = await Promise.all([
    getBrands(),
    getCategories(),
    getAttributes(),
  ]);

  return (
    <div className="w-full max-w-5xl mx-auto p-6 space-y-6">
      {/* HEADER */}
      <Link
        href="/dashboard/groups"
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Groups
      </Link>
      <PageHeader 
        title="Edit Product Group"
        description=" Edit a product group." 
      />
      <ProductGroupForm 
        initialData={group}
        brands={brands}
        categories={categories}
        attributes={attributes}
      />
    </div>
  );
}
