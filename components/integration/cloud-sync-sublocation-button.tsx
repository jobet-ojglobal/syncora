"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import {
  CloudSync,
  Loader2,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface SublocationOption {
  id: string;
  name: string;
  linkedLocationId: string | null;
  linkedLocation?: {
    name: string;
  } | null;
  stockQty: number;
}

interface CloudSyncButtonProps {
  source?: string;
  locationId?: string;
  locationName?: string;
  onSyncComplete?: () => void;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function CloudSyncSublocationButton({
  source = "outsync_inventory_levels",
  locationId,
  locationName,
  onSyncComplete,
}: CloudSyncButtonProps) {
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [showProgress, setShowProgress] = useState<boolean>(false);

  // Modal and loading states
  const [isSyncConfirmOpen, setIsSyncConfirmOpen] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Sublocation Selection State
  const [selectedSublocationIds, setSelectedSublocationIds] = useState<string[]>([]);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch sublocations that have linkedLocationId
  const { data: sublocations = [], isLoading: isLoadingSublocations } = useSWR<SublocationOption[]>(
    isSyncConfirmOpen && locationId
      ? `/api/locations/${locationId}/sublocations/linked`
      : null,
    fetcher
  );

  // Build a stable identifier string to avoid array-reference re-triggers
  const sublocationIdsKey = sublocations.map((s) => s.id).join(",");

  // ✅ FIX 1: Safely synchronize selected IDs when sublocations data actually changes
  useEffect(() => {
    if (sublocations.length > 0) {
      setSelectedSublocationIds(sublocations.map((sub) => sub.id));
    } else {
      setSelectedSublocationIds([]);
    }
  }, [sublocationIdsKey]); // Depend on primitive ID string instead of array reference

  // Sublocation toggle handlers
  const handleToggleSublocation = (id: string) => {
    setSelectedSublocationIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllSublocations = (checked: boolean) => {
    if (checked) {
      setSelectedSublocationIds(sublocations.map((sub) => sub.id));
    } else {
      setSelectedSublocationIds([]);
    }
  };

  // Trigger sync API call
  const handleCloudSync = async () => {
    try {
      setIsSyncing(true);

      const payload = {
        source,
        selectedLocations: locationId ? [locationId] : [],
        selectedRecords: selectedSublocationIds,
        syncedAll: selectedSublocationIds.length === sublocations.length,
      };

      const res = await fetch(`/api/sync/cloud/out`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to trigger cloud sync");
      }

      toast.success(data.message || "Cloud sync job queued successfully!");
      if (data.jobId) {
        setJobId(data.jobId);
        setStatus("pending");
        setProgress(0);
        setShowProgress(true);
      }
      onSyncComplete?.();
    } catch (err: any) {
      toast.error(err.message || "Cloud sync failed");
      setIsSyncing(false);
    } finally {
      setIsSyncConfirmOpen(false);
    }
  };

  // Check for active sync jobs on load
  useEffect(() => {
    let isMounted = true;
    async function checkForActiveJob() {
      try {
        const res = await fetch(`/api/sync?source=${source}`);
        if (!res.ok) return;

        const data = await res.json();
        if (isMounted && data.activeJob) {
          const job = data.activeJob;
          const activeStatuses = ["pending", "processing", "retrying"];
          if (activeStatuses.includes(job.status)) {
            setJobId(job.id);
            setProgress(job.progress || 0);
            setStatus(job.status);
            setError(job.error || "");
            setIsSyncing(true);
            setShowProgress(true);
          }
        }
      } catch (err) {
        console.error(`Error checking active sync job for ${source}:`, err);
      }
    }

    checkForActiveJob();
    return () => {
      isMounted = false;
    };
  }, [source]);

  // ✅ FIX 2: Store callback in a Ref to avoid adding unstable functions to useEffect dependencies
  const onSyncCompleteRef = useRef(onSyncComplete);

  useEffect(() => {
    onSyncCompleteRef.current = onSyncComplete;
  }, [onSyncComplete]);

  // Poll job status
  useEffect(() => {
    if (!jobId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/sync?jobId=${jobId}`);
        const data = await res.json();

        setProgress(Number(data.progress) || 0);
        setStatus(data.status);
        setError(data.error || "");

        const terminalStates = ["completed", "failed", "cancelled"];
        if (terminalStates.includes(data.status)) {
          clearInterval(interval);
          setIsSyncing(false);

          if (data.status === "completed") {
            onSyncCompleteRef.current?.();
          }

          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => {
            setShowProgress(false);
            setJobId(null);
          }, 4000);
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [jobId]);

  const cancelSync = async () => {
    if (!jobId) return;
    try {
      await fetch("/api/sync/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      setStatus("cancelled");
      setIsSyncing(false);
      toast.info("Sync job cancelled");
    } catch (err) {
      console.error("Failed to cancel sync:", err);
      toast.error("Failed to cancel sync process");
    }
  };

  const clearJobs = async () => {
    try {
      await fetch("/api/sync/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queue: "midworker" }),
      });
      setShowProgress(false);
      setJobId(null);
      setIsSyncing(false);
      toast.success("Sync queue cleared");
    } catch (err) {
      console.error("Failed to clear jobs:", err);
      toast.error("Failed to clear queue");
    }
  };

  const allSelected =
    sublocations.length > 0 && selectedSublocationIds.length === sublocations.length;

  return (
    <>
      {/* Trigger Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsSyncConfirmOpen(true)}
        disabled={isSyncing}
        className="h-8 gap-1.5 text-xs"
      >
        {isSyncing ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <CloudSync className="w-3.5 h-3.5" />
        )}
        Sync to Cloud
      </Button>

      {/* Cloud Sync Progress Banner */}
      {showProgress && (
        <div className="fixed bottom-4 right-4 z-50 w-80 p-4 border rounded-xl bg-card shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {status === "completed" && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
              {status === "failed" && <XCircle className="w-4 h-4 text-destructive" />}
              {status === "cancelled" && <AlertTriangle className="w-4 h-4 text-amber-500" />}
              {["pending", "processing", "retrying"].includes(status) && (
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
              )}
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Sync Status: <span className="text-foreground">{status || "Initializing"}</span>
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {isSyncing && status !== "cancelled" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={cancelSync}
                  className="h-7 px-2 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                >
                  <XCircle className="w-3.5 h-3.5 mr-1" />
                  Cancel
                </Button>
              )}
             
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Cloud Sync Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {error && (
            <p className="text-xs text-destructive font-medium bg-destructive/10 p-2 rounded">
              {error}
            </p>
          )}
        </div>
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={clearJobs}
        className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="w-3.5 h-3.5 mr-1" />
        Clear
      </Button>

      {/* Confirmation Modal with Sublocation Selection */}
      <AlertDialog open={isSyncConfirmOpen} onOpenChange={setIsSyncConfirmOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Cloud Sync</AlertDialogTitle>
            <AlertDialogDescription>
              Select linked sublocations for <strong>{locationName || "this location"}</strong> to queue for cloud sync.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Sublocations Selection Panel */}
          <div className="space-y-3 py-2">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Layers className="w-3.5 h-3.5" />
                <span>Linked Sublocations ({sublocations.length})</span>
              </div>
              {sublocations.length > 0 && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="select-all-sublocations"
                    checked={allSelected}
                    onCheckedChange={(checked) =>
                      handleSelectAllSublocations(Boolean(checked))
                    }
                  />
                  <Label
                    htmlFor="select-all-sublocations"
                    className="text-xs font-normal cursor-pointer select-none"
                  >
                    Select All
                  </Label>
                </div>
              )}
            </div>

            {isLoadingSublocations ? (
              <div className="flex items-center justify-center py-6 text-xs text-muted-foreground gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading linked sublocations...
              </div>
            ) : sublocations.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-2">
                No linked sublocations found for this location. Standard location sync will apply.
              </p>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {sublocations.map((sub) => {
                  const isChecked = selectedSublocationIds.includes(sub.id);
                  return (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between p-2 rounded-lg border bg-muted/30 hover:bg-muted/60 transition-colors"
                    >
                      <div className="flex items-center space-x-2.5">
                        <Checkbox
                          id={`sublocation-${sub.id}`}
                          checked={isChecked}
                          onCheckedChange={() => handleToggleSublocation(sub.id)}
                        />
                        <Label
                          htmlFor={`sublocation-${sub.id}`}
                          className="text-xs font-medium cursor-pointer select-none"
                        >
                          {sub.name} <span className="text-muted-foreground">[InvQty: {sub.stockQty}]</span>
                        </Label>
                      </div>
                      {sub.linkedLocation?.name && (
                        <span className="text-[10px] bg-background border px-1.5 py-0.5 rounded text-muted-foreground">
                          → {sub.linkedLocation.name}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSyncing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCloudSync}
              disabled={
                isSyncing ||
                (sublocations.length > 0 && selectedSublocationIds.length === 0)
              }
            >
              {isSyncing ? "Enqueuing..." : "Confirm & Sync"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}