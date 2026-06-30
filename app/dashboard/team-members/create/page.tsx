// app/admin/team-members/create/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { TeamMemberForm } from "@/components/team-member/team-member-form";

export default function CreateTeamMemberPage() {
  const [hydrationData, setHydrationData] = useState<{ locationLookup: any[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadWorkspaceRequirements() {
      try {
        const res = await fetch("/api/admin/team-members/form-hydration");
        if (!res.ok) throw new Error("API infrastructure dropped structural dataset assembly.");
        const data = await res.json();
        setHydrationData(data);
      } catch (err: any) {
        setError(err.message || "Failed loading security access infrastructure maps.");
      }
    }
    loadWorkspaceRequirements();
  }, []);

  if (error) return <div className="p-6 text-xs text-destructive bg-destructive/10 border rounded-xl">{error}</div>;
  if (!hydrationData) return (
    <div className="p-24 flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground italic">
      <Loader2 className="w-5 h-5 animate-spin text-primary" />
      Assembling enterprise authorization lookup indices matrix...
    </div>
  );

  return (
    <div className="w-full max-w-5xl mx-auto p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-primary" /> Provision New Operative
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Establish directory identity handles and register security privilege parameters.
        </p>
      </div>

      <TeamMemberForm
        locationLookup={hydrationData.locationLookup} 
        initialData={null} 
      />
    </div>
  );
}