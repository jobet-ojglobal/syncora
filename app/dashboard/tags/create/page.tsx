"use client";

import Link from "next/link";
import {
  ArrowLeft,
} from "lucide-react";

import PageHeader from "@/components/layout/dashboard/PageHeader";
import { TagForm } from "@/components/tag/tag-form";

export default function CreateTagPage() {
  return (
    <div className="w-full max-w-xl mx-auto p-6 space-y-6">
      <Link
        href="/dashboard/tags"
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Tags
      </Link>
      <PageHeader 
        title="Create Tag"
        description="Add a new tag." 
      />
      <TagForm />
    </div>
  );
}