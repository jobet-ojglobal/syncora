// app/admin/team-members/[id]/edit/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { TeamMemberForm } from "@/components/team-members/team-member-form";
import { Loader2, ShieldCheck } from "lucide-react";

export default function EditTeamMemberPage() {
  const params = useParams();
  const [hydrationData, setHydrationData] = useState<{ locationLookup: any[]; initialData: any } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params?.id) return;
    
    async function loadTargetProfileProperties() {
      try {
        const res = await fetch(`/api/admin/team-members/form-hydration?id=${params.id}`);
        if (!res.ok) {
          const payload = await res.json();
          throw new Error(payload.error || "Database rejected account state rehydration parameters.");
        }
        const data = await res.json();
        setHydrationData(data);
      } catch (err: any) {
        setError(err.message || "Network disconnect timeout handling credential extraction.");
      }
    }
    loadTargetProfileProperties();
  }, [params?.id]);

  if (error) return <div className="p-6 text-xs text-destructive bg-destructive/10 border rounded-xl">{error}</div>;
  if (!hydrationData) return (
    <div className="p-24 flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground italic">
      <Loader2 className="w-5 h-5 animate-spin text-primary" />
      Extracting historical permission profiles mappings metadata lines...
    </div>
  );

  return (
    <div className="w-full max-w-5xl mx-auto p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" /> Modify Operative Authority Settings
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Adjust active operational clearance zones or revoke system access tokens for this directory ledger file card.
        </p>
      </div>

      <TeamMemberForm 
        locationLookup={hydrationData.locationLookup} 
        initialData={hydrationData.initialData} 
      />
    </div>
  );
}