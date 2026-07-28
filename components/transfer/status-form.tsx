"use client";

import { useEffect } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FormSelect } from "../shared/form-select";

// 1. Allowed status transitions based on current order status
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["PENDING", "CANCELLED"],
  PENDING: ["IN_TRANSIT", "CANCELLED"],
  IN_TRANSIT: ["RECEIVED", "PARTIALLY_RECEIVED", "RECEIVED_DISCREPANCY", "CANCELLED"],
  PARTIALLY_RECEIVED: ["RECEIVED", "RECEIVED_DISCREPANCY", "CANCELLED"],
  RECEIVED_DISCREPANCY: ["RECEIVED", "CANCELLED"],
  RECEIVED: [],
  CANCELLED: [],
};

const ALL_STATUS_OPTIONS = [
  { label: "Draft", value: "DRAFT" },
  { label: "Pending", value: "PENDING" },
  { label: "In Transit", value: "IN_TRANSIT" },
  { label: "Received", value: "RECEIVED" },
  { label: "Partially Received", value: "PARTIALLY_RECEIVED" },
  { label: "Discrepancy Reported", value: "RECEIVED_DISCREPANCY" },
  { label: "Cancelled", value: "CANCELLED" },
];

const RECEIVING_STATUSES = ["RECEIVED", "PARTIALLY_RECEIVED", "RECEIVED_DISCREPANCY"];

// Schema definitions
const lineSchema = z.object({
  lineId: z.string(),
  shippedQuantity: z.number().min(0),
  quantityReceived: z.number({ error: "Must be a number" }).min(0, "Min 0"),
  discrepancyReason: z.string().optional(),
});

export const unifiedStatusUpdateSchema = z
  .object({
    status: z.string().min(1, "Status is required"),
    remarks: z.string().optional(),
    lines: z.array(lineSchema).optional(),
  })
  .superRefine((data, ctx) => {
    const isReceivingStatus = RECEIVING_STATUSES.includes(data.status);

    // Only check for line discrepancy when receiving items
    const hasLineDiscrepancy =
      isReceivingStatus &&
      data.lines?.some((line) => line.quantityReceived !== line.shippedQuantity);

    const requiresRemarks =
      data.status === "CANCELLED" ||
      data.status === "RECEIVED_DISCREPANCY" ||
      data.status === "PARTIALLY_RECEIVED" ||
      hasLineDiscrepancy;

    // 1. Remarks required if status is Cancelled/Discrepancy OR if receiving with variances
    if (requiresRemarks && (!data.remarks || !data.remarks.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["remarks"],
        message: hasLineDiscrepancy
          ? "Remarks are required because line item variances were detected."
          : "Remarks are required for this status change.",
      });
    }

    // 2. Validate line discrepancy reasons when receiving or reporting discrepancy
    if (isReceivingStatus && data.lines) {
      data.lines.forEach((line, index) => {
        const diff = line.quantityReceived - line.shippedQuantity;
        if (diff !== 0 && (!line.discrepancyReason || !line.discrepancyReason.trim())) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["lines", index, "discrepancyReason"],
            message: "Reason required for variance.",
          });
        }
      });
    }
  });

export type UnifiedStatusUpdateValues = z.infer<typeof unifiedStatusUpdateSchema>;

export interface TransferOrderLineItem {
  id: string;
  productName: string;
  productSku: string;
  quantity: number;
  quantityReceived?: number | null;
  discrepancyReason?: string | null;
}

export interface ActiveActionPayload {
  targetStatus: string;
  order: {
    id: string;
    status?: string;
    remarks?: string | null;
    lines: TransferOrderLineItem[];
  };
}

interface TransferStatusUpdateFormProps {
  activeAction: ActiveActionPayload;
  onSubmit: (values: UnifiedStatusUpdateValues) => Promise<void>;
  onCancel?: () => void;
}

export function TransferStatusUpdateForm({
  activeAction,
  onSubmit,
  onCancel,
}: TransferStatusUpdateFormProps) {
  const {
    register,
    control,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<UnifiedStatusUpdateValues>({
    resolver: zodResolver(unifiedStatusUpdateSchema),
    defaultValues: {
      status: activeAction.targetStatus,
      remarks: activeAction.order.remarks || "",
      lines: [],
    },
  });

  const selectedStatus = watch("status");
  const watchedLines = useWatch({ control, name: "lines" });
  const { fields } = useFieldArray({ control, name: "lines" });

  const isReceivingAction = RECEIVING_STATUSES.includes(selectedStatus);

  // Check line discrepancy strictly during receiving states
  const hasLineDiscrepancy =
    isReceivingAction &&
    watchedLines?.some(
      (line) => Number(line?.quantityReceived) !== Number(line?.shippedQuantity)
    );

  // Dynamic status options based on current order status (Excludes current status)
  const currentOrderStatus = activeAction.order.status || activeAction.targetStatus;
  const allowedStatuses = ALLOWED_TRANSITIONS[currentOrderStatus] || [activeAction.targetStatus];

  const filteredStatusOptions = ALL_STATUS_OPTIONS.filter((opt) =>
    allowedStatuses.includes(opt.value)
  );

  const isRemarksRequired =
    selectedStatus === "CANCELLED" ||
    selectedStatus === "RECEIVED_DISCREPANCY" ||
    selectedStatus === "PARTIALLY_RECEIVED" ||
    hasLineDiscrepancy;

  useEffect(() => {
    if (activeAction) {
      reset({
        status: activeAction.targetStatus,
        remarks: activeAction.order.remarks || "",
        lines: activeAction.order.lines.map((line) => ({
          lineId: line.id,
          shippedQuantity: line.quantity,
          quantityReceived: line.quantityReceived ?? line.quantity,
          discrepancyReason: line.discrepancyReason || "",
        })),
      });
    }
  }, [activeAction, reset]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 my-2 text-xs">
      {/* Target Status Selection */}
      <FormSelect
        name="status"
        control={control}
        label="Target Status"
        placeholder="Select status..."
        options={filteredStatusOptions.map((v) => ({
          id: v.value,
          name: v.label,
        }))}
        emptyMessage="No options available"
        classNameLabel="text-xs font-semibold"
      />

      {/* Dynamic Line Quantities Table */}
      {isReceivingAction && (
        <div className="space-y-3 border rounded-lg p-3 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center justify-between">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Verify Incoming Line Quantities &amp; Discrepancies
            </Label>
            <span className="text-[10px] text-muted-foreground">
              Log missing or damaged units with structured reason tags.
            </span>
          </div>

          <div className="border rounded-md bg-background overflow-hidden max-h-64 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b text-[10px] uppercase font-semibold sticky top-0 bg-background z-10">
                <tr>
                  <th className="p-2">Item</th>
                  <th className="p-2 text-center">Shipped</th>
                  <th className="p-2 w-28 text-right">Received</th>
                  <th className="p-2 text-center w-24">Variance</th>
                  <th className="p-2 w-44">Discrepancy Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {fields.map((field, index) => {
                  const lineData = activeAction.order.lines.find(
                    (l) => l.id === field.lineId
                  );
                  const currentLine = watchedLines?.[index] || field;

                  const shippedQty = field.shippedQuantity;
                  const receivedQty = Number(currentLine.quantityReceived) || 0;
                  const diff = receivedQty - shippedQty;
                  const hasDiscrepancy = diff !== 0;
                  const lineError = errors.lines?.[index];

                  return (
                    <tr
                      key={field.id}
                      className={hasDiscrepancy ? "bg-amber-500/5" : ""}
                    >
                      <td className="p-2 font-medium">
                        {lineData?.productName ?? "Unknown Product"}
                        <span className="block text-[10px] text-muted-foreground font-mono">
                          {lineData?.productSku ?? "N/A"}
                        </span>
                      </td>

                      <td className="p-2 text-center font-mono font-semibold">
                        {shippedQty}
                      </td>

                      <td className="p-2">
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          {...register(`lines.${index}.quantityReceived`, {
                            valueAsNumber: true,
                          })}
                          className={`h-7 text-xs font-mono text-right ${
                            lineError?.quantityReceived ? "border-red-500" : ""
                          }`}
                        />
                        {lineError?.quantityReceived && (
                          <span className="text-[9px] text-red-500 block text-right mt-0.5">
                            {lineError.quantityReceived.message}
                          </span>
                        )}
                      </td>

                      <td className="p-2 text-center">
                        {!hasDiscrepancy ? (
                          <span className="text-[10px] text-muted-foreground font-mono">
                            0
                          </span>
                        ) : diff < 0 ? (
                          <span className="text-[10px] font-semibold text-amber-600 bg-amber-100 dark:bg-amber-950/40 px-1.5 py-0.5 rounded font-mono">
                            {diff} (Short)
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-blue-600 bg-blue-100 dark:bg-blue-950/40 px-1.5 py-0.5 rounded font-mono">
                            +{diff} (Over)
                          </span>
                        )}
                      </td>

                      <td className="p-2">
                        {hasDiscrepancy ? (
                          <div>
                            <Select
                              value={currentLine.discrepancyReason || ""}
                              onValueChange={(val) =>
                                setValue(`lines.${index}.discrepancyReason`, val, {
                                  shouldValidate: true,
                                  shouldDirty: true,
                                })
                              }
                            >
                              <SelectTrigger
                                className={`h-7 text-[11px] ${
                                  lineError?.discrepancyReason ? "border-red-500" : ""
                                }`}
                              >
                                <SelectValue placeholder="Select reason..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="DAMAGED_IN_TRANSIT">
                                  Damaged In Transit
                                </SelectItem>
                                <SelectItem value="MISSING_BOX">
                                  Missing Box / Shrinkage
                                </SelectItem>
                                <SelectItem value="VENDOR_SHORTAGE">
                                  Vendor / Dispatch Shortage
                                </SelectItem>
                                <SelectItem value="OVERAGE_UNCOUNTED">
                                  Overage / Extra Shipped
                                </SelectItem>
                                <SelectItem value="OTHER">Other Variance</SelectItem>
                              </SelectContent>
                            </Select>
                            {lineError?.discrepancyReason && (
                              <span className="text-[9px] text-red-500 block mt-0.5">
                                {lineError.discrepancyReason.message}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic">
                            N/A (Match)
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manifest Remarks Field */}
      <div className="space-y-1.5">
        <Label htmlFor="action-remarks" className="text-xs font-semibold">
          Remarks / Findings{" "}
          {isRemarksRequired ? (
            <span className="text-red-500">*</span>
          ) : (
            <span className="text-muted-foreground font-normal">(Optional)</span>
          )}
        </Label>
        <Textarea
          id="action-remarks"
          placeholder={
            isRemarksRequired
              ? "Provide mandatory notes for cancellation or reported discrepancy..."
              : "Add optional details regarding carrier notes, inspection, etc."
          }
          {...register("remarks")}
          className={`text-xs min-h-[70px] ${errors.remarks ? "border-red-500" : ""}`}
        />
        {errors.remarks && (
          <span className="text-[10px] text-red-500 block">
            {errors.remarks.message}
          </span>
        )}
      </div>

      {/* Form Action Buttons */}
      <div className="flex justify-end space-x-2 pt-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? "Processing..." : "Confirm Status & Audit Logs"}
        </Button>
      </div>
    </form>
  );
}