"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, Settings2, ListFilter } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

type SyncButtonProps = {
  source: string; // e.g., "taxing_schemes_local"
  title: string;
  locationId: string;
  isDisabled: boolean;
};

type PreviewItem = {
  id: string;
  name: string;
  description?: string;
  rawData: any;
};

export function SyncButtonPreviewOptions({ source, title, locationId, isDisabled }: SyncButtonProps) {
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  // 1. Fetch live preview when modal is requested open
  const handleOpenConfiguration = async () => {
    setIsModalOpen(true);
    setIsPreviewLoading(true);
    setPreviewItems([]);
    setSelectedItemIds([]);
    try {
      const res = await fetch(`/api/sync/preview?source=${source}&locationId=${locationId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load preview elements");
      
      setPreviewItems(data.items || []);
      // Auto check everything by default
      setSelectedItemIds((data.items || []).map((item: PreviewItem) => item.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load pipeline options");
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // 2. Poll job status logic
  useEffect(() => {
    if (!jobId) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/sync?jobId=${jobId}&locationId=${locationId}`);
        const data = await res.json();
        setProgress(Number(data.progress) || 0);
        setStatus(data.status);
        if (data.status === "completed" || data.status === "failed") {
          clearInterval(interval);
          setIsSyncing(false);
          setTimeout(() => {
            setShowProgress(false);
            setJobId(null);
          }, 4000);
        }
      } catch (err) {
        console.error(err);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [jobId]);

  // Checkbox interactions
  const isAllChecked = selectedItemIds.length === previewItems.length && previewItems.length > 0;
  const isSomeChecked = selectedItemIds.length > 0 && selectedItemIds.length < previewItems.length;

  const handleSelectAll = (checked: boolean) => {
    setSelectedItemIds(checked ? previewItems.map((item) => item.id) : []);
  };

  const handleItemCheck = (id: string, checked: boolean) => {
    setSelectedItemIds((prev) =>
      checked ? [...prev, id] : prev.filter((item) => item !== id)
    );
  };

  // 3. Initiate job with explicit sub-selection payload
  const startSync = async () => {
    setIsModalOpen(false);
    try {
      setIsSyncing(true);
      setShowProgress(true);
      setError("");
      setProgress(0);
      setStatus("pending");

      // Extract the full matching object records matching chosen checked UI components
      const recordsToSync = previewItems.filter((item) => selectedItemIds.includes(item.id));

      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source,
          locationId,
          selectedRecords: recordsToSync, // Pass structured selection constraints down to worker
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start sync");
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
        onClick={handleOpenConfiguration}
        disabled={isSyncing || isDisabled}
        className="w-full rounded-xl flex items-center justify-center gap-2"
      >
        {isSyncing && <Loader2 className="h-4 w-4 animate-spin" />}
        {isSyncing ? `${title} Syncing...` : `Sync ${title}`}
      </Button>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-muted-foreground" />
              Configure {title} Sync Range
            </DialogTitle>
            <DialogDescription>
              Fetch payload records identified from source. Select which items to ingest into the pipeline.
            </DialogDescription>
          </DialogHeader>

          {isPreviewLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              Reading records stream from destination...
            </div>
          ) : previewItems.length > 0 ? (
            <div className="py-2">
              {/* Master checkbox toggle */}
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border bg-muted/40 mb-3">
                <Checkbox
                  id="select-all-records"
                  checked={isAllChecked ? true : isSomeChecked ? "indeterminate" : false}
                  onCheckedChange={(checked) => handleSelectAll(!!checked)}
                />
                <Label htmlFor="select-all-records" className="font-semibold cursor-pointer select-none flex-1">
                  {isAllChecked ? "Deselect All Found Records" : "Select All Found Records"}
                </Label>
              </div>

              <Separator className="my-2" />

              {/* Individual Remote Record Iterations */}
              <div className="grid gap-2.5 max-h-[280px] overflow-y-auto pr-1 pt-1">
                {previewItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 rounded-lg border p-3 shadow-sm hover:bg-accent/30 transition-colors"
                  >
                    <Checkbox
                      id={`record-${item.id}`}
                      checked={selectedItemIds.includes(item.id)}
                      onCheckedChange={(checked) => handleItemCheck(item.id, !!checked)}
                    />
                    <div className="grid gap-0.5 leading-none flex-1">
                      <Label htmlFor={`record-${item.id}`} className="font-medium cursor-pointer select-none">
                        {item.name}
                      </Label>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-8 text-sm text-center text-muted-foreground flex flex-col items-center gap-2">
              <ListFilter className="h-8 w-8 text-muted-foreground/60" />
              No remote staging record entries found on current endpoint route matching source metadata parameters.
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              disabled={selectedItemIds.length === 0 || isPreviewLoading} 
              onClick={startSync}
            >
              Run Pipeline ({selectedItemIds.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Progress View Output block remains identical layout format below */}
      {showProgress && jobId && (
        <div className="rounded-xl border bg-card p-3 shadow-sm text-card-foreground animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center justify-between text-sm font-medium mb-1.5">
            <span className="capitalize text-muted-foreground">Sync Job Status</span>
            <span className="flex items-center gap-1.5 font-semibold">
              {status === "completed" && <span className="text-green-600 flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Finished</span>}
              {status === "failed" && <span className="text-red-600 flex items-center gap-1"><XCircle className="h-4 w-4" /> Failed</span>}
              {status !== "completed" && status !== "failed" && <span className="text-blue-600 animate-pulse">{status}...</span>}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
            <div
              className={`h-full transition-all duration-300 ease-out rounded-full ${
                status === "completed" ? "bg-green-500" : status === "failed" ? "bg-red-500" : "bg-blue-600"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-right text-xs text-muted-foreground mt-1">{progress}%</div>
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