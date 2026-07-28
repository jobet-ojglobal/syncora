"use client";

import React, { useState, useEffect } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { Plus, Trash2, Save, Send, AlertCircle, Layers } from "lucide-react";

export type InventoryAdjustmentReason =
  | "STOCK_COUNT"
  | "DAMAGE"
  | "LOSS"
  | "THEFT"
  | "EXPIRED"
  | "RETURN"
  | "CORRECTION"
  | "MANUAL";

interface SerialInput {
  serialNumber: string;
  inventoryItemId?: string;
}

interface AdjustmentLineInput {
  productId: string;
  locationId: string;
  sublocationId: string | null; // null = Floor / Unassigned
  quantityBefore: number;
  quantityAdjusted: number;
  quantityAfter: number;
  reason?: string;
  serials: SerialInput[];
  rawSerialsInput?: string; // Helper for text-area tag creation
}

interface AdjustmentFormValues {
  reason: InventoryAdjustmentReason;
  notes?: string;
  performedById: string;
  status: "DRAFT" | "POSTED";
  lines: AdjustmentLineInput[];
}

export default function InventoryAdjustmentForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AdjustmentFormValues>({
    defaultValues: {
      reason: "STOCK_COUNT",
      notes: "",
      performedById: "", // Set from session/auth context
      status: "DRAFT",
      lines: [
        {
          productId: "",
          locationId: "",
          sublocationId: null,
          quantityBefore: 0,
          quantityAdjusted: 0,
          quantityAfter: 0,
          reason: "",
          serials: [],
          rawSerialsInput: "",
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "lines",
  });

  const watchLines = watch("lines");

  // Dynamically calculate quantityAfter when quantityBefore or quantityAdjusted changes
  const handleQuantityChange = (index: number, adjustedVal: number) => {
    const beforeVal = watchLines[index]?.quantityBefore || 0;
    const computedAfter = Number(beforeVal) + Number(adjustedVal);
    setValue(`lines.${index}.quantityAfter`, computedAfter);
  };

  // Convert raw textarea text (comma or newline separated) into serial objects
  const handleSerialsParse = (index: number, rawInput: string) => {
    const parsed = rawInput
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((sn) => ({ serialNumber: sn }));

    setValue(`lines.${index}.serials`, parsed);
  };

  const onSubmit = async (data: AdjustmentFormValues, targetStatus: "DRAFT" | "POSTED") => {
    setIsSubmitting(true);
    setMessage(null);

    const payload = {
      ...data,
      status: targetStatus,
    };

    try {
      const res = await fetch("/api/admin/inventory/adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to process adjustment");

      setMessage({
        type: "success",
        text: `Adjustment successfully ${targetStatus === "POSTED" ? "posted" : "saved as draft"}! Reference: ${result.data.adjustmentNumber}`,
      });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-gray-200 space-y-6 my-8">
      {/* Header */}
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Stock Adjustment</h1>
          <p className="text-sm text-gray-500">Record stock counts, damage, losses, or manual corrections</p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit((data) => onSubmit(data, "DRAFT"))}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm font-medium disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> Save Draft
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit((data) => onSubmit(data, "POSTED"))}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium disabled:opacity-50"
          >
            <Send className="w-4 h-4" /> Post Adjustment
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg flex items-center gap-3 text-sm font-medium ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{message.text}</span>
        </div>
      )}

      {/* Adjustment Meta Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
            Reason Code *
          </label>
          <select
            {...register("reason", { required: true })}
            className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="STOCK_COUNT">Physical Stock Count</option>
            <option value="DAMAGE">Damaged Goods</option>
            <option value="LOSS">Shrinkage / Loss</option>
            <option value="THEFT">Stolen Item</option>
            <option value="EXPIRED">Expired / Obsolete</option>
            <option value="RETURN">Customer/Vendor Return</option>
            <option value="CORRECTION">System Correction</option>
            <option value="MANUAL">Manual Adjustment</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
            Performed By (User ID) *
          </label>
          <input
            type="text"
            placeholder="e.g. usr_102"
            {...register("performedById", { required: true })}
            className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
            Notes / Reference
          </label>
          <input
            type="text"
            placeholder="Auditor notes or ticket ref..."
            {...register("notes")}
            className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Adjustment Lines */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Line Items</h2>

        {fields.map((field, index) => (
          <div
            key={field.id}
            className="p-4 border border-gray-200 rounded-xl space-y-4 bg-white hover:border-gray-300 transition"
          >
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-sm font-semibold text-gray-600 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-500" /> Line #{index + 1}
              </span>
              {fields.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="text-red-600 hover:text-red-800 text-sm flex items-center gap-1 font-medium"
                >
                  <Trash2 className="w-4 h-4" /> Remove
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Product ID *</label>
                <input
                  type="text"
                  placeholder="prod_abc123"
                  {...register(`lines.${index}.productId`, { required: true })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Location ID *</label>
                <input
                  type="text"
                  placeholder="loc_main_wh"
                  {...register(`lines.${index}.locationId`, { required: true })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Sublocation / Bin <span className="text-gray-400 font-normal">(Blank = Floor Stock)</span>
                </label>
                <input
                  type="text"
                  placeholder="bin_a1 (Optional)"
                  {...register(`lines.${index}.sublocationId`)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Quantities Row */}
            <div className="grid grid-cols-3 gap-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Current Qty</label>
                <input
                  type="number"
                  step="any"
                  {...register(`lines.${index}.quantityBefore`, { valueAsNumber: true })}
                  className="w-full border border-gray-200 rounded-md px-3 py-1.5 text-sm bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Adjust Delta (+ / -) *
                </label>
                <input
                  type="number"
                  step="any"
                  {...register(`lines.${index}.quantityAdjusted`, {
                    valueAsNumber: true,
                    onChange: (e) => handleQuantityChange(index, e.target.value),
                  })}
                  className="w-full border border-blue-400 rounded-md px-3 py-1.5 text-sm font-semibold focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Calculated Final Qty</label>
                <input
                  type="number"
                  step="any"
                  readOnly
                  {...register(`lines.${index}.quantityAfter`, { valueAsNumber: true })}
                  className="w-full border border-gray-200 rounded-md px-3 py-1.5 text-sm font-bold bg-gray-100 text-gray-800"
                />
              </div>
            </div>

            {/* Serial Numbers (Optional) */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Affected Serials <span className="text-gray-400 font-normal">(Separated by commas or newlines)</span>
              </label>
              <textarea
                rows={2}
                placeholder="SN-001, SN-002, SN-003"
                {...register(`lines.${index}.rawSerialsInput`, {
                  onChange: (e) => handleSerialsParse(index, e.target.value),
                })}
                className="w-full border border-gray-300 rounded-md p-2 text-xs font-mono focus:ring-2 focus:ring-blue-500"
              />
              {watchLines[index]?.serials?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {watchLines[index].serials.map((s, sIdx) => (
                    <span
                      key={sIdx}
                      className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-mono text-xs border border-blue-200"
                    >
                      {s.serialNumber}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() =>
            append({
              productId: "",
              locationId: "",
              sublocationId: null,
              quantityBefore: 0,
              quantityAdjusted: 0,
              quantityAfter: 0,
              reason: "",
              serials: [],
              rawSerialsInput: "",
            })
          }
          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-gray-400 hover:text-gray-800 transition flex items-center justify-center gap-2 text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Add Line Item
        </button>
      </div>
    </div>
  );
}