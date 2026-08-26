"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, Settings2, Eye, ChevronDown, AlertTriangle } from "lucide-react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "../ui/progress";

interface LinkedLocation {
  inflowId: string;
  name: string;
}

export interface Sublocation {
  id: string;
  name: string;
  isActive: boolean;
  linkedLocationId: string;
  linkedLocation: LinkedLocation
}

type SyncButtonProps = {
  locationId: string;
  source: string;
  title: string;
  isDisabled: boolean;
};

export interface SyncSubOption {
  id: string;
  label: string;
  apiField: string;
}

export interface SyncOption {
  id: string;
  label: string;
  apiField: string;
  subOptions?: SyncSubOption[];
}

const CUSTOM_BRAND_OPTIONS = Array.from({ length: 10 }, (_, i) => `Custom${i + 1}`);

const STATIC_SYNC_CONFIG_REGISTRY: Record<string, SyncOption[]> = {
  products: [
    { id: "upsertCore", label: "Upsert Core Product Data", apiField: "coreData" },
    { id: "brand", label: "Product Brand", apiField: "brand" },
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
    {
      id: "groupVariants",
      label: "Deep Variant Tree Resolution",
      apiField: "productVariants.product.category",
      subOptions: [
        { id: "variantImages", label: "Variant Product Images", apiField: "productVariants.product.images" },
        { id: "variantBarcodes", label: "Variant Barcodes & Identifiers", apiField: "productVariants.product.productBarcodes" },
        { id: "variantPrices", label: "Variant Price Schemes", apiField: "productVariants.product.prices.pricingScheme.currency" },
        { id: "variantCost", label: "Variant Product Cost", apiField: "productVariants.product.cost" },
        { id: "variantOperations", label: "Variant Manufacturing Operations", apiField: "productVariants.product.productOperations" },
        {
          id: "variantReorders",
          label: "Variant Location Reorder Settings",
          apiField: "productVariants.product.reorderSettings.vendor,productVariants.product.reorderSettings.location,productVariants.product.reorderSettings.fromLocation",
        },
        { id: "variantAttachments", label: "Variant File Attachments", apiField: "productVariants.product.attachments.lastModifiedBy" },
      ],
    },
  ],
  vendors: [
    { id: "lastModifiedBy", label: "Last Modify By", apiField: "lastModifiedBy" },
    { id: "taxingScheme", label: "Default Taxing Scheme", apiField: "taxingScheme" },
    { id: "defaultPaymentTerms", label: "Default Payment Terms", apiField: "defaultPaymentTerms" },
    { id: "vendorItems.product", label: "Vendor Items", apiField: "vendorItems.product" },
  ],
};

export function SyncButtonOptionsPreview({ locationId, source, title, isDisabled }: SyncButtonProps) {
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [sublocations, setSublocations] = useState<Sublocation[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);

  const [brandCustomName, setBrandCustomName] = useState("Custom1");
  const [afterBatch, setAfterBatch] = useState<string>("");
  const [syncedAll, setSyncedAll] = useState<boolean>(false);

  // Selected Records State (IDs selected directly from the Preview list)
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  // Preview State
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);
  const [previewItems, setPreviewItems] = useState<any[]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState<boolean>(false);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    console.log('asdasd')
    if (source === "inventory_lines_local") {
      setIsLoadingLocations(true);
      fetch(`/api/locations/${locationId}/sublocations/linked`)
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => setSublocations(data))
        .catch((err) => console.error("Error fetching locations:", err))
        .finally(() => setIsLoadingLocations(false));
    }
  }, [source]);

  const currentOptions: SyncOption[] = useMemo(() => {
    if (source === "inventory_lines_local") {
      return sublocations.map((loc) => ({
        id: loc.id,
        label: loc.linkedLocation.name,
        apiField: loc.id,
      }));
    }
    return STATIC_SYNC_CONFIG_REGISTRY[source] || [];
  }, [source, sublocations]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedSubIds, setSelectedSubIds] = useState<Record<string, string[]>>({});

  useEffect(() => {
    setSelectedIds(currentOptions.map((o) => o.id));

    const initialSubOptions: Record<string, string[]> = {};
    currentOptions.forEach((opt) => {
      if (opt.subOptions) {
        initialSubOptions[opt.id] = opt.subOptions.map((sub) => sub.id);
      }
    });
    setSelectedSubIds(initialSubOptions);
  }, [currentOptions]);

  // Active Job Polling
  useEffect(() => {
    let isMounted = true;
    async function checkForActiveJob() {
      try {
        const res = await fetch(`/api/sync?source=${source}&locationId=${locationId}`);
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

  useEffect(() => {
    if (!jobId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/sync?jobId=${jobId}&locationId=${locationId}`);
        const data = await res.json();

        setProgress(Number(data.progress) || 0);
        setStatus(data.status);
        setError(data.error || "");

        const terminalStates = ["completed", "failed", "cancelled"];
        if (terminalStates.includes(data.status)) {
          clearInterval(interval);
          setIsSyncing(false);

          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => {
            setShowProgress(false);
            setJobId(null);
          }, 3000);
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
    } catch (err) {
      console.error("Failed to cancel sync:", err);
    }
  };

  const getSelectedApiFields = () => {
    const fields: string[] = [];
    currentOptions.forEach((opt) => {
      if (selectedIds.includes(opt.id)) {
        fields.push(opt.apiField);
        if (opt.subOptions) {
          const activeSubIds = selectedSubIds[opt.id] || [];
          opt.subOptions.forEach((sub) => {
            if (activeSubIds.includes(sub.id)) {
              fields.push(sub.apiField);
            }
          });
        }
      }
    });
    return fields;
  };

  const fetchPreview = async (cursor?: string) => {
    const isLoadMore = Boolean(cursor);
    if (isLoadMore) setIsLoadingMore(true);
    else setIsLoadingPreview(true);

    try {
      const selectedApiFields = getSelectedApiFields();

      const res = await fetch("/api/sync/local/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source,
          locationId,
          count: 25,
          after: cursor || (syncedAll ? undefined : afterBatch.trim() || undefined),
          includes: selectedApiFields,
          syncedAll,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch preview");

      const fetchedItems = data.items || [];
      if (isLoadMore) {
        setPreviewItems((prev) => [...prev, ...fetchedItems]);
      } else {
        setPreviewItems(fetchedItems);
      }

      setHasNextPage(Boolean(data.pageInfo?.hasNextPage));
      setNextCursor(data.pageInfo?.endCursor || null);
    } catch (err) {
      console.error("Preview fetch error:", err);
    } finally {
      setIsLoadingPreview(false);
      setIsLoadingMore(false);
    }
  };

  const togglePreviewMode = () => {
    if (!isPreviewMode) {
      setIsPreviewMode(true);
      fetchPreview();
    } else {
      setIsPreviewMode(false);
    }
  };

  // Preview item check handlers
  const handleItemCheck = (id: string, checked: boolean) => {
    setSelectedItemIds((prev) =>
      checked ? [...prev, id] : prev.filter((item) => item !== id)
    );
  };

  const handleSelectAllPreviewItems = (checked: boolean) => {
    if (checked) {
      const allLoadedIds = previewItems.map((item) => item.itemId);
      setSelectedItemIds(Array.from(new Set([...selectedItemIds, ...allLoadedIds])));
    } else {
      setSelectedItemIds([]);
    }
  };

  const isAllPreviewChecked =
    previewItems.length > 0 &&
    previewItems.every((item) => selectedItemIds.includes(item.itemId));

  const isSomePreviewChecked =
    previewItems.some((item) => selectedItemIds.includes(item.itemId)) &&
    !isAllPreviewChecked;

  const handleSelectAllChange = (checked: boolean) => {
    if (checked) {
      setSelectedIds(currentOptions.map((o) => o.id));
      const allSub: Record<string, string[]> = {};
      currentOptions.forEach((opt) => {
        if (opt.subOptions) {
          allSub[opt.id] = opt.subOptions.map((sub) => sub.id);
        }
      });
      setSelectedSubIds(allSub);
    } else {
      setSelectedIds([]);
      setSelectedSubIds({});
    }
  };

  const handleCheckboxChange = (id: string, checked: boolean) => {
    setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((item) => item !== id)));
  };

  const handleSubCheckboxChange = (parentId: string, subId: string, checked: boolean) => {
    setSelectedSubIds((prev) => {
      const currentList = prev[parentId] || [];
      const updatedList = checked
        ? [...currentList, subId]
        : currentList.filter((item) => item !== subId);
      return { ...prev, [parentId]: updatedList };
    });
  };

  const startSync = async () => {
    setIsModalOpen(false);
    try {
      setIsSyncing(true);
      setShowProgress(true);
      setError("");
      setProgress(0);
      setStatus("pending");

      const selectedApiFields = getSelectedApiFields();

      const payload = {
        source,
        syncedAll,
        locationId,
        ...(source === "inventory_lines_local"
          ? { locationIds: selectedApiFields }
          : {
              includes: selectedApiFields,
              ...(selectedIds.includes("brand") ? { brandCustomName } : {}),
            }),
        ...(!syncedAll && selectedItemIds.length > 0 ? { selectedRecords: selectedItemIds } : {}),
        ...(!syncedAll && afterBatch.trim() ? { after: afterBatch.trim() } : {}),
      };

      const res = await fetch("/api/sync/local", {
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

  const isOptionAllChecked = currentOptions.length > 0 && selectedIds.length === currentOptions.length;
  const isOptionSomeChecked = selectedIds.length > 0 && selectedIds.length < currentOptions.length;

  return (
    <div className="space-y-3">
      <Button
        onClick={() => setIsModalOpen(true)}
        disabled={isSyncing || isDisabled}
        className="w-full rounded-xl flex items-center justify-center gap-2"
      >
        {isSyncing && <Loader2 className="h-4 w-4 animate-spin" />}
        {isSyncing ? `${title} Syncing...` : `${title}`}
      </Button>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[540px] rounded-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-muted-foreground" />
              Configure {title} Sync
            </DialogTitle>
            <DialogDescription>
              {source === "inventory_lines_local"
                ? "Select specific target locations to sync inventory lines balance data from."
                : "Select the contextual data relations you want to pull downstream into your environment."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {/* Global Controls */}
            <div className="flex items-center justify-between border rounded-lg p-2.5 bg-muted/20">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="syncedAll"
                  checked={syncedAll}
                  onCheckedChange={(c) => {
                    setSyncedAll(!!c);
                    if (isPreviewMode) fetchPreview();
                  }}
                />
                <Label htmlFor="syncedAll" className="text-xs font-semibold cursor-pointer select-none">
                  Sync All Records (Bypass Selected Records & Cursor)
                </Label>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={togglePreviewMode}
                className="h-7 text-xs flex items-center gap-1.5"
              >
                <Eye className="h-3.5 w-3.5" />
                {isPreviewMode ? "Hide Preview" : "Preview Data"}
              </Button>
            </div>

            {/* Resume Cursor Field (Disabled if syncedAll is true) */}
            {!syncedAll && (
              <div className="space-y-1.5 px-0.5">
                <Label htmlFor="afterBatch" className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Resume Cursor / After Product ID (Optional)
                </Label>
                <input
                  id="afterBatch"
                  type="text"
                  placeholder="e.g. prd_123456789 (Leave blank to start from top)"
                  value={afterBatch}
                  onChange={(e) => setAfterBatch(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground"
                />
              </div>
            )}

            {/* PREVIEW CONTAINER */}
            {isPreviewMode ? (
              <div className="border rounded-lg p-3 bg-card space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="select-all-preview"
                      disabled={syncedAll || previewItems.length === 0}
                      checked={
                        isAllPreviewChecked
                          ? true
                          : isSomePreviewChecked
                          ? "indeterminate"
                          : false
                      }
                      onCheckedChange={(checked) => handleSelectAllPreviewItems(!!checked)}
                    />
                    <Label
                      htmlFor="select-all-preview"
                      className={`text-xs font-semibold select-none ${
                        syncedAll ? "text-muted-foreground cursor-not-allowed" : "cursor-pointer"
                      }`}
                    >
                      {syncedAll
                        ? "Record Selection Disabled (Sync All Active)"
                        : isAllPreviewChecked
                        ? "Deselect All Records"
                        : "Select All Loaded Records"}
                    </Label>
                  </div>

                  <span className="text-[11px] text-muted-foreground font-medium">
                    {selectedItemIds.length} Selected
                  </span>
                </div>

                {isLoadingPreview ? (
                  <div className="py-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading preview items...
                  </div>
                ) : previewItems.length > 0 ? (
                  <div className="space-y-2">
                    {/* SIMPLIFIED PREVIEW ITEMS LIST */}
                    <div className="grid gap-2 max-h-[260px] overflow-y-auto pr-1 pt-1">
                      {previewItems.map((item, index) => {
                        const recordId = item.itemId;
                        const isChecked = selectedItemIds.includes(recordId);

                        return (
                          <div
                            key={recordId || index}
                            className={`flex items-start gap-3 rounded-lg border p-3 shadow-sm transition-colors ${
                              syncedAll
                                ? "bg-muted/30 opacity-70"
                                : isChecked
                                ? "bg-primary/5 border-primary/40"
                                : "hover:bg-accent/30"
                            }`}
                          >
                            <Checkbox
                              id={`record-${recordId}`}
                              disabled={syncedAll}
                              checked={isChecked}
                              onCheckedChange={(checked) => handleItemCheck(recordId, !!checked)}
                            />
                            <div className="grid gap-0.5 leading-none flex-1">
                              <div className="flex items-center justify-between">
                                <Label
                                  htmlFor={`record-${recordId}`}
                                  className={`font-medium select-none text-xs ${
                                    syncedAll ? "cursor-not-allowed" : "cursor-pointer"
                                  }`}
                                >
                                  {item.name || item.title || "Unnamed Record"}
                                </Label>
                                <span className="text-[10px] font-mono text-muted-foreground">
                                  {recordId}
                                </span>
                              </div>
                              {item.description && (
                                <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                                  {item.description}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {hasNextPage && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isLoadingMore}
                        onClick={() => fetchPreview(nextCursor || undefined)}
                        className="w-full h-8 text-xs flex items-center justify-center gap-1.5 text-muted-foreground hover:text-foreground mt-2"
                      >
                        {isLoadingMore ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        Load More Records
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="py-6 text-xs text-center text-muted-foreground">
                    No preview items available.
                  </div>
                )}
              </div>
            ) : (
              /* SYNC OPTIONS LIST */
              <div>
                {isLoadingLocations ? (
                  <div className="py-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading locations...
                  </div>
                ) : currentOptions.length > 0 ? (
                  <div className="py-1">
                    <div className="flex items-center gap-3 px-3 py-2 rounded-lg border bg-muted/40 mb-3">
                      <Checkbox
                        id="select-all"
                        checked={isOptionAllChecked ? true : isOptionSomeChecked ? "indeterminate" : false}
                        onCheckedChange={(checked) => handleSelectAllChange(!!checked)}
                      />
                      <Label htmlFor="select-all" className="font-semibold cursor-pointer select-none flex-1 text-xs">
                        {isOptionAllChecked ? "Deselect All Fields" : "Select All Fields"}
                      </Label>
                    </div>

                    <div className="grid gap-2 max-h-[250px] overflow-y-auto pr-1">
                      {currentOptions.map((option) => {
                        const isParentChecked = selectedIds.includes(option.id);
                        const hasSubOptions = Boolean(option.subOptions?.length);
                        const isBrandOption = option.id === "brand";

                        return (
                          <div key={option.id} className="rounded-lg border shadow-sm transition-colors overflow-hidden">
                            <div className="flex items-start gap-3 p-2.5 hover:bg-accent/30">
                              <Checkbox
                                id={option.id}
                                checked={isParentChecked}
                                onCheckedChange={(checked) => handleCheckboxChange(option.id, !!checked)}
                              />
                              <div className="grid gap-1 leading-none flex-1">
                                <Label htmlFor={option.id} className="font-medium text-xs cursor-pointer select-none">
                                  {option.label}
                                </Label>
                              </div>
                            </div>

                            {/* Custom Field Options */}
                            {isBrandOption && isParentChecked && (
                              <div className="bg-muted/20 border-t px-4 py-2.5 space-y-2 pl-8">
                                <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                                  Select Custom Field Mapping
                                </Label>
                                <RadioGroup value={brandCustomName} onValueChange={setBrandCustomName} className="grid grid-cols-2 gap-1.5">
                                  {CUSTOM_BRAND_OPTIONS.map((customName) => (
                                    <div
                                      key={customName}
                                      className={`flex items-center gap-2 p-1.5 rounded border text-xs cursor-pointer transition-colors ${
                                        brandCustomName === customName
                                          ? "bg-primary/10 border-primary font-medium"
                                          : "bg-background hover:bg-muted/50 border-input"
                                      }`}
                                    >
                                      <RadioGroupItem value={customName} id={customName} />
                                      <Label htmlFor={customName} className="cursor-pointer select-none flex-1 text-[11px]">
                                        {customName}
                                      </Label>
                                    </div>
                                  ))}
                                </RadioGroup>
                              </div>
                            )}

                            {/* Nested Sub-Options */}
                            {hasSubOptions && isParentChecked && (
                              <div className="bg-muted/20 border-t px-4 py-2 space-y-1.5 pl-8">
                                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                  Include Specific Fields
                                </div>
                                {option.subOptions?.map((sub) => {
                                  const isSubChecked = (selectedSubIds[option.id] || []).includes(sub.id);
                                  return (
                                    <div key={sub.id} className="flex items-center gap-2">
                                      <Checkbox
                                        id={sub.id}
                                        checked={isSubChecked}
                                        onCheckedChange={(checked) => handleSubCheckboxChange(option.id, sub.id, !!checked)}
                                      />
                                      <Label htmlFor={sub.id} className="text-[11px] font-medium cursor-pointer select-none text-foreground/90">
                                        {sub.label}
                                      </Label>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="py-6 text-xs text-center text-muted-foreground">
                    No options available for this sync configuration.
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={startSync} disabled={isSyncing}>
              Run Pipeline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sync Monitor */}
      {/* Floating Cloud-Style Progress Banner */}
      {showProgress && (
        <div className="fixed bottom-4 right-4 z-50 w-80 p-4 border rounded-xl bg-card shadow-lg space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
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
              <span>{title} Sync Progress</span>
              <span>{Math.round(progress)}</span>
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

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50/50 p-3 text-sm text-red-600 flex items-start gap-2">
          <XCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}
    </div>
  );
}