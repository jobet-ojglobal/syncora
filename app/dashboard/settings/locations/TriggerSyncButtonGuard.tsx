"use client";

import { useLocationWorkspace } from "@/context/LocationWorkspaceContext";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export function TriggerSyncButton() {
  const { activeLocation } = useLocationWorkspace();

  const handleManualSync = () => {
    if (!activeLocation?.isOnline) return;
    // Execute sync action...
  };

  return (
    <div className="space-y-2">
      <Button
        onClick={handleManualSync}
        disabled={!activeLocation || !activeLocation.isOnline}
      >
        Sync Local Data
      </Button>

      {activeLocation && !activeLocation.isOnline && (
        <p className="text-[11px] text-destructive flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Cannot trigger sync: <strong>{activeLocation.name}</strong> terminal is offline.
        </p>
      )}
    </div>
  );
}