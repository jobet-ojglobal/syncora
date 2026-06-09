"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type SyncButtonProps = {
  source: string;
  title: string;
};

export function SyncButton({
  source,
  title,
}: SyncButtonProps) {
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (!jobId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/sync?jobId=${jobId}`
        );

        const data = await res.json();

        setProgress(Number(data.progress) || 0);
        setStatus(data.status);
        setError(data.error || "");

        if (
          data.status === "completed" ||
          data.status === "failed"
        ) {
          clearInterval(interval);
          setIsSyncing(false);
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
      setError("");
      setProgress(0);
      setStatus("pending");

      const res = await fetch("/api/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error || "Failed to start sync"
        );
      }

      setJobId(data.jobId);
    } catch (err) {
      setIsSyncing(false);

      setError(
        err instanceof Error
          ? err.message
          : "Unknown error"
      );
    }
  };

  return (
    <div className="space-y-2">
      <Button
        onClick={startSync}
        disabled={isSyncing}
        className="w-full rounded-xl"
      >
        {isSyncing
          ? `${title} Running...`
          : title}
      </Button>

      {jobId && (
        <>
          <div className="flex justify-between text-sm">
            <span>Status</span>
            <span>{status}</span>
          </div>

          <div className="h-3 overflow-hidden rounded bg-gray-200">
            <div
              className="h-full bg-blue-600 transition-all"
              style={{
                width: `${progress}%`,
              }}
            />
          </div>

          <div className="text-right text-xs text-muted-foreground">
            {progress}%
          </div>
        </>
      )}

      {error && (
        <div className="rounded bg-red-50 p-2 text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  );
}