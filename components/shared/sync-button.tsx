"use client";

import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, Settings2 } from "lucide-react";
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

export interface Location {
  id: string;
  inflowId: string;
  name: string;
  isActive: boolean;
}

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

          setTimeout(() => {
            setShowProgress(false);
            setJobId(null);
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
      setShowProgress(true);
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

// Static configuration registry for fixed entities
const STATIC_SYNC_CONFIG_REGISTRY: Record<
  string,
  { id: string; label: string; apiField: string }[]
> = {
  products: [
    { id: "upsertCore", label: "Upsert Core Product Data", apiField: "coreData" },
    { id: "category", label: "Product Category", apiField: "category" },
    { id: "productBarcodes", label: "Barcodes & Identifiers", apiField: "productBarcodes" },
    { id: "images", label: "Product Images", apiField: "images" },
    { id: "cost", label: "Product Cost", apiField: "cost" },
    { id: "taxCodes", label: "Tax Codes & Schemes", apiField: "taxCodes.taxCode,taxCodes.taxingScheme" },
    { id: "productOperations", label: "Manufacturing Operations", apiField: "productOperations" },
    { id: "prices", label: "Price Schemes & Matrix Lists", apiField: "prices.pricingScheme.currency" },
    { id: "attachments", label: "File Attachments", apiField: "attachments.lastModifiedBy" },
    {
      id: "reorderSettings",
      label: "Location Reorder Settings",
      apiField: "reorderSettings.vendor,reorderSettings.location,reorderSettings.fromLocation",
    },
    {
      id: "resolveGroupRelations",
      label: "Link & Sync Parent Variant Groups",
      apiField: "productVariant.productGroup.category,productVariant.productGroup.options.optionValues",
    },
  ],
  product_groups: [
    { id: "upsertCore", label: "Upsert Core Group Data", apiField: "coreData" },
    { id: "groupCategory", label: "Product Group Category", apiField: "category" },
    { id: "groupCustom", label: "Default Product Custom Data", apiField: "defaultProduct" },
    { id: "groupImages", label: "Product Group Shared Gallery", apiField: "images.image" },
    { id: "groupVariants", label: "Deep Variant Tree Resolution", apiField: "productVariants.product.category" },
  ],
  vendors: [
    { id: "lastModifiedBy", label: "Last Modify By", apiField: "lastModifiedBy" },
    { id: "taxingScheme", label: "Default Taxing Scheme", apiField: "taxingScheme" },
    { id: "defaultPaymentTerms", label: "Default Payment Terms", apiField: "defaultPaymentTerms" },
    { id: "vendorItems.product", label: "Vendor Items", apiField: "vendorItems.product" },
  ],
};

export function SyncButtonOptions({ source, title }: SyncButtonProps) {
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);

  // Fetch location choices if source is 'inventory'
  useEffect(() => {
    if (source === "inventory") {
      setIsLoadingLocations(true);
      fetch("/api/locations/lookup")
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => setLocations(data))
        .catch((err) => console.error("Error fetching locations:", err))
        .finally(() => setIsLoadingLocations(false));
    }
  }, [source]);

  // Dynamically compute selectable options list based on `source`
  const currentOptions = useMemo(() => {
    if (source === "inventory") {
      return locations.map((loc) => ({
        id: loc.id,
        label: loc.name,
        apiField: loc.inflowId || loc.id,
      }));
    }
    return STATIC_SYNC_CONFIG_REGISTRY[source] || [];
  }, [source, locations]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Reset/Initialize selection checklist whenever option choices update
  useEffect(() => {
    setSelectedIds(currentOptions.map((o) => o.id));
  }, [currentOptions]);

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
          setTimeout(() => {
            setShowProgress(false);
            setJobId(null);
          }, 3000);
        }
      } catch (err) {
        console.error(err);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [jobId]);

  const isAllChecked =
    currentOptions.length > 0 && selectedIds.length === currentOptions.length;
  const isSomeChecked =
    selectedIds.length > 0 && selectedIds.length < currentOptions.length;

  const handleSelectAllChange = (checked: boolean) => {
    setSelectedIds(checked ? currentOptions.map((o) => o.id) : []);
  };

  const handleCheckboxChange = (id: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? [...prev, id] : prev.filter((item) => item !== id)
    );
  };

  const startSync = async () => {
    setIsModalOpen(false);
    try {
      setIsSyncing(true);
      setShowProgress(true);
      setError("");
      setProgress(0);
      setStatus("pending");

      const selectedApiFields = currentOptions
        .filter((opt) => selectedIds.includes(opt.id))
        .map((opt) => opt.apiField);

      const payload =
        source === "inventory"
          ? { source, locationIds: selectedApiFields }
          : { source, includes: selectedApiFields };

      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
        onClick={() => setIsModalOpen(true)}
        disabled={isSyncing}
        className="w-full rounded-xl flex items-center justify-center gap-2"
      >
        {isSyncing && <Loader2 className="h-4 w-4 animate-spin" />}
        {isSyncing ? `${title} Syncing...` : `Sync ${title}`}
      </Button>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-muted-foreground" />
              Configure {title} Sync
            </DialogTitle>
            <DialogDescription>
              {source === "inventory"
                ? "Select specific target locations to sync inventory balance data from."
                : "Select the contextual data relations you want to pull downstream into your environment."}
            </DialogDescription>
          </DialogHeader>

          {isLoadingLocations ? (
            <div className="py-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading locations...
            </div>
          ) : currentOptions.length > 0 ? (
            <div className="py-2">
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border bg-muted/40 mb-3">
                <Checkbox
                  id="select-all"
                  checked={
                    isAllChecked
                      ? true
                      : isSomeChecked
                      ? "indeterminate"
                      : false
                  }
                  onCheckedChange={(checked) =>
                    handleSelectAllChange(!!checked)
                  }
                />
                <Label
                  htmlFor="select-all"
                  className="font-semibold cursor-pointer select-none flex-1"
                >
                  {isAllChecked
                    ? "Deselect All Locations"
                    : "Select All Locations"}
                </Label>
              </div>

              <Separator className="my-2" />

              <div className="grid gap-2.5 max-h-[280px] overflow-y-auto pr-1 pt-1">
                {currentOptions.map((option) => (
                  <div
                    key={option.id}
                    className="flex items-start gap-3 space-y-0 rounded-lg border p-3 shadow-sm hover:bg-accent/30 transition-colors"
                  >
                    <Checkbox
                      id={option.id}
                      checked={selectedIds.includes(option.id)}
                      onCheckedChange={(checked) =>
                        handleCheckboxChange(option.id, !!checked)
                      }
                    />
                    <div className="grid gap-1 leading-none">
                      <Label
                        htmlFor={option.id}
                        className="font-medium cursor-pointer select-none"
                      >
                        {option.label}
                      </Label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-6 text-sm text-center text-muted-foreground">
              No options available for this sync configuration.
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={startSync}
              disabled={isSyncing}
            >
              Run Pipeline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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