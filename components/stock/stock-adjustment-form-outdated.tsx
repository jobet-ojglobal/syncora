"use client";

import { useState, useEffect, useCallback, startTransition, useTransition } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  stockAdjustmentSchema,
  StockAdjustmentInput,
} from "@/schemas/stock-adjustment.schema";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  MapPin,
  ClipboardCheck,
  User,
  Building2,
  AlertCircle,
  AlertTriangle,
  Send,
  RefreshCw,
  XCircle,
  Loader2,
  CheckCircle2,
  Save,
  AlertOctagon,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AdjustmentProductLineCard } from "./adjustment-product-line-outdated";
import { FormSelect } from "../shared/form-select";
import { FormTextarea } from "../shared/form-textarea";
import { User as PrismUser } from "@/generated/prisma/client";
import { FormInput } from "../shared/form-input";

interface SublocationOption {
  id: string;
  name: string;
  locationId: string;
}

interface LocationItem {
  inflowId: string;
  name: string;
  sublocations: SublocationOption[];
}

interface ReasonOptions {
  id: string;
  name: string;
}

interface Product {
  inflowId: string;
  name: string;
  sku: string;
  thumbnail: string | null;
  trackSerials: boolean;
}

interface Bins {
  id?: string;
  sublocationId: string;
  quantity: number;
  serials: string[];
}

interface LineItem {
  id: string;
  product: Product;
  quantityBefore: number;
  quantityAdjusted: number;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  bins: Bins[];
  serials: string[];
  reason: string;
  isStale?: boolean;
  staleQtyBefore?: number | null;
}

interface InventoryFormProps {
  adjustmentReasons: ReasonOptions[];
  initialData: {
    id?: string;
    adjustmentNumber?: string;
    inventoryId: string | null;
    locationId: string;
    performedById: string;
    reasonId: string;
    remarks: string;
    status: "DRAFT" | "POSTED";
    isOutdated?: boolean;
    lines: LineItem[];
    location: LocationItem;
  };
  currentUser: Partial<PrismUser>;
}

export function StockAdjustmentFormOutdated({
  adjustmentReasons,
  initialData,
  currentUser,
}: InventoryFormProps) {
  const router = useRouter();
  const isEditMode = !!initialData;
<<<<<<< HEAD

  // Void Draft >>
  const [isPending, startTransition] = useTransition();
=======
  const isDraft = initialData?.status === "DRAFT";

  // Void Draft >>
  const [isPending, startTransition] = useTransition();
  
>>>>>>> 0bb88344244287618b9a29d21a23a5f88ff00f2d

  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [isVoiding, setIsVoiding] = useState(false);
  // Void Draft <<

  // Dialog Control States
  const [showSubmitDraftDialog, setShowSubmitDraftDialog] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [pendingValues, setPendingValues] = useState<StockAdjustmentInput | null>(null);

  const form = useForm<StockAdjustmentInput>({
    resolver: zodResolver(stockAdjustmentSchema),
    defaultValues: {
      id: initialData?.id || undefined,
      inventoryId: initialData?.inventoryId,
      locationId: initialData?.locationId || "",
      lines: initialData?.lines.length
        ? initialData.lines.map((line) => ({
            id: line.id,
            productId: line.product.inflowId,
            quantityOnHand: line.quantityOnHand,
            quantityAdjusted: line.quantityAdjusted,
            quantityReserved: line.quantityReserved,
            quantityAvailable: line.quantityAvailable,
            trackSerials: line.product.trackSerials,
            bins: line.bins,
            serials: line.serials,
            reason: line.reason,
          }))
        : [],
      reasonId: initialData?.reasonId || "",
      remarks: initialData?.remarks || "",
      performedById:
        initialData?.performedById || currentUser?.id || "user_system_agent",
      status: initialData?.status || "DRAFT",
    },
  });

  const {
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = form;

  const { fields: lineFields, remove: removeLine } = useFieldArray({
    control,
    name: "lines",
  });

  const watchedLocationId = useWatch({ control, name: "locationId" });

  useEffect(() => {
    if (initialData) {
      reset({
        id: initialData.id || undefined,
        inventoryId: initialData.inventoryId,
        locationId: initialData.locationId || "",
        lines: initialData.lines.map((line) => ({
          id: line.id,
          productId: line.product.inflowId,
          quantityOnHand: line.quantityOnHand,
          quantityAdjusted: line.quantityAdjusted,
          quantityReserved: line.quantityReserved,
          quantityAvailable: line.quantityAvailable,
          trackSerials: line.product.trackSerials,
          bins: line.bins || [],
          serials: line.serials || [],
          reason: line.reason || null,
        })),
        reasonId: initialData.reasonId || "",
        remarks: initialData.remarks || "",
        performedById:
          initialData.performedById || currentUser?.id || "user_system_agent",
        status: initialData.status || "DRAFT",
      });
    }
  }, [initialData, reset, currentUser]);

  // Unsaved changes browser navigation guard
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // Core Submission Execution
  const executeSubmit = useCallback(
    async (values: StockAdjustmentInput, targetStatus: "DRAFT" | "POSTED") => {
      try {
        const bulkSublocation = initialData?.location.sublocations.find(
          (sub) =>
            sub.name.toLowerCase().includes("bulk") ||
            sub.name.toLowerCase().includes("unassigned")
        );

        const processedLines = (values.lines || []).map((line) => {
          const activeBins = line.bins || [];
          const binTotal = activeBins.reduce(
            (sum, b) => sum + (Number(b.quantity) || 0),
            0
          );
          const onHand = Number(line.quantityOnHand) || 0;
          const reserved = Number(line.quantityReserved) || 0;
          const unassigned = onHand - binTotal;

          const finalBins = activeBins.map((b) => ({
            ...b,
            quantity: Number(b.quantity) || 0,
          }));

          if (unassigned > 0 && bulkSublocation) {
            const existingBulkIndex = finalBins.findIndex(
              (b) => b.sublocationId === bulkSublocation.id
            );

            if (existingBulkIndex >= 0) {
              finalBins[existingBulkIndex] = {
                ...finalBins[existingBulkIndex],
                quantity:
                  (Number(finalBins[existingBulkIndex].quantity) || 0) + unassigned,
              };
            } else {
              finalBins.push({
                sublocationId: bulkSublocation.id,
                quantity: unassigned,
                serials: [],
              });
            }
          }

          const cleanedBins = finalBins.filter(
            (b) => b.sublocationId && Number(b.quantity) > 0
          );

          return {
            ...line,
            quantityOnHand: onHand,
            quantityReserved: reserved,
            quantityAvailable: Math.max(0, onHand - reserved),
            bins: cleanedBins,
          };
        });

        const cleanedPayload = {
          ...values,
          status: targetStatus,
          lines: processedLines,
        };

        const response = await fetch("/api/admin/inventory/adjustment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cleanedPayload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || "Failed stock adjustment process allocation."
          );
        }

        reset(cleanedPayload);

        toast.success(
          targetStatus === "DRAFT"
            ? "Adjustment Saved as Draft"
            : isEditMode
            ? "Stock Levels Updated"
            : "Inventory Adjustment Posted Successfully"
        );

        router.push("/dashboard/inventory/adjustments");
        router.refresh();
      } catch (err: any) {
        toast.error("Process Deviation Error", { description: err.message });
      }
    },
    [initialData, isEditMode, reset, router]
  );

  const onFormSubmit = (values: StockAdjustmentInput) => {
    setPendingValues(values);
    setShowSubmitDraftDialog(true);
  };

  const handleConfirmSubmitStatus = async (targetStatus: "DRAFT" | "POSTED") => {
    setShowSubmitDraftDialog(false);
    if (pendingValues) {
      await executeSubmit(pendingValues, targetStatus);
    }
  };

  const handleCancelClick = () => {
    if (isDirty) {
      setShowExitDialog(true);
    } else {
      router.back();
    }
  };

  const handleExitDiscard = () => {
    setShowExitDialog(false);
    router.back();
  };

  const handleExitSaveAsDraft = async () => {
    setShowExitDialog(false);
    const currentValues = form.getValues();
    await executeSubmit(currentValues, "DRAFT");
  };

  // ---------------------------------------------------------------------------
  // Void Draft >> API Actions
  // ---------------------------------------------------------------------------

  // 1. PATCH Status handler (Cancel / Void Draft)
  const handleVoidDraft = async () => {
    try {
      setIsVoiding(true);

      const res = await fetch("/api/admin/inventory/adjustment", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adjustmentId: initialData.id,
          status: "VOIDED",
          reason: voidReason || "Draft cancelled by operator.",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to cancel draft adjustment.");
      }

      toast.success("Adjustment Cancelled", {
        description: `Draft ${initialData.id} has been voided successfully.`,
      });

      setShowVoidModal(false);

      startTransition(() => {
        router.push("/dashboard/inventory/adjustments");
        router.refresh();
      });
    } catch (err: any) {
      toast.error("Operation Failed", { description: err.message });
    } fonting: {
      setIsVoiding(false);
    }
  };

  // Void Draft << API Actions

  return (
    <>
      <form
        onSubmit={handleSubmit(onFormSubmit)}
        className="w-full max-w-5xl mx-auto p-6 bg-card border rounded-xl shadow-xs space-y-6"
      >
        <FieldGroup className="gap-5">
          {/* Top Location Summary Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-foreground">
                Edit Adjustment Draft
                </h1>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                {initialData.status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                  ADJ NUMBER: <span className="font-mono">{initialData.adjustmentNumber}</span> • Location:{" "}
                  <span className="font-medium text-foreground">
                  {initialData.location?.name || "N/A"}
                  </span>
              </p>
            </div>

            {/* Action Controls */}
            <div className="flex items-center gap-2">
              {/* Cancel/Void Trigger */}

<<<<<<< HEAD
              {isPending &&(
=======
              {isDraft &&(
>>>>>>> 0bb88344244287618b9a29d21a23a5f88ff00f2d
                <button
                    type="button"
                    disabled={isVoiding || isPending}
                    onClick={() => setShowVoidModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-destructive bg-destructive/10 hover:bg-destructive/20 border border-destructive/20 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <XCircle className="w-4 h-4" />
                  Void Draft
                </button>
              )}
            </div>
          </div>

          {/* Stale Baseline Data Alert Banner */}
          {initialData?.isOutdated && (
            <div className="flex items-start gap-3 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-sm p-4 rounded-lg border border-amber-500/20 shadow-xs">
              <RefreshCw className="w-5 h-5 mt-0.5 shrink-0 animate-spin-once" />
              <div className="space-y-1">
                <p className="font-semibold">Live Stock Baseline Re-synchronized</p>
                <p className="text-xs text-amber-600/90 dark:text-amber-300/80 leading-relaxed">
                  Background transactions altered stock levels since this draft was saved.
                  Baseline quantities have automatically updated to live levels while preserving your delta adjustments.
                </p>
              </div>
            </div>
          )}

          {/* Validation Error Summary */}
          {errors && Object.keys(errors).length > 0 && (
            <div className="flex items-start gap-2 bg-destructive/10 text-destructive text-sm p-3 rounded-md border border-destructive/20 shadow-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div className="flex flex-col">
                <p className="font-semibold">Missing Information</p>
                <p className="text-destructive/80 text-xs">
                  Please resolve errors in highlighted fields before proceeding.
                </p>
              </div>
            </div>
          )}

          {/* Dynamic Product Lines Section */}
          <FieldSet className="border-t pt-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <FieldLegend className="text-sm font-semibold flex items-center gap-2">
                  Product Bin Allocations
                </FieldLegend>
                <p className="text-[11px] text-muted-foreground">
                  Map product stock quantities across designated bin slots.
                </p>
              </div>
            </div>

            {lineFields.length === 0 ? (
              <div className="border border-dashed rounded-xl p-8 text-center bg-muted/20">
                <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <MapPin className="w-6 h-6 opacity-50" />
                  <span className="text-xs font-medium">
                    {!watchedLocationId
                      ? "Please select a storage facility first."
                      : "No products assigned. Click 'Add Product Line' to begin."}
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {lineFields.map((fieldItem, lineIndex) => {
                  const lineData = initialData?.lines[lineIndex];
                  return (
                    <div key={fieldItem.id} className="relative">
                      {lineData?.isStale && (
                        <div className="mb-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs rounded-md flex items-center justify-between">
                          <span>
                            <strong>Stock updated:</strong> Live count switched from{" "}
                            <span className="line-through">{lineData.staleQtyBefore}</span> to{" "}
                            <span className="font-bold">{lineData.quantityBefore}</span> units.
                          </span>
                        </div>
                      )}
                      <AdjustmentProductLineCard
                        lineIndex={lineIndex}
                        control={control}
                        setValue={setValue}
                        errors={errors}
                        sublocations={initialData?.location.sublocations || []}
                        product={lineData?.product || undefined}
                        quantityBefore={lineData?.quantityBefore || 0}
                        onRemoveLine={(idx) => removeLine(idx)}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </FieldSet>

          {/* Audit & Reconciliation Information */}
          <FieldSet className="border-t pt-5 bg-muted/20 p-4 rounded-xl border space-y-4">
            <FieldLegend className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <ClipboardCheck className="w-4 h-4 text-primary" /> Regulatory Stock
              Verification Logs
            </FieldLegend>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormSelect
                name="reasonId"
                control={control}
                label="Adjustment Reason"
                placeholder="Select a reason"
                options={adjustmentReasons}
                emptyMessage="No reasons available"
                required
              />

              <FormInput
                name="performedById"
                control={control}
                label="Authorized Auditor Profile"
                required
                icon={User}
                disabled
                placeholder="System Administrative Terminal Agent"
              />
            </div>

            <FormTextarea
              name="remarks"
              control={control}
              label="Justification remarks & Operational Description"
              placeholder="Provide context explaining why these adjustments are being made (e.g. 'Cycle count variance discovery in Aisle B')..."
            />
          </FieldSet>

          {/* Footer Actions */}
          <div className="flex items-center justify-between border-t pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={handleCancelClick}
              className="text-xs gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Cancel
            </Button>
            <div className="flex gap-2 items-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => reset()}
                disabled={!isDirty}
              >
                Reset
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || lineFields.length === 0}
                className="min-w-[140px]"
              >
                {isSubmitting
                  ? "Saving..."
                  : isEditMode
                  ? "Apply Changes"
                  : "Submit Adjustment"}
              </Button>
            </div>
          </div>
        </FieldGroup>
      </form>

      {/* Save Status Dialog */}
      <Dialog open={showSubmitDraftDialog} onOpenChange={setShowSubmitDraftDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Send className="w-5 h-5 text-blue-600" /> Save Options
            </DialogTitle>
            <DialogDescription>
              This adjustment is ready for save. Would you like to save it as a{" "}
              <strong>DRAFT</strong> for later edits or commit it immediately as{" "}
              <strong>POSTED</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowSubmitDraftDialog(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => handleConfirmSubmitStatus("DRAFT")}
            >
              Save as DRAFT
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => handleConfirmSubmitStatus("POSTED")}
            >
              Submit as POSTED
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unsaved Exit Dialog */}
      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="w-5 h-5" /> Unsaved Changes
            </DialogTitle>
            <DialogDescription>
              You have unsaved changes in this stock adjustment. What would you like
              to do before leaving?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowExitDialog(false)}
            >
              Continue Editing
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleExitDiscard}
            >
              Discard Changes
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleExitSaveAsDraft}
            >
              Save as Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel / Void Confirmation Modal */}
      {showVoidModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-background border border-border rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-destructive">
              <div className="p-2.5 bg-destructive/10 rounded-full">
                <AlertOctagon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground">
                  Void Draft Adjustment?
                </h3>
                <p className="text-xs text-muted-foreground">
                  This action marks draft{" "}
                  <span className="font-mono font-semibold">{initialData.adjustmentNumber}</span>{" "}
                  as CANCELLED.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                Cancellation Reason
              </label>
              <textarea
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="Specify why this draft is being cancelled..."
                className="w-full h-20 text-xs p-3 rounded-lg border border-border bg-muted/20 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                disabled={isVoiding}
                onClick={() => setShowVoidModal(false)}
                className="px-3.5 py-2 text-xs font-semibold border border-border rounded-lg hover:bg-muted transition-colors cursor-pointer"
              >
                Keep Draft
              </button>
              <button
                type="button"
                disabled={isVoiding}
                onClick={handleVoidDraft}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-destructive hover:bg-destructive/90 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isVoiding && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Confirm Void
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
