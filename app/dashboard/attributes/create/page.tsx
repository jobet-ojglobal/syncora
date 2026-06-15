"use client";

import Link from "next/link";
import {
  ArrowLeft,
} from "lucide-react";

import PageHeader from "@/components/layout/dashboard/PageHeader";
import { AttributeForm } from "@/components/attribute/attribute-form";

export default function CreateAttributePage() {
  return (
    <div className="w-full max-w-xl mx-auto p-6 space-y-6">
      {/* HEADER */}
      <Link
        href="/dashboard/attributes"
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Attributes
      </Link>
      <PageHeader 
        title="Create Attribute"
        description="Add a new attribute." 
      />
      <AttributeForm />
    </div>
  );
}