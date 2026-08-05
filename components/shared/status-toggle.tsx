"use client";

import * as React from "react";
import { Power, PowerOff } from "lucide-react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface RowActionProps {
  id: string;
  name: string;
  isActive: boolean;
  endpointUrl?: string;
  onSuccess?: () => void;
  icon1?: React.ComponentType<{ className?: string }>; 
  icon2?: React.ComponentType<{ className?: string }>; 
}

export function StatusAction({
  id,
  name,
  isActive,
  endpointUrl = "/api/admin/adjustment-reasons/status",
  onSuccess,
  icon1: Icon1 = Power, 
  icon2: Icon2 = PowerOff, 

}: RowActionProps) {
  const [isPending, setIsPending] = React.useState(false);

  const handleToggleActiveState = async () => {
    try {
      setIsPending(true);
      const response = await fetch(endpointUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: !isActive }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to update record status");
      }

      toast.success("Status Synchronized", {
        description: `"${name}" is now ${!isActive ? "Active" : "Deactivated"}.`,
      });

      // Trigger SWR re-fetch or parent callback
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      toast.error("State Mutation Exception", {
        description: err.message || "Failed to update item status. Please try again.",
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            disabled={isPending}
            onClick={handleToggleActiveState}
            className={`inline-flex items-center justify-center p-1.5 rounded-md border transition-colors disabled:opacity-50 ${
              isActive
                ? "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-800"
                : "bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/20 dark:border-amber-800"
            }`}
          >
            {isActive ? (
              <Icon1 className={`w-3.5 h-3.5 ${isPending ? "animate-pulse" : ""}`} />
            ) : (
              <Icon2 className={`w-3.5 h-3.5 ${isPending ? "animate-pulse" : ""}`} />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{isActive ? "Click to Deactivate Item" : "Click to Activate Item"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}