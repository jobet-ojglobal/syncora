import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
} from "lucide-react";
import PageHeader from "@/components/layout/dashboard/PageHeader";
import { LocationForm } from "@/components/location/location-form";

export default function CreateCategoryPage() {
  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6 text-xs">
      {/* HEADER */}
      <Link
        href="/dashboard/locations"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
         Back to Locations
      </Link>
      <PageHeader
        title="Add New Location"
        description="Configure a new operational workspace, warehouse, or fulfillment center location."
        icon={MapPin}
      />
      <LocationForm />
    </div>
  );
}