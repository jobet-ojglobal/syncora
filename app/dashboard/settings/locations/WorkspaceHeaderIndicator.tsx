"use client";

import { useLocationWorkspace } from "@/context/LocationWorkspaceContext";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin } from "lucide-react";

export function WorkspaceHeaderIndicator() {
  const { activeLocation, isLoading } = useLocationWorkspace();

  if (isLoading) {
    return <Skeleton className="h-6 w-32 rounded-md" />;
  }

  if (!activeLocation) {
    return <span className="text-xs text-muted-foreground">No Location Selected</span>;
  }

  return (
    <div className="flex items-center gap-2 text-xs font-medium">
      <MapPin className="h-4 w-4 text-primary" />
      <span>{activeLocation.name}</span>

      {/* Real-time location health status dot */}
      <span
        className={`h-2 w-2 rounded-full ${
          activeLocation.isOnline ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
        }`}
        title={activeLocation.isOnline ? "Node Operational" : "Node Offline"}
      />
    </div>
  );
}