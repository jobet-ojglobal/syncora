"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

type SyncButtonProps = {
  source: string;
  title: string;
};

export function SyncButton({ source, title }: SyncButtonProps) {
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [showProgress, setShowProgress] = useState(false);

  useEffect(() => {
    if (!jobId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/sync?jobId=${jobId}`);
        const data = await res.json();

        setProgress(Number(data.progress) || 0);
        setStatus(data.status);
        setError(data.error || "");

        if (data.status === "completed" || data.status === "failed") {
          clearInterval(interval);
          setIsSyncing(false);

          // Hide the progress element after 3 seconds so the user can verify success
          setTimeout(() => {
            setShowProgress(false);
            setJobId(null); // Reset job tracking completely
          }, 3000);
        }
      } catch (err) {
        console.error(err);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [jobId]);

  const startSync = async () => {
    try {
      setIsSyncing(true);
      setShowProgress(true); // Explicitly show tracking pane
      setError("");
      setProgress(0);
      setStatus("pending");

      const res = await fetch("/api/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ source }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to start sync");
      }

      setJobId(data.jobId);
    } catch (err) {
      setIsSyncing(false);
      setShowProgress(false);
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  return (
    <div className="space-y-3">
      <Button
        onClick={startSync}
        disabled={isSyncing}
        className="w-full rounded-xl flex items-center justify-center gap-2"
      >
        {isSyncing && <Loader2 className="h-4 w-4 animate-spin" />}
        {isSyncing ? `${title} Syncing...` : `Sync ${title}`}
      </Button>

      {/* Conditionally managed slide-down / fade tracking layout */}
      {showProgress && jobId && (
        <div className="rounded-xl border bg-card p-3 shadow-sm text-card-foreground animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center justify-between text-sm font-medium mb-1.5">
            <span className="capitalize text-muted-foreground">Status</span>
            <span className="flex items-center gap-1.5 font-semibold">
              {status === "completed" && (
                <span className="text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> Finished
                </span>
              )}
              {status === "failed" && (
                <span className="text-red-600 flex items-center gap-1">
                  <XCircle className="h-4 w-4" /> Failed
                </span>
              )}
              {status !== "completed" && status !== "failed" && (
                <span className="text-blue-600 animate-pulse">{status}</span>
              )}
            </span>
          </div>

          <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
            <div
              className={`h-full transition-all duration-300 ease-out rounded-full ${
                status === "completed"
                  ? "bg-green-500"
                  : status === "failed"
                  ? "bg-red-500"
                  : "bg-blue-600"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="text-right text-xs text-muted-foreground mt-1">
            {progress}%
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50/50 p-3 text-sm text-red-600 flex items-start gap-2">
          <XCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}
    </div>
  );
}