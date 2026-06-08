"use client";

import { useState, useEffect } from "react";

export default function TestSyncButton() {
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [jobData, setJobData] = useState<any>(null);

  const handleSync = async () => {
    setLoading(true);
    setError("");
    setStatus("");
    setJobData(null);

    try {
      const response = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "test" }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to queue sync");
        return;
      }

      setJobId(data.jobId);
      setStatus("Job queued, waiting for processing...");

      // Poll job status
      pollJobStatus(data.jobId);
    } catch (err) {
      setError("Error queuing sync job");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const pollJobStatus = async (jId: string) => {
    let isPolling = true;

    const interval = setInterval(async () => {
      if (!isPolling) {
        clearInterval(interval);
        return;
      }

      try {
        const response = await fetch(`/api/sync?jobId=${jId}`);
        const data = await response.json();

        if (response.ok) {
          setJobData(data);
          setStatus(`Status: ${data.status} | Progress: ${data.progress}%`);

          if (data.status === "completed") {
            setStatus(`✓ Sync completed! ${data.data?.itemsProcessed || 0} items processed`);
            isPolling = false;
            clearInterval(interval);
          } else if (data.status === "failed") {
            setError(`Job failed: ${data.error}`);
            isPolling = false;
            clearInterval(interval);
          }
        }
      } catch (err) {
        console.error("Error polling status:", err);
      }
    }, 1000);

    // Stop polling after 5 minutes
    setTimeout(() => {
      isPolling = false;
      clearInterval(interval);
    }, 5 * 60 * 1000);
  };

  return (
    <div className="flex flex-col gap-4 p-6 bg-blue-50 rounded-lg border border-blue-200">
      <h2 className="text-lg font-semibold text-blue-900">Sync Test</h2>
      <button
        onClick={handleSync}
        disabled={loading}
        className={`px-6 py-2 rounded-lg font-medium transition-colors ${
          loading
            ? "bg-gray-300 text-gray-600 cursor-not-allowed"
            : "bg-blue-600 text-white hover:bg-blue-700"
        }`}
      >
        {loading ? "Syncing..." : "Start Sync"}
      </button>

      {jobId && (
        <div className="text-sm text-gray-700 font-mono bg-gray-100 p-3 rounded">
          <p>Job ID: {jobId}</p>
        </div>
      )}

      {status && (
        <div className="text-sm text-blue-800 bg-blue-100 p-3 rounded">
          {status}
        </div>
      )}

      {jobData && (
        <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded border border-gray-200">
          <p className="font-semibold mb-2">Job Details:</p>
          <p>Source: {jobData.source}</p>
          <p>Status: {jobData.status}</p>
          <p>Progress: {jobData.progress}%</p>
          <p>Created: {new Date(jobData.createdAt).toLocaleString()}</p>
          {jobData.data && (
            <div className="mt-2 text-xs">
              <p>Items Processed: {jobData.data.itemsProcessed}</p>
              {jobData.data.syncedAt && <p>Synced At: {jobData.data.syncedAt}</p>}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="text-sm text-red-800 bg-red-100 p-3 rounded">
          {error}
        </div>
      )}
    </div>
  );
}
