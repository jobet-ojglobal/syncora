import Link from "next/link";
import {
  ArrowLeft,
} from "lucide-react";
import { notFound } from "next/navigation";
import PageHeader from "@/components/layout/dashboard/PageHeader";
import { LocationForm } from "@/components/location/location-form";

async function getLocation(id: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/admin/locations/${id}/basic`,
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

export default async function EditLocationPage({ params }: Props) {
  const { id } = await params;
  const location = await getLocation(id);

  if(!location) notFound();

  return (
      <div className="w-full max-w-xl mx-auto p-6 space-y-6">
        {/* HEADER */}
        <Link
          href="/dashboard/locations"
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Location
        </Link>
        <PageHeader 
          title="Edit Location" 
          description="Update location information." 
        />

        <LocationForm initialData={location} />
      </div>
  );
}
