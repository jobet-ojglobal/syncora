"use client";

import { useEffect, useRef, useState } from "react";
import {
  CloudSync,
  Loader2,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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

interface CloudSyncButtonProps {
  source?: string;
  title?: string;
  locationId?: string;
  locationName?: string;
  onSyncComplete?: () => void;
}

export function CloudSyncButton({
  source = "outsync_inventory_levels",
  title,
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

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Trigger sync API call
  const handleCloudSync = async () => {
    try {
      setIsSyncing(true);

      const payload = {
        source,
        selectedLocations: locationId ? [locationId] : [],
        selectedRecords: [],
        syncedAll: true,
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
            onSyncComplete?.();
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
  }, [jobId, onSyncComplete]);

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

  // const clearJobs = async () => {
  //   try {
  //     await fetch("/api/sync/clear", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({ queue: "midworker" }),
  //     });
  //     setShowProgress(false);
  //     setJobId(null);
  //     setIsSyncing(false);
  //     toast.success("Sync queue cleared");
  //   } catch (err) {
  //     console.error("Failed to clear jobs:", err);
  //     toast.error("Failed to clear queue");
  //   }
  // };

  // Dynamic dialog message based on sync target context
  const getConfirmationDescription = () => {
    if (locationName) {
      return (
        <>
          Are you sure you want to push all inventory records for{" "}
          <strong>{locationName}</strong> to the cloud worker queue?
        </>
      );
    }

    if (locationId) {
      return (
        <>
          Are you sure you want to push all inventory records for location{" "}
          <strong>{locationId}</strong> to the cloud worker queue?
        </>
      );
    }

    if (source === "cloudsync_products") {
      return (
        <>
          Are you sure you want to push <strong>all catalog products</strong> to
          the cloud worker queue?
        </>
      );
    }

    return (
      <>
        Are you sure you want to push all <strong>{source.replace(/_/g, " ")}</strong> records
        to the cloud worker queue?
      </>
    );
  };

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
        { title ? title : "Sync to Cloud" }
      </Button>

      {/* Cloud Sync Progress Overlay / Status Banner */}
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
              {/* <Button
                variant="ghost"
                size="sm"
                onClick={clearJobs}
                className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Clear
              </Button> */}
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

      {/* Confirmation Modal */}
      <AlertDialog open={isSyncConfirmOpen} onOpenChange={setIsSyncConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Cloud Sync</AlertDialogTitle>
            <AlertDialogDescription>
              {getConfirmationDescription()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSyncing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCloudSync} disabled={isSyncing}>
              {isSyncing ? "Enqueuing..." : "Confirm & Sync"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}