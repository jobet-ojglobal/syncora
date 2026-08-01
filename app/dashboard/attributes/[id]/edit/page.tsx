import Link from "next/link";
import {
  ArrowLeft,
} from "lucide-react";

import PageHeader from "@/components/layout/dashboard/PageHeader";
import { AttributeForm } from "@/components/attribute/attribute-form";
import { notFound } from "next/navigation";

async function getAttribute(id: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/admin/attributes/${id}/basic`,
      {
        cache: "no-store",
      }
    );

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error("Error loading attribute data:", error);
    return null;
  }
}

interface Props {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditAttributePage({ params }: Props) {
  const { id } = await params;
  const attribute = await getAttribute(id);

  if(!attribute) notFound();
  return (
    <div className="w-full max-w-2xl mx-auto p-6 space-y-6">
      {/* HEADER */}
      <Link
        href="/dashboard/attributes"
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Attributes
      </Link>
      <PageHeader 
        title="Edit Attribute"
        description="Add a edit attribute." 
      />
      <AttributeForm initialData={attribute} />
    </div>
  );
}