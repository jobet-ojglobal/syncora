"use client";

import { useEffect, useState, useMemo, useRef } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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

// Custom Field Options Array (Custom1 to Custom10)
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

  const [brandCustomName, setBrandCustomName] = useState("Custom1");
  const [afterBatch, setAfterBatch] = useState<string>("");
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  const currentOptions: SyncOption[] = useMemo(() => {
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

  // Check for active job on component mount or source change
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

  // Active polling hook
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

  const isAllChecked = currentOptions.length > 0 && selectedIds.length === currentOptions.length;
  const isSomeChecked = selectedIds.length > 0 && selectedIds.length < currentOptions.length;

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

      const selectedApiFields: string[] = [];

      currentOptions.forEach((opt) => {
        if (selectedIds.includes(opt.id)) {
          selectedApiFields.push(opt.apiField);

          if (opt.subOptions) {
            const activeSubIds = selectedSubIds[opt.id] || [];
            opt.subOptions.forEach((sub) => {
              if (activeSubIds.includes(sub.id)) {
                selectedApiFields.push(sub.apiField);
              }
            });
          }
        }
      });

      const payload =
        source === "inventory"
          ? {
              source,
              locationIds: selectedApiFields,
              ...(afterBatch.trim() ? { after: afterBatch.trim() } : {}),
            }
          : {
              source,
              includes: selectedApiFields,
              ...(selectedIds.includes("brand") ? { brandCustomName } : {}),
              ...(afterBatch.trim() ? { after: afterBatch.trim() } : {}),
            };

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
        <DialogContent className="sm:max-w-[480px] rounded-2xl">
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

          {/* After Batch Cursor Offset Input */}
          <div className="space-y-1.5 px-0.5">
            <Label htmlFor="afterBatch" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Resume Cursor / After Batch ID (Optional)
            </Label>
            <input
              id="afterBatch"
              type="text"
              placeholder="e.g. prd_123456789 (Leave blank to sync from start)"
              value={afterBatch}
              onChange={(e) => setAfterBatch(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground"
            />
          </div>

          <Separator className="my-1" />

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
                    isAllChecked ? true : isSomeChecked ? "indeterminate" : false
                  }
                  onCheckedChange={(checked) => handleSelectAllChange(!!checked)}
                />
                <Label
                  htmlFor="select-all"
                  className="font-semibold cursor-pointer select-none flex-1"
                >
                  {isAllChecked ? "Deselect All" : "Select All Options"}
                </Label>
              </div>

              <Separator className="my-2" />

              <div className="grid gap-2.5 max-h-[340px] overflow-y-auto pr-1 pt-1">
                {currentOptions.map((option) => {
                  const isParentChecked = selectedIds.includes(option.id);
                  const hasSubOptions = Boolean(option.subOptions?.length);
                  const isBrandOption = option.id === "brand";

                  return (
                    <div
                      key={option.id}
                      className="rounded-lg border shadow-sm transition-colors overflow-hidden"
                    >
                      <div className="flex items-start gap-3 p-3 hover:bg-accent/30">
                        <Checkbox
                          id={option.id}
                          checked={isParentChecked}
                          onCheckedChange={(checked) =>
                            handleCheckboxChange(option.id, !!checked)
                          }
                        />
                        <div className="grid gap-1 leading-none flex-1">
                          <Label
                            htmlFor={option.id}
                            className="font-medium cursor-pointer select-none"
                          >
                            {option.label}
                          </Label>
                        </div>
                      </div>

                      {/* Render Radio Group Grid for Custom1 - Custom10 when Product Brand is Selected */}
                      {isBrandOption && isParentChecked && (
                        <div className="bg-muted/20 border-t px-4 py-3 space-y-2.5 pl-9">
                          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                            Select Custom Field Mapping
                          </Label>

                          <RadioGroup
                            value={brandCustomName}
                            onValueChange={setBrandCustomName}
                            className="grid grid-cols-2 gap-2"
                          >
                            {CUSTOM_BRAND_OPTIONS.map((customName) => (
                              <div
                                key={customName}
                                className={`flex items-center gap-2 p-2 rounded-md border text-xs cursor-pointer transition-colors ${
                                  brandCustomName === customName
                                    ? "bg-primary/10 border-primary font-medium"
                                    : "bg-background hover:bg-muted/50 border-input"
                                }`}
                              >
                                <RadioGroupItem value={customName} id={customName} />
                                <Label
                                  htmlFor={customName}
                                  className="cursor-pointer select-none flex-1 text-xs"
                                >
                                  {customName}
                                </Label>
                              </div>
                            ))}
                          </RadioGroup>
                        </div>
                      )}

                      {/* Render Nested Sub-Options */}
                      {hasSubOptions && isParentChecked && (
                        <div className="bg-muted/20 border-t px-4 py-2.5 space-y-2 pl-9">
                          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                            Include Specific Fields
                          </div>
                          {option.subOptions?.map((sub) => {
                            const isSubChecked = (
                              selectedSubIds[option.id] || []
                            ).includes(sub.id);
                            return (
                              <div key={sub.id} className="flex items-center gap-2.5">
                                <Checkbox
                                  id={sub.id}
                                  checked={isSubChecked}
                                  onCheckedChange={(checked) =>
                                    handleSubCheckboxChange(
                                      option.id,
                                      sub.id,
                                      !!checked
                                    )
                                  }
                                />
                                <Label
                                  htmlFor={sub.id}
                                  className="text-xs font-medium cursor-pointer select-none text-foreground/90"
                                >
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
            <div className="py-6 text-sm text-center text-muted-foreground">
              No options available for this sync configuration.
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={startSync} disabled={isSyncing}>
              Run Pipeline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showProgress && jobId && (
        <div className="rounded-xl border bg-card p-3 shadow-sm text-card-foreground space-y-2">
          <div className="flex items-center justify-between text-sm font-medium">
            <span className="capitalize text-muted-foreground">Status</span>
            <div className="flex items-center gap-2">
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
                {status === "retrying" && (
                  <span className="text-amber-600 animate-pulse">Retrying...</span>
                )}
                {status === "cancelled" && (
                  <span className="text-gray-500">Cancelled</span>
                )}
                {status !== "completed" &&
                  status !== "failed" &&
                  status !== "retrying" &&
                  status !== "cancelled" && (
                    <span className="text-blue-600 animate-pulse">{status}</span>
                  )}
              </span>

              {/* Cancel Button */}
              {isSyncing && status !== "cancelled" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={cancelSync}
                  className="h-6 px-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>

          <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
            <div
              className={`h-full transition-all duration-300 ease-out rounded-full ${
                status === "completed"
                  ? "bg-green-500"
                  : status === "failed"
                  ? "bg-red-500"
                  : status === "retrying"
                  ? "bg-amber-500"
                  : status === "cancelled"
                  ? "bg-gray-400"
                  : "bg-blue-600"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-right text-xs text-muted-foreground">{progress}%</div>
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

 {/* Progress & Error indicators */}
      {/* {showProgress && jobId && (
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
      )} */}

// 8/7/26
// "use client";

// import { useEffect, useState, useMemo } from "react";
// import { Button } from "@/components/ui/button";
// import { CheckCircle2, XCircle, Loader2, Settings2 } from "lucide-react";
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogFooter,
//   DialogHeader,
//   DialogTitle,
// } from "@/components/ui/dialog";
// import { Checkbox } from "@/components/ui/checkbox";
// import { Label } from "@/components/ui/label";
// import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"; // Import RadioGroup components
// import { Separator } from "@/components/ui/separator";

// export interface Location {
//   id: string;
//   inflowId: string;
//   name: string;
//   isActive: boolean;
// }

// type SyncButtonProps = {
//   source: string;
//   title: string;
// };

// export interface SyncSubOption {
//   id: string;
//   label: string;
//   apiField: string;
// }

// export interface SyncOption {
//   id: string;
//   label: string;
//   apiField: string;
//   subOptions?: SyncSubOption[];
// }

// // Custom Field Options Array (Custom1 to Custom10)
// const CUSTOM_BRAND_OPTIONS = Array.from({ length: 10 }, (_, i) => `Custom${i + 1}`);

// const STATIC_SYNC_CONFIG_REGISTRY: Record<string, SyncOption[]> = {
//   products: [
//     { id: "upsertCore", label: "Upsert Core Product Data", apiField: "coreData" },
//     { id: "brand", label: "Product Brand", apiField: "brand" },
//     { id: "category", label: "Product Category", apiField: "category" },
//     { id: "productBarcodes", label: "Barcodes & Identifiers", apiField: "productBarcodes" },
//     { id: "images", label: "Product Images", apiField: "images" },
//     { id: "cost", label: "Product Cost", apiField: "cost" },
//     { id: "taxCodes", label: "Tax Codes & Schemes", apiField: "taxCodes.taxCode,taxCodes.taxingScheme" },
//     { id: "productOperations", label: "Manufacturing Operations", apiField: "productOperations" },
//     { id: "prices", label: "Price Schemes & Matrix Lists", apiField: "prices.pricingScheme.currency" },
//     { id: "attachments", label: "File Attachments", apiField: "attachments.lastModifiedBy" },
//     {
//       id: "reorderSettings",
//       label: "Location Reorder Settings",
//       apiField: "reorderSettings.vendor,reorderSettings.location,reorderSettings.fromLocation",
//     },
//     {
//       id: "resolveGroupRelations",
//       label: "Link & Sync Parent Variant Groups",
//       apiField: "productVariant.productGroup.category,productVariant.productGroup.options.optionValues",
//     },
//   ],
//   product_groups: [
//     { id: "upsertCore", label: "Upsert Core Group Data", apiField: "coreData" },
//     { id: "groupCategory", label: "Product Group Category", apiField: "category" },
//     { id: "groupCustom", label: "Default Product Custom Data", apiField: "defaultProduct" },
//     { id: "groupImages", label: "Product Group Shared Gallery", apiField: "images.image" },
//     {
//       id: "groupVariants",
//       label: "Deep Variant Tree Resolution",
//       apiField: "productVariants.product.category",
//       subOptions: [
//         { id: "variantImages", label: "Variant Product Images", apiField: "productVariants.product.images" },
//         { id: "variantBarcodes", label: "Variant Barcodes & Identifiers", apiField: "productVariants.product.productBarcodes" },
//         { id: "variantPrices", label: "Variant Price Schemes", apiField: "productVariants.product.prices.pricingScheme.currency" },
//         { id: "variantCost", label: "Variant Product Cost", apiField: "productVariants.product.cost" },
//         { id: "variantOperations", label: "Variant Manufacturing Operations", apiField: "productVariants.product.productOperations" },
//         {
//           id: "variantReorders",
//           label: "Variant Location Reorder Settings",
//           apiField: "productVariants.product.reorderSettings.vendor,productVariants.product.reorderSettings.location,productVariants.product.reorderSettings.fromLocation",
//         },
//         { id: "variantAttachments", label: "Variant File Attachments", apiField: "productVariants.product.attachments.lastModifiedBy" },
//       ],
//     },
//   ],
//   vendors: [
//     { id: "lastModifiedBy", label: "Last Modify By", apiField: "lastModifiedBy" },
//     { id: "taxingScheme", label: "Default Taxing Scheme", apiField: "taxingScheme" },
//     { id: "defaultPaymentTerms", label: "Default Payment Terms", apiField: "defaultPaymentTerms" },
//     { id: "vendorItems.product", label: "Vendor Items", apiField: "vendorItems.product" },
//   ],
// };

// export function SyncButtonOptions({ source, title }: SyncButtonProps) {
//   const [jobId, setJobId] = useState<string | null>(null);
//   const [progress, setProgress] = useState(0);
//   const [status, setStatus] = useState("");
//   const [error, setError] = useState("");
//   const [isSyncing, setIsSyncing] = useState(false);
//   const [showProgress, setShowProgress] = useState(false);
//   const [isModalOpen, setIsModalOpen] = useState(false);

//   const [locations, setLocations] = useState<Location[]>([]);
//   const [isLoadingLocations, setIsLoadingLocations] = useState(false);

//   // Selected Custom Brand Radio Value (Default: Custom1)
//   const [brandCustomName, setBrandCustomName] = useState("Custom1");

//   useEffect(() => {
//     if (source === "inventory") {
//       setIsLoadingLocations(true);
//       fetch("/api/locations/lookup")
//         .then((res) => (res.ok ? res.json() : []))
//         .then((data) => setLocations(data))
//         .catch((err) => console.error("Error fetching locations:", err))
//         .finally(() => setIsLoadingLocations(false));
//     }
//   }, [source]);

//   const currentOptions: SyncOption[] = useMemo(() => {
//     if (source === "inventory") {
//       return locations.map((loc) => ({
//         id: loc.id,
//         label: loc.name,
//         apiField: loc.inflowId || loc.id,
//       }));
//     }
//     return STATIC_SYNC_CONFIG_REGISTRY[source] || [];
//   }, [source, locations]);

//   const [selectedIds, setSelectedIds] = useState<string[]>([]);
//   const [selectedSubIds, setSelectedSubIds] = useState<Record<string, string[]>>({});

//   useEffect(() => {
//     setSelectedIds(currentOptions.map((o) => o.id));

//     const initialSubOptions: Record<string, string[]> = {};
//     currentOptions.forEach((opt) => {
//       if (opt.subOptions) {
//         initialSubOptions[opt.id] = opt.subOptions.map((sub) => sub.id);
//       }
//     });
//     setSelectedSubIds(initialSubOptions);
//   }, [currentOptions]);

//   useEffect(() => {
//     if (!jobId) return;

//     const interval = setInterval(async () => {
//       try {
//         const res = await fetch(`/api/sync?jobId=${jobId}`);
//         const data = await res.json();

//         setProgress(Number(data.progress) || 0);
//         setStatus(data.status);
//         setError(data.error || "");

//         if (data.status === "completed" || data.status === "failed") {
//           clearInterval(interval);
//           setIsSyncing(false);
//           setTimeout(() => {
//             setShowProgress(false);
//             setJobId(null);
//           }, 3000);
//         }
//       } catch (err) {
//         console.error(err);
//       }
//     }, 1000);

//     return () => clearInterval(interval);
//   }, [jobId]);

//   const isAllChecked = currentOptions.length > 0 && selectedIds.length === currentOptions.length;
//   const isSomeChecked = selectedIds.length > 0 && selectedIds.length < currentOptions.length;

//   const handleSelectAllChange = (checked: boolean) => {
//     if (checked) {
//       setSelectedIds(currentOptions.map((o) => o.id));
//       const allSub: Record<string, string[]> = {};
//       currentOptions.forEach((opt) => {
//         if (opt.subOptions) {
//           allSub[opt.id] = opt.subOptions.map((sub) => sub.id);
//         }
//       });
//       setSelectedSubIds(allSub);
//     } else {
//       setSelectedIds([]);
//       setSelectedSubIds({});
//     }
//   };

//   const handleCheckboxChange = (id: string, checked: boolean) => {
//     setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((item) => item !== id)));
//   };

//   const handleSubCheckboxChange = (parentId: string, subId: string, checked: boolean) => {
//     setSelectedSubIds((prev) => {
//       const currentList = prev[parentId] || [];
//       const updatedList = checked
//         ? [...currentList, subId]
//         : currentList.filter((item) => item !== subId);
//       return { ...prev, [parentId]: updatedList };
//     });
//   };

//   const startSync = async () => {
//     setIsModalOpen(false);
//     try {
//       setIsSyncing(true);
//       setShowProgress(true);
//       setError("");
//       setProgress(0);
//       setStatus("pending");

//       const selectedApiFields: string[] = [];

//       currentOptions.forEach((opt) => {
//         if (selectedIds.includes(opt.id)) {
//           selectedApiFields.push(opt.apiField);

//           if (opt.subOptions) {
//             const activeSubIds = selectedSubIds[opt.id] || [];
//             opt.subOptions.forEach((sub) => {
//               if (activeSubIds.includes(sub.id)) {
//                 selectedApiFields.push(sub.apiField);
//               }
//             });
//           }
//         }
//       });

//       const payload =
//         source === "inventory"
//           ? { source, locationIds: selectedApiFields }
//           : {
//               source,
//               includes: selectedApiFields,
//               ...(selectedIds.includes("brand") ? { brandCustomName } : {}),
//             };

//       const res = await fetch("/api/sync", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(payload),
//       });

//       const data = await res.json();
//       if (!res.ok) throw new Error(data.error || "Failed to start sync");
//       setJobId(data.jobId);
//     } catch (err) {
//       setIsSyncing(false);
//       setShowProgress(false);
//       setError(err instanceof Error ? err.message : "Unknown error");
//     }
//   };

//   return (
//     <div className="space-y-3">
//       <Button
//         onClick={() => setIsModalOpen(true)}
//         disabled={isSyncing}
//         className="w-full rounded-xl flex items-center justify-center gap-2"
//       >
//         {isSyncing && <Loader2 className="h-4 w-4 animate-spin" />}
//         {isSyncing ? `${title} Syncing...` : `Sync ${title}`}
//       </Button>

//       <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
//         <DialogContent className="sm:max-w-[480px] rounded-2xl">
//           <DialogHeader>
//             <DialogTitle className="flex items-center gap-2">
//               <Settings2 className="h-5 w-5 text-muted-foreground" />
//               Configure {title} Sync
//             </DialogTitle>
//             <DialogDescription>
//               {source === "inventory"
//                 ? "Select specific target locations to sync inventory balance data from."
//                 : "Select the contextual data relations you want to pull downstream into your environment."}
//             </DialogDescription>
//           </DialogHeader>

//           {isLoadingLocations ? (
//             <div className="py-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
//               <Loader2 className="h-4 w-4 animate-spin" /> Loading locations...
//             </div>
//           ) : currentOptions.length > 0 ? (
//             <div className="py-2">
//               <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border bg-muted/40 mb-3">
//                 <Checkbox
//                   id="select-all"
//                   checked={
//                     isAllChecked ? true : isSomeChecked ? "indeterminate" : false
//                   }
//                   onCheckedChange={(checked) => handleSelectAllChange(!!checked)}
//                 />
//                 <Label
//                   htmlFor="select-all"
//                   className="font-semibold cursor-pointer select-none flex-1"
//                 >
//                   {isAllChecked ? "Deselect All" : "Select All Options"}
//                 </Label>
//               </div>

//               <Separator className="my-2" />

//               <div className="grid gap-2.5 max-h-[340px] overflow-y-auto pr-1 pt-1">
//                 {currentOptions.map((option) => {
//                   const isParentChecked = selectedIds.includes(option.id);
//                   const hasSubOptions = Boolean(option.subOptions?.length);
//                   const isBrandOption = option.id === "brand";

//                   return (
//                     <div
//                       key={option.id}
//                       className="rounded-lg border shadow-sm transition-colors overflow-hidden"
//                     >
//                       <div className="flex items-start gap-3 p-3 hover:bg-accent/30">
//                         <Checkbox
//                           id={option.id}
//                           checked={isParentChecked}
//                           onCheckedChange={(checked) =>
//                             handleCheckboxChange(option.id, !!checked)
//                           }
//                         />
//                         <div className="grid gap-1 leading-none flex-1">
//                           <Label
//                             htmlFor={option.id}
//                             className="font-medium cursor-pointer select-none"
//                           >
//                             {option.label}
//                           </Label>
//                         </div>
//                       </div>

//                       {/* Render Radio Group Grid for Custom1 - Custom10 when Product Brand is Selected */}
//                       {isBrandOption && isParentChecked && (
//                         <div className="bg-muted/20 border-t px-4 py-3 space-y-2.5 pl-9">
//                           <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
//                             Select Custom Field Mapping
//                           </Label>

//                           <RadioGroup
//                             value={brandCustomName}
//                             onValueChange={setBrandCustomName}
//                             className="grid grid-cols-2 gap-2"
//                           >
//                             {CUSTOM_BRAND_OPTIONS.map((customName) => (
//                               <div
//                                 key={customName}
//                                 className={`flex items-center gap-2 p-2 rounded-md border text-xs cursor-pointer transition-colors ${
//                                   brandCustomName === customName
//                                     ? "bg-primary/10 border-primary font-medium"
//                                     : "bg-background hover:bg-muted/50 border-input"
//                                 }`}
//                               >
//                                 <RadioGroupItem value={customName} id={customName} />
//                                 <Label
//                                   htmlFor={customName}
//                                   className="cursor-pointer select-none flex-1 text-xs"
//                                 >
//                                   {customName}
//                                 </Label>
//                               </div>
//                             ))}
//                           </RadioGroup>
//                         </div>
//                       )}

//                       {/* Render Nested Sub-Options */}
//                       {hasSubOptions && isParentChecked && (
//                         <div className="bg-muted/20 border-t px-4 py-2.5 space-y-2 pl-9">
//                           <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
//                             Include Specific Fields
//                           </div>
//                           {option.subOptions?.map((sub) => {
//                             const isSubChecked = (
//                               selectedSubIds[option.id] || []
//                             ).includes(sub.id);
//                             return (
//                               <div key={sub.id} className="flex items-center gap-2.5">
//                                 <Checkbox
//                                   id={sub.id}
//                                   checked={isSubChecked}
//                                   onCheckedChange={(checked) =>
//                                     handleSubCheckboxChange(
//                                       option.id,
//                                       sub.id,
//                                       !!checked
//                                     )
//                                   }
//                                 />
//                                 <Label
//                                   htmlFor={sub.id}
//                                   className="text-xs font-medium cursor-pointer select-none text-foreground/90"
//                                 >
//                                   {sub.label}
//                                 </Label>
//                               </div>
//                             );
//                           })}
//                         </div>
//                       )}
//                     </div>
//                   );
//                 })}
//               </div>
//             </div>
//           ) : (
//             <div className="py-6 text-sm text-center text-muted-foreground">
//               No options available for this sync configuration.
//             </div>
//           )}

//           <DialogFooter className="gap-2 sm:gap-0">
//             <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
//               Cancel
//             </Button>
//             <Button onClick={startSync} disabled={isSyncing}>
//               Run Pipeline
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>

//       {/* Progress & Error indicators */}
//       {showProgress && jobId && (
//         <div className="rounded-xl border bg-card p-3 shadow-sm text-card-foreground animate-in fade-in slide-in-from-top-1 duration-200">
//           <div className="flex items-center justify-between text-sm font-medium mb-1.5">
//             <span className="capitalize text-muted-foreground">Status</span>
//             <span className="flex items-center gap-1.5 font-semibold">
//               {status === "completed" && (
//                 <span className="text-green-600 flex items-center gap-1">
//                   <CheckCircle2 className="h-4 w-4" /> Finished
//                 </span>
//               )}
//               {status === "failed" && (
//                 <span className="text-red-600 flex items-center gap-1">
//                   <XCircle className="h-4 w-4" /> Failed
//                 </span>
//               )}
//               {status !== "completed" && status !== "failed" && (
//                 <span className="text-blue-600 animate-pulse">{status}</span>
//               )}
//             </span>
//           </div>

//           <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
//             <div
//               className={`h-full transition-all duration-300 ease-out rounded-full ${
//                 status === "completed"
//                   ? "bg-green-500"
//                   : status === "failed"
//                   ? "bg-red-500"
//                   : "bg-blue-600"
//               }`}
//               style={{ width: `${progress}%` }}
//             />
//           </div>
//           <div className="text-right text-xs text-muted-foreground mt-1">
//             {progress}%
//           </div>
//         </div>
//       )}

//       {error && (
//         <div className="rounded-xl border border-red-200 bg-red-50/50 p-3 text-sm text-red-600 flex items-start gap-2">
//           <XCircle className="h-5 w-5 shrink-0 mt-0.5" />
//           <div>{error}</div>
//         </div>
//       )}
//     </div>
//   );
// }

// 8/7/26
// "use client";

// import { useEffect, useState, useMemo } from "react";
// import { Button } from "@/components/ui/button";
// import { CheckCircle2, XCircle, Loader2, Settings2, ChevronDown, ChevronRight } from "lucide-react";
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogFooter,
//   DialogHeader,
//   DialogTitle,
// } from "@/components/ui/dialog";
// import { Checkbox } from "@/components/ui/checkbox";
// import { Label } from "@/components/ui/label";
// import { Separator } from "@/components/ui/separator";

// export interface Location {
//   id: string;
//   inflowId: string;
//   name: string;
//   isActive: boolean;
// }

// type SyncButtonProps = {
//   source: string;
//   title: string;
// };

// export interface SyncSubOption {
//   id: string;
//   label: string;
//   apiField: string;
// }

// export interface SyncOption {
//   id: string;
//   label: string;
//   apiField: string;
//   subOptions?: SyncSubOption[];
// }

// // Config Registry supporting nested sub-options
// const STATIC_SYNC_CONFIG_REGISTRY: Record<string, SyncOption[]> = {
//   products: [
//     { id: "upsertCore", label: "Upsert Core Product Data", apiField: "coreData" },
//     { id: "brand", label: "Product Brand", apiField: "brand" },
//     { id: "brandCustomName", label: "Brand Custom Name", apiField: "brandCustomName" },
//     { id: "category", label: "Product Category", apiField: "category" },
//     { id: "productBarcodes", label: "Barcodes & Identifiers", apiField: "productBarcodes" },
//     { id: "images", label: "Product Images", apiField: "images" },
//     { id: "cost", label: "Product Cost", apiField: "cost" },
//     { id: "taxCodes", label: "Tax Codes & Schemes", apiField: "taxCodes.taxCode,taxCodes.taxingScheme" },
//     { id: "productOperations", label: "Manufacturing Operations", apiField: "productOperations" },
//     { id: "prices", label: "Price Schemes & Matrix Lists", apiField: "prices.pricingScheme.currency" },
//     { id: "attachments", label: "File Attachments", apiField: "attachments.lastModifiedBy" },
//     {
//       id: "reorderSettings",
//       label: "Location Reorder Settings",
//       apiField: "reorderSettings.vendor,reorderSettings.location,reorderSettings.fromLocation",
//     },
//     {
//       id: "resolveGroupRelations",
//       label: "Link & Sync Parent Variant Groups",
//       apiField: "productVariant.productGroup.category,productVariant.productGroup.options.optionValues",
//     },
//   ],
//   product_groups: [
//     { id: "upsertCore", label: "Upsert Core Group Data", apiField: "coreData" },
//     { id: "groupCategory", label: "Product Group Category", apiField: "category" },
//     { id: "groupCustom", label: "Default Product Custom Data", apiField: "defaultProduct" },
//     { id: "groupImages", label: "Product Group Shared Gallery", apiField: "images.image" },
//     {
//       id: "groupVariants",
//       label: "Deep Variant Tree Resolution",
//       apiField: "productVariants.product.category",
//       subOptions: [
//         {
//           id: "variantImages",
//           label: "Variant Product Images",
//           apiField: "productVariants.product.images",
//         },
//         {
//           id: "variantBarcodes",
//           label: "Variant Barcodes & Identifiers",
//           apiField: "productVariants.product.productBarcodes",
//         },
//         {
//           id: "variantPrices",
//           label: "Variant Price Schemes",
//           apiField: "productVariants.product.prices.pricingScheme.currency",
//         },
//         {
//           id: "variantCost",
//           label: "Variant Product Cost",
//           apiField: "productVariants.product.cost",
//         },
//         {
//           id: "variantOperations",
//           label: "Variant Manufacturing Operations",
//           apiField: "productVariants.product.productOperations",
//         },
//         {
//           id: "variantReorders",
//           label: "Variant Location Reorder Settings",
//           apiField: "productVariants.product.reorderSettings.vendor,productVariants.product.reorderSettings.location,productVariants.product.reorderSettings.fromLocation",
//         },
//         {
//           id: "variantAttachments",
//           label: "Variant File Attachments",
//           apiField: "productVariants.product.attachments.lastModifiedBy",
//         },
//       ],
//     },
//   ],
//   vendors: [
//     { id: "lastModifiedBy", label: "Last Modify By", apiField: "lastModifiedBy" },
//     { id: "taxingScheme", label: "Default Taxing Scheme", apiField: "taxingScheme" },
//     { id: "defaultPaymentTerms", label: "Default Payment Terms", apiField: "defaultPaymentTerms" },
//     { id: "vendorItems.product", label: "Vendor Items", apiField: "vendorItems.product" },
//   ],
// };

// export function SyncButtonOptions({ source, title }: SyncButtonProps) {
//   const [jobId, setJobId] = useState<string | null>(null);
//   const [progress, setProgress] = useState(0);
//   const [status, setStatus] = useState("");
//   const [error, setError] = useState("");
//   const [isSyncing, setIsSyncing] = useState(false);
//   const [showProgress, setShowProgress] = useState(false);
//   const [isModalOpen, setIsModalOpen] = useState(false);

//   const [locations, setLocations] = useState<Location[]>([]);
//   const [isLoadingLocations, setIsLoadingLocations] = useState(false);

//   // Fetch location choices if source is 'inventory'
//   useEffect(() => {
//     if (source === "inventory") {
//       setIsLoadingLocations(true);
//       fetch("/api/locations/lookup")
//         .then((res) => (res.ok ? res.json() : []))
//         .then((data) => setLocations(data))
//         .catch((err) => console.error("Error fetching locations:", err))
//         .finally(() => setIsLoadingLocations(false));
//     }
//   }, [source]);

//   // Options list based on source
//   const currentOptions: SyncOption[] = useMemo(() => {
//     if (source === "inventory") {
//       return locations.map((loc) => ({
//         id: loc.id,
//         label: loc.name,
//         apiField: loc.inflowId || loc.id,
//       }));
//     }
//     return STATIC_SYNC_CONFIG_REGISTRY[source] || [];
//   }, [source, locations]);

//   // Selected top-level IDs
//   const [selectedIds, setSelectedIds] = useState<string[]>([]);
//   // Selected sub-option IDs mapped by parent option ID: { groupVariants: ["variantImages", "variantBarcodes"] }
//   const [selectedSubIds, setSelectedSubIds] = useState<Record<string, string[]>>({});

//   // Reset choices whenever currentOptions change
//   useEffect(() => {
//     setSelectedIds(currentOptions.map((o) => o.id));

//     const initialSubOptions: Record<string, string[]> = {};
//     currentOptions.forEach((opt) => {
//       if (opt.subOptions) {
//         initialSubOptions[opt.id] = opt.subOptions.map((sub) => sub.id);
//       }
//     });
//     setSelectedSubIds(initialSubOptions);
//   }, [currentOptions]);

//   useEffect(() => {
//     if (!jobId) return;

//     const interval = setInterval(async () => {
//       try {
//         const res = await fetch(`/api/sync?jobId=${jobId}`);
//         const data = await res.json();

//         setProgress(Number(data.progress) || 0);
//         setStatus(data.status);
//         setError(data.error || "");

//         if (data.status === "completed" || data.status === "failed") {
//           clearInterval(interval);
//           setIsSyncing(false);
//           setTimeout(() => {
//             setShowProgress(false);
//             setJobId(null);
//           }, 3000);
//         }
//       } catch (err) {
//         console.error(err);
//       }
//     }, 1000);

//     return () => clearInterval(interval);
//   }, [jobId]);

//   const isAllChecked =
//     currentOptions.length > 0 && selectedIds.length === currentOptions.length;
//   const isSomeChecked =
//     selectedIds.length > 0 && selectedIds.length < currentOptions.length;

//   const handleSelectAllChange = (checked: boolean) => {
//     if (checked) {
//       setSelectedIds(currentOptions.map((o) => o.id));
//       const allSub: Record<string, string[]> = {};
//       currentOptions.forEach((opt) => {
//         if (opt.subOptions) {
//           allSub[opt.id] = opt.subOptions.map((sub) => sub.id);
//         }
//       });
//       setSelectedSubIds(allSub);
//     } else {
//       setSelectedIds([]);
//       setSelectedSubIds({});
//     }
//   };

//   const handleCheckboxChange = (id: string, checked: boolean) => {
//     setSelectedIds((prev) =>
//       checked ? [...prev, id] : prev.filter((item) => item !== id)
//     );
//   };

//   const handleSubCheckboxChange = (parentId: string, subId: string, checked: boolean) => {
//     setSelectedSubIds((prev) => {
//       const currentList = prev[parentId] || [];
//       const updatedList = checked
//         ? [...currentList, subId]
//         : currentList.filter((item) => item !== subId);
//       return { ...prev, [parentId]: updatedList };
//     });
//   };

//   const startSync = async () => {
//     setIsModalOpen(false);
//     try {
//       setIsSyncing(true);
//       setShowProgress(true);
//       setError("");
//       setProgress(0);
//       setStatus("pending");

//       // Extract all selected API fields (including sub-options)
//       const selectedApiFields: string[] = [];

//       currentOptions.forEach((opt) => {
//         if (selectedIds.includes(opt.id)) {
//           selectedApiFields.push(opt.apiField);

//           // Add active sub-options if parent is checked
//           if (opt.subOptions) {
//             const activeSubIds = selectedSubIds[opt.id] || [];
//             opt.subOptions.forEach((sub) => {
//               if (activeSubIds.includes(sub.id)) {
//                 selectedApiFields.push(sub.apiField);
//               }
//             });
//           }
//         }
//       });

//       const payload =
//         source === "inventory"
//           ? { source, locationIds: selectedApiFields }
//           : { source, includes: selectedApiFields };

//       const res = await fetch("/api/sync", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(payload),
//       });

//       const data = await res.json();
//       if (!res.ok) throw new Error(data.error || "Failed to start sync");
//       setJobId(data.jobId);
//     } catch (err) {
//       setIsSyncing(false);
//       setShowProgress(false);
//       setError(err instanceof Error ? err.message : "Unknown error");
//     }
//   };

//   return (
//     <div className="space-y-3">
//       <Button
//         onClick={() => setIsModalOpen(true)}
//         disabled={isSyncing}
//         className="w-full rounded-xl flex items-center justify-center gap-2"
//       >
//         {isSyncing && <Loader2 className="h-4 w-4 animate-spin" />}
//         {isSyncing ? `${title} Syncing...` : `Sync ${title}`}
//       </Button>

//       <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
//         <DialogContent className="sm:max-w-[450px] rounded-2xl">
//           <DialogHeader>
//             <DialogTitle className="flex items-center gap-2">
//               <Settings2 className="h-5 w-5 text-muted-foreground" />
//               Configure {title} Sync
//             </DialogTitle>
//             <DialogDescription>
//               {source === "inventory"
//                 ? "Select specific target locations to sync inventory balance data from."
//                 : "Select the contextual data relations you want to pull downstream into your environment."}
//             </DialogDescription>
//           </DialogHeader>

//           {isLoadingLocations ? (
//             <div className="py-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
//               <Loader2 className="h-4 w-4 animate-spin" /> Loading locations...
//             </div>
//           ) : currentOptions.length > 0 ? (
//             <div className="py-2">
//               <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border bg-muted/40 mb-3">
//                 <Checkbox
//                   id="select-all"
//                   checked={
//                     isAllChecked
//                       ? true
//                       : isSomeChecked
//                       ? "indeterminate"
//                       : false
//                   }
//                   onCheckedChange={(checked) =>
//                     handleSelectAllChange(!!checked)
//                   }
//                 />
//                 <Label
//                   htmlFor="select-all"
//                   className="font-semibold cursor-pointer select-none flex-1"
//                 >
//                   {isAllChecked ? "Deselect All" : "Select All Options"}
//                 </Label>
//               </div>

//               <Separator className="my-2" />

//               <div className="grid gap-2.5 max-h-[320px] overflow-y-auto pr-1 pt-1">
//                 {currentOptions.map((option) => {
//                   const isParentChecked = selectedIds.includes(option.id);
//                   const hasSubOptions = Boolean(option.subOptions?.length);

//                   return (
//                     <div
//                       key={option.id}
//                       className="rounded-lg border shadow-sm transition-colors overflow-hidden"
//                     >
//                       <div className="flex items-start gap-3 p-3 hover:bg-accent/30">
//                         <Checkbox
//                           id={option.id}
//                           checked={isParentChecked}
//                           onCheckedChange={(checked) =>
//                             handleCheckboxChange(option.id, !!checked)
//                           }
//                         />
//                         <div className="grid gap-1 leading-none flex-1">
//                           <Label
//                             htmlFor={option.id}
//                             className="font-medium cursor-pointer select-none"
//                           >
//                             {option.label}
//                           </Label>
//                         </div>
//                       </div>

//                       {/* Render Nested Options when Parent is Checked */}
//                       {hasSubOptions && isParentChecked && (
//                         <div className="bg-muted/20 border-t px-4 py-2.5 space-y-2 pl-9">
//                           <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
//                             Include Specific Fields
//                           </div>
//                           {option.subOptions?.map((sub) => {
//                             const isSubChecked = (
//                               selectedSubIds[option.id] || []
//                             ).includes(sub.id);
//                             return (
//                               <div
//                                 key={sub.id}
//                                 className="flex items-center gap-2.5"
//                               >
//                                 <Checkbox
//                                   id={sub.id}
//                                   checked={isSubChecked}
//                                   onCheckedChange={(checked) =>
//                                     handleSubCheckboxChange(
//                                       option.id,
//                                       sub.id,
//                                       !!checked
//                                     )
//                                   }
//                                 />
//                                 <Label
//                                   htmlFor={sub.id}
//                                   className="text-xs font-medium cursor-pointer select-none text-foreground/90"
//                                 >
//                                   {sub.label}
//                                 </Label>
//                               </div>
//                             );
//                           })}
//                         </div>
//                       )}
//                     </div>
//                   );
//                 })}
//               </div>
//             </div>
//           ) : (
//             <div className="py-6 text-sm text-center text-muted-foreground">
//               No options available for this sync configuration.
//             </div>
//           )}

//           <DialogFooter className="gap-2 sm:gap-0">
//             <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
//               Cancel
//             </Button>
//             <Button onClick={startSync} disabled={isSyncing}>
//               Run Pipeline
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>

//       {showProgress && jobId && (
//         <div className="rounded-xl border bg-card p-3 shadow-sm text-card-foreground animate-in fade-in slide-in-from-top-1 duration-200">
//           <div className="flex items-center justify-between text-sm font-medium mb-1.5">
//             <span className="capitalize text-muted-foreground">Status</span>
//             <span className="flex items-center gap-1.5 font-semibold">
//               {status === "completed" && (
//                 <span className="text-green-600 flex items-center gap-1">
//                   <CheckCircle2 className="h-4 w-4" /> Finished
//                 </span>
//               )}
//               {status === "failed" && (
//                 <span className="text-red-600 flex items-center gap-1">
//                   <XCircle className="h-4 w-4" /> Failed
//                 </span>
//               )}
//               {status !== "completed" && status !== "failed" && (
//                 <span className="text-blue-600 animate-pulse">{status}</span>
//               )}
//             </span>
//           </div>

//           <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
//             <div
//               className={`h-full transition-all duration-300 ease-out rounded-full ${
//                 status === "completed"
//                   ? "bg-green-500"
//                   : status === "failed"
//                   ? "bg-red-500"
//                   : "bg-blue-600"
//               }`}
//               style={{ width: `${progress}%` }}
//             />
//           </div>
//           <div className="text-right text-xs text-muted-foreground mt-1">
//             {progress}%
//           </div>
//         </div>
//       )}

//       {error && (
//         <div className="rounded-xl border border-red-200 bg-red-50/50 p-3 text-sm text-red-600 flex items-start gap-2">
//           <XCircle className="h-5 w-5 shrink-0 mt-0.5" />
//           <div>{error}</div>
//         </div>
//       )}
//     </div>
//   );
// }
