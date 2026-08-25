"use client";

import { useState, useEffect, useCallback } from "react";
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
  id: string;
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
}

interface InventoryFormProps {
  adjustmentReasons: ReasonOptions[];
  initialData?: {
    id?: string;
    inventoryId: string | null;
    locationId: string;
    performedById: string;
    reasonId: string;
    remarks: string;
    status: "DRAFT" | "POSTED";
    lines: LineItem[];
    location: LocationItem;
  } | null;
  currentUser: Partial<PrismUser>;
}

export function StockAdjustmentForm({
  adjustmentReasons,
  initialData,
  currentUser,
}: InventoryFormProps) {
  const router = useRouter();
  const isEditMode = !!initialData;

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
        performedById: initialData.performedById || currentUser?.id || "user_system_agent",
        status: initialData.status || "DRAFT",
      });
    }
  }, [initialData, reset, currentUser]);

  // Browser Exit Warning (Unsaved changes guard)
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

  // Submit Handler core execution
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

        const response = await fetch("/api/admin/inventory/adjustment-2", {
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

        reset(cleanedPayload); // Mark form clean to prevent unload alerts

        // ✅ Fixed navigation flow:
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

  // Form submit trigger - Opens status dialog
  const onFormSubmit = (values: StockAdjustmentInput) => {
    setPendingValues(values);
    setShowSubmitDraftDialog(true);
  };

  // Handle choice in Save Options Dialog
  const handleConfirmSubmitStatus = async (targetStatus: "DRAFT" | "POSTED") => {
    setShowSubmitDraftDialog(false);
    if (pendingValues) {
      await executeSubmit(pendingValues, targetStatus);
    }
  };

  // Handle Cancel / Navigation Guard
  const handleCancelClick = () => {
    if (isDirty) {
      setShowExitDialog(true);
    } else {
      router.back();
    }
  };

  // Exit Guard Actions
  const handleExitDiscard = () => {
    setShowExitDialog(false);
    router.back();
  };

  const handleExitSaveAsDraft = async () => {
    setShowExitDialog(false);
    const currentValues = form.getValues();
    await executeSubmit(currentValues, "DRAFT");
  };

  return (
    <>
      <form
        onSubmit={handleSubmit(onFormSubmit)}
        className="w-full max-w-5xl mx-auto p-6 bg-card border rounded-xl shadow-xs space-y-6"
      >
        <FieldGroup className="gap-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-dashed rounded-lg p-3 bg-muted/20">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">
                Location
              </span>
              <div className="font-semibold text-sm flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-primary" />
                {initialData?.location.name}
              </div>
            </div>
          </div>

          {errors && Object.keys(errors).length > 0 && (
            <div className="flex items-start gap-2 bg-destructive/10 text-destructive text-sm p-3 rounded-md border border-destructive/20 shadow-sm animate-in fade-in zoom-in-95 duration-200">
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
                {lineFields.map((fieldItem, lineIndex) => (
                  <AdjustmentProductLineCard
                    key={fieldItem.id}
                    lineIndex={lineIndex}
                    control={control}
                    setValue={setValue}
                    errors={errors}
                    sublocations={initialData?.location.sublocations || []}
                    product={initialData?.lines[lineIndex]?.product || undefined}
                    quantityBefore={
                      initialData?.lines[lineIndex]?.quantityBefore || 0
                    }
                    onRemoveLine={(idx) => removeLine(idx)}
                  />
                ))}
              </div>
            )}
          </FieldSet>

          {/* Mandatory Audit & Reconciliation Configuration Panel */}
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

      {/* 1. Save Options Dialog (Draft vs. Posted) */}
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

      {/* 2. Unsaved Changes Navigation Exit Guard Dialog */}
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
    </>
  );
}

// "use client";

// import { useEffect, useRef, useState } from "react";
// import { useForm, useFieldArray, useWatch } from "react-hook-form";
// import { zodResolver } from "@hookform/resolvers/zod";
// import {
//   stockAdjustmentSchema,
//   StockAdjustmentInput,
// } from "@/schemas/stock-adjustment.schema";
// import { Button } from "@/components/ui/button";
// import {
//   Plus,
//   ArrowLeft,
//   Warehouse,
//   Boxes,
//   MapPin,
//   ClipboardCheck,
//   User,
//   Building2,
//   AlertCircle,
// } from "lucide-react";
// import { toast } from "sonner";
// import { useRouter } from "next/navigation";
// import { FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field";
// import { AdjustmentProductLineCard } from "./product-line-card";
// import { FormSelect } from "../shared/form-select";
// import { FormTextarea } from "../shared/form-textarea";
// import { User as PrismUser } from "@/generated/prisma/client";
// import { FormInput } from "../shared/form-input";

// interface SublocationOption {
//   id: string;
//   name: string;
//   locationId: string;
// }

// interface LocationItem {
//   inflowId: string;
//   name: string;
//   sublocations: SublocationOption[]
// }

// interface ReasonOptions {
//   id: string;
//   name: string;
// }

// interface Product {
//   inflowId: string;
//   name: string;
//   sku: string;
//   thumbnail: string | null;
//   trackSerials: boolean;
// }

// interface Bins {
//   id: string,
//   sublocationId: string,
//   quantity: number,
//   serials: string[],
// }

// interface LineItem {
//   id: string,
//   product: Product,
//   quantityBefore: number,
//   quantityOnHand: number,
//   quantityReserved: number,
//   quantityAvailable: number,
//   bins: Bins[],
//   serials: string[],
// }

// interface InventoryFormProps {
//   adjustmentReasons: ReasonOptions[];
//   initialData?: {
//     id: string;
//     locationId: string;
//     performedById: string;
//     reasonId: string;
//     remarks: string;
//     status: "DRAFT" | "POSTED" ;
//     lines: LineItem[]
//     location: LocationItem
//   } | null;
//   currentUser: Partial<PrismUser>;
// }

// export function StockAdjustmentForm({
//   adjustmentReasons,
//   initialData,
//   currentUser,
// }: InventoryFormProps) {
//   const router = useRouter();
//   const isEditMode = !!initialData;

//   // Facility-dependent state

//   const form = useForm<StockAdjustmentInput>({
//     resolver: zodResolver(stockAdjustmentSchema),
//     defaultValues: {
//       id: initialData?.id || undefined,
//       locationId: initialData?.locationId || "",
//       lines: initialData?.lines.length ? initialData?.lines.map((line) => ({
//         id: line.id,
//         productId: line.product.inflowId,
//         quantityOnHand: line.quantityOnHand,
//         quantityAdjusted: 0,
//         quantityReserved: line.quantityReserved,
//         quantityAvailable: line.quantityAvailable,
//         trackSerials: line.product.trackSerials,
//         bins: line.bins,
//         serials: line.serials,
//       })) : [],
//       reasonId: initialData?.reasonId || "",
//       remarks: initialData?.remarks || "",
//       performedById:
//         initialData?.performedById ||
//         currentUser?.id ||
//         "user_system_agent",
//       status: initialData?.status || "DRAFT",
//     },
//   });

//   const {
//     control,
//     handleSubmit,
//     setValue,
//     reset,
//     formState: { errors, isSubmitting },
//   } = form;

//   const {
//     fields: lineFields,
//     remove: removeLine,
//   } = useFieldArray({
//     control,
//     name: "lines",
//   });

//   const watchedLocationId = useWatch({ control, name: "locationId" });

//   // Submit Handler with Bulk Auto-Assignment
//   const onSubmit = async (values: StockAdjustmentInput) => {
//     try {

//       // Locate designated Bulk/Unassigned sublocation slot for this facility
//       const bulkSublocation = initialData?.location.sublocations.find(
//         (sub) =>
//           sub.name.toLowerCase().includes("bulk") ||
//           sub.name.toLowerCase().includes("unassigned")
//       );

//       // Process each product line and allocate remaining unassigned quantities
//       const processedLines = (values.lines || []).map((line) => {
//         const activeBins = line.bins || [];
//         const binTotal = activeBins.reduce(
//           (sum, b) => sum + (Number(b.quantity) || 0),
//           0
//         );
//         const onHand = Number(line.quantityOnHand) || 0;
//         const reserved = Number(line.quantityReserved) || 0;
//         const unassigned = onHand - binTotal;

//         const finalBins = activeBins.map((b) => ({
//           ...b,
//           quantity: Number(b.quantity) || 0,
//         }));

//         // Assign unassigned balance to bulk zone if present and unassigned > 0
//         if (unassigned > 0 && bulkSublocation) {
//           const existingBulkIndex = finalBins.findIndex(
//             (b) => b.sublocationId === bulkSublocation.id
//           );

//           if (existingBulkIndex >= 0) {
//             finalBins[existingBulkIndex] = {
//               ...finalBins[existingBulkIndex],
//               quantity:
//                 (Number(finalBins[existingBulkIndex].quantity) || 0) +
//                 unassigned,
//             };
//           } else {
//             finalBins.push({
//               sublocationId: bulkSublocation.id,
//               quantity: unassigned,
//               serials: [],
//             });
//           }
//         }

//         // Filter out zero-quantity bin allocations
//         const cleanedBins = finalBins.filter(
//           (b) => b.sublocationId && Number(b.quantity) > 0
//         );

//         return {
//           ...line,
//           quantityOnHand: onHand,
//           quantityReserved: reserved,
//           quantityAvailable: Math.max(0, onHand - reserved),
//           bins: cleanedBins,
//         };
//       });

//       const cleanedPayload = {
//         ...values,
//         lines: processedLines,
//       };

//       const response = await fetch('/api/admin/inventory/adjustment', {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(cleanedPayload),
//       });

//       if (!response.ok) {
//         const errorData = await response.json();
//         throw new Error(
//           errorData.error || "Failed stock adjustment process allocation."
//         );
//       }

//       toast.success(
//         isEditMode
//           ? "Stock Levels Updated"
//           : "Inventory Initialized Successfully"
//       );
//       router.push("/dashboard/inventory");
//       router.refresh();
//     } catch (err: any) {
//       toast.error("Process Deviation Error", { description: err.message });
//     }
//   };

//   return (
//     <form
//       onSubmit={handleSubmit(onSubmit)}
//       className="w-full max-w-5xl mx-auto p-6 bg-card border rounded-xl shadow-xs space-y-6"
//     >
//       <FieldGroup className="gap-5">
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-dashed rounded-lg p-3 bg-muted/20">
//           <div className="space-y-1">
//             <span className="text-[10px] uppercase font-bold text-muted-foreground">
//               Location
//             </span>
//             <div className="font-semibold text-sm flex items-center gap-1.5">
//               <Building2 className="h-4 w-4 text-primary" />
//               { initialData?.location.name}
//             </div>
//           </div>
//         </div>

//          {errors && !Array.isArray(errors) && (
//             <div className="flex items-start gap-2 bg-destructive/10 text-destructive text-sm p-3 rounded-md border border-destructive/20 shadow-sm animate-in fade-in zoom-in-95 duration-200">
//               <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
//               <div className="flex flex-col">
//                 <p className="font-semibold">Missing Information</p>
//                 <p className="text-destructive/80 text-xs">{JSON.stringify(errors)}</p>
//               </div>
//             </div>
//           )}


//         {/* Dynamic Product Lines Section */}
//         <FieldSet className="border-t pt-4">
//           <div className="flex items-center justify-between mb-4">
//             <div>
//               <FieldLegend className="text-sm font-semibold flex items-center gap-2">
//                 Product Bin Allocations
//               </FieldLegend>
//               <p className="text-[11px] text-muted-foreground">
//                 Map product stock quantities across designated
//                 bin slots.
//               </p>
//             </div>
           
//           </div>

//           {lineFields.length === 0 ? (
//             <div className="border border-dashed rounded-xl p-8 text-center bg-muted/20">
//               <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
//                 <MapPin className="w-6 h-6 opacity-50" />
//                 <span className="text-xs font-medium">
//                   {!watchedLocationId
//                     ? "Please select a storage facility first."
//                     : "No products assigned. Click 'Add Product Line' to begin."}
//                 </span>
//               </div>
//             </div>
//           ) : (
//             <div className="space-y-4">
//               {lineFields.map((fieldItem, lineIndex) => (
//                 <AdjustmentProductLineCard
//                   key={fieldItem.id}
//                   lineIndex={lineIndex}
//                   control={control}
//                   setValue={setValue}
//                   errors={errors}
//                   sublocations={initialData?.location.sublocations || []}
//                   product={initialData?.lines[lineIndex]?.product || undefined}
//                   quantityBefore={initialData?.lines[lineIndex]?.quantityBefore || 0}
//                   onRemoveLine={(idx) => removeLine(idx)}
//                 />
//               ))}
//             </div>
//           )}
//         </FieldSet>

//         {/* Mandatory Audit & Reconciliation Configuration Panel */}
//         <FieldSet className="border-t pt-5 bg-muted/20 p-4 rounded-xl border space-y-4">
//           <FieldLegend className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
//             <ClipboardCheck className="w-4 h-4 text-primary" /> Regulatory
//             Stock Verification Logs
//           </FieldLegend>

//           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//             <FormSelect
//               name="reasonId"
//               control={control}
//               label="Adjustment Reason"
//               placeholder="Select a reason"
//               options={adjustmentReasons}
//               emptyMessage="No reasons available"
//               required
//             />

//             <FormInput
//               name="performedById"
//               control={control}
//               label="Authorized Auditor Profile"
//               required
//               icon={User}
//               disabled
//               placeholder="System Administrative Terminal Agent"
//             />
//           </div>

//           <FormTextarea
//             name="remarks"
//             control={control}
//             label="Justification remarks & Operational Description"
//             placeholder="Provide context explaining why these adjustments are being made (e.g. 'Cycle count variance discovery in Aisle B'..."
//           />
//         </FieldSet>

//         {/* Footer Actions */}
//         <div className="flex items-center justify-between border-t pt-4">
//           <Button
//             type="button"
//             variant="ghost"
//             size="sm"
//             onClick={() => router.back()}
//             className="text-xs gap-1"
//           >
//             <ArrowLeft className="w-3.5 h-3.5" /> Cancel
//           </Button>
//           <div className="flex gap-2 items-center">
//             <Button
//               type="button"
//               variant="outline"
//               size="sm"
//               onClick={() => reset()}
//             >
//             Reset
//             </Button>
//             <Button
//               type="submit"
//               disabled={isSubmitting || lineFields.length === 0}
//               size="sm"
//               className="min-w-[140px]"
//             >
//               {isSubmitting
//                 ? "Saving..."
//                 : isEditMode
//                 ? "Apply Changes"
//                 : "Submit Adjustment"}
//             </Button>
//           </div>
//         </div>
//       </FieldGroup>
//     </form>
//   );
// }