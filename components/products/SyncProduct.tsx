"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export default function SyncProduct() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (!jobId) return;

    const interval = setInterval(async () => {
        const res = await fetch(`/api/sync?jobId=${jobId}`);
        const data = await res.json();

        setProgress(Number(data.progress) || 0);
        setStatus(data.status);
        setError(data.error || "");

        if (data.status === "completed" || data.status === "failed") {
        clearInterval(interval);
        setIsSyncing(false);
        }
    }, 1000);

    return () => clearInterval(interval);
    }, [jobId]); 

  const startSync = async () => {
    setIsSyncing(true);
    setError("");
    setStatus("Starting...");
    
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "products" }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Request failed");
      }

      const data = await res.json();
      setJobId(data.jobId);
    } catch (err: any) {
      setError(err.message || "Failed to start sync");
      setIsSyncing(false);
      setJobId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Button variant="outline"  onClick={startSync} disabled={isSyncing}>
        {isSyncing ? "Product Syncing..." : "Product Sync"}
      </Button>

      {jobId && (
        <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Status:</span>
            <span className={status === 'Failed' ? 'text-red-600' : 'text-green-600'}>
              {status}
            </span>
          </div>

          <div className="w-full rounded-lg bg-gray-200 h-4 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${status === 'Failed' ? 'bg-red-500' : 'bg-blue-600'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          
          <div className="flex justify-between text-xs text-gray-500">
            <span>0%</span>
            <span>{progress}%</span>
            <span>100%</span>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded border border-red-200">
              <strong>Error:</strong> {error}
            </div>
          )}
          
          {status === 'Completed' && (
            <div className="p-3 bg-green-50 text-green-700 text-sm rounded border border-green-200">
              Sync completed successfully!
            </div>
          )}
        </div>
      )}
    </div>
  );
}