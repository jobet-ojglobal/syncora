// app/admin/uoms/edit/[id]/page.tsx (or matching structure layout)
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2, Scale } from "lucide-react";
import { UomForm } from "@/components/uom/uom-form";
import Link from "next/link";
import PageHeader from "@/components/layout/dashboard/PageHeader";

export default function UomEditPage() {
  const params = useParams();
  const [hydrationData, setHydrationData] = useState<{ uomListLookup: any[]; initialData: any } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadFormRequirements() {
      try {
        // Append URL query parameters cleanly if managing an edit state line tree context
        const endpoint = params?.id 
          ? `/api/admin/uoms/form-hydration?id=${params.id}`
          : "/api/admin/uoms/form-hydration";

        const res = await fetch(endpoint);
        if (!res.ok) throw new Error("API server pipeline dropped data payload construction.");
        const data = await res.json();
        setHydrationData(data);
      } catch (err: any) {
        setError(err.message || "Failed hydrating metrics workspace forms.");
      }
    }
    loadFormRequirements();
  }, [params?.id]);

  if (error) return <div className="p-6 text-xs text-destructive bg-destructive/10 border rounded-xl">{error}</div>;
  if (!hydrationData) return (
    <div className="p-24 flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground italic">
      <Loader2 className="w-5 h-5 animate-spin text-primary" />
      Syncing logistics system scale conversion rules schemas...
    </div>
  );

  return (
    <div className="w-full max-w-3xl mx-auto p-6 space-y-6">
      <Link
        href="/dashboard/uoms"
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Uoms
      </Link>
      <PageHeader 
        title="Modify Metric Settings"
        description="Alter calibration thresholds for system-wide logistics rules parameters." 
      />
      <UomForm
        uomListLookup={hydrationData.uomListLookup} 
        initialData={hydrationData.initialData} 
      />
    </div>
  );
}