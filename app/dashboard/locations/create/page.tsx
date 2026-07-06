import Link from "next/link";
import {
  ArrowLeft,
} from "lucide-react";
import PageHeader from "@/components/layout/dashboard/PageHeader";
import { LocationForm } from "@/components/location/location-form";

export default function CreateCategoryPage() {
  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-12 space-y-6">
      {/* HEADER */}
      <Link
        href="/dashboard/locations"
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Locations
      </Link>
      <PageHeader 
        title="Create Locations"
        description="Add a new location." 
      />
      <LocationForm />
    </div>
  );
}