"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, Settings2, ListFilter, RefreshCw } from "lucide-react";
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
  source: string; // e.g., "products_local"
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
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  
  // Pagination & Sync All Controls
  const [syncedAll, setSyncedAll] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  // Fetch initial batch
  const fetchPreviewBatch = async (cursor?: string) => {
    const isFirstPage = !cursor;
    if (isFirstPage) {
      setIsPreviewLoading(true);
      setPreviewItems([]);
      setSelectedItemIds([]);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const url = new URL("/api/sync/preview", window.location.origin);
      url.searchParams.set("source", source);
      url.searchParams.set("locationId", locationId);
      url.searchParams.set("limit", "50");
      if (cursor) url.searchParams.set("after", cursor);

      const res = await fetch(url.toString());
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load preview elements");

      const newItems: PreviewItem[] = data.items || [];

      if (isFirstPage) {
        setPreviewItems(newItems);
        setSelectedItemIds(newItems.map((item) => item.id));
      } else {
        setPreviewItems((prev) => [...prev, ...newItems]);
        setSelectedItemIds((prev) => [...prev, ...newItems.map((item) => item.id)]);
      }

      setNextCursor(data.pagination?.nextCursor || null);
      setHasMore(Boolean(data.pagination?.hasMore));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load pipeline options");
    } finally {
      setIsPreviewLoading(false);
      setIsLoadingMore(false);
    }
  };

  const handleOpenConfiguration = () => {
    setIsModalOpen(true);
    setSyncedAll(false);
    fetchPreviewBatch();
  };

  // Poll job execution status
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
  }, [jobId, locationId]);

  // Selection toggles
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

  // Start Sync Request
  const startSync = async () => {
    setIsModalOpen(false);
    try {
      setIsSyncing(true);
      setShowProgress(true);
      setError("");
      setProgress(0);
      setStatus("pending");

      const recordsToSync = previewItems.filter((item) => selectedItemIds.includes(item.id));

      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source,
          locationId,
          syncedAll, // Send bypass flag to background job
          selectedRecords: syncedAll ? [] : recordsToSync,
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
        <DialogContent className="sm:max-w-[480px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-muted-foreground" />
              Configure {title} Sync Range
            </DialogTitle>
            <DialogDescription>
              Select items manually or toggle sync all to bypass preview selection.
            </DialogDescription>
          </DialogHeader>

          {/* Sync All Toggle Option */}
          <div className="flex items-center justify-between p-3 border rounded-xl bg-accent/20">
            <div className="space-y-0.5">
              <Label htmlFor="sync-all-toggle" className="font-semibold cursor-pointer">
                Sync All Records
              </Label>
              <p className="text-xs text-muted-foreground">
                Bypasses selection list and processes all remote records across pages.
              </p>
            </div>
            <Checkbox
              id="sync-all-toggle"
              checked={syncedAll}
              onCheckedChange={(checked) => setSyncedAll(!!checked)}
            />
          </div>

          {isPreviewLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              Reading records stream from destination...
            </div>
          ) : previewItems.length > 0 ? (
            <div className={`py-2 ${syncedAll ? "opacity-50 pointer-events-none" : ""}`}>
              {/* Master Select All Toggle */}
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border bg-muted/40 mb-3">
                <Checkbox
                  id="select-all-records"
                  disabled={syncedAll}
                  checked={isAllChecked ? true : isSomeChecked ? "indeterminate" : false}
                  onCheckedChange={(checked) => handleSelectAll(!!checked)}
                />
                <Label htmlFor="select-all-records" className="font-semibold cursor-pointer select-none flex-1">
                  {isAllChecked ? "Deselect All Loaded Items" : "Select All Loaded Items"}
                </Label>
              </div>

              <Separator className="my-2" />

              {/* Records List */}
              <div className="grid gap-2.5 max-h-[260px] overflow-y-auto pr-1 pt-1">
                {previewItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 rounded-lg border p-3 shadow-sm hover:bg-accent/30 transition-colors"
                  >
                    <Checkbox
                      id={`record-${item.id}`}
                      disabled={syncedAll}
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

              {/* Load More Pagination Button */}
              {hasMore && (
                <div className="pt-3 text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isLoadingMore || syncedAll}
                    onClick={() => nextCursor && fetchPreviewBatch(nextCursor)}
                    className="w-full gap-2"
                  >
                    {isLoadingMore ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    Load More Items
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-sm text-center text-muted-foreground flex flex-col items-center gap-2">
              <ListFilter className="h-8 w-8 text-muted-foreground/60" />
              No remote staging record entries found on current endpoint.
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={(!syncedAll && selectedItemIds.length === 0) || isPreviewLoading}
              onClick={startSync}
            >
              {syncedAll ? "Run Full Pipeline (All)" : `Run Pipeline (${selectedItemIds.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sync Job Progress View */}
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