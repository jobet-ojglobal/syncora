"use client";

import { useState, KeyboardEvent, ClipboardEvent, useMemo, useEffect } from "react";
import {
  useFieldArray,
  useWatch,
  Control,
  UseFormSetValue,
  FieldErrors,
  Controller,
} from "react-hook-form";
import { StockAdjustmentInput } from "@/schemas/stock-adjustment.schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Trash2, Plus, Info, ImageIcon, X, AlertCircle, Check, Tag, Loader2, Wand2 } from "lucide-react";
import { FormSelect } from "../shared/form-select";
import { FormInput } from "../shared/form-input";
import Image from "next/image";
import { toast } from "sonner";
import { autoDistributeSerialsToBins, filterUniqueSerials, generateSequentialSerials } from "@/utils/serial.utility";

interface Product {
  inflowId: string;
  name: string;
  sku: string;
  thumbnail: string | null;
  trackSerials: boolean;
}

interface SublocationOption {
  id: string;
  name: string;
  locationId: string;
}

interface ProductLineCardProps {
  lineIndex: number;
  control: Control<StockAdjustmentInput>;
  setValue: UseFormSetValue<StockAdjustmentInput>;
  errors: FieldErrors<StockAdjustmentInput>;
  product: Product | undefined;
  sublocations: SublocationOption[];
  onRemoveLine: (idx: number) => void;
  quantityBefore: number;
}

const REASON_OPTIONS = [
  { id: "STOCK_COUNT", name: "Restock" },
  { id: "DAMAGE", name: "Damaged" },
  { id: "LOSS", name: "Write-off" },
  { id: "THEFT", name: "Stolen" },
  { id: "EXPIRED", name: "Expired" },
  { id: "RETURN", name: "Return" },
  { id: "CORRECTION", name: "Correction" },
  { id: "MANUAL", name: "Other" },
];

export function AdjustmentProductLineCard({
  lineIndex,
  control,
  setValue,
  errors,
  product,
  sublocations,
  onRemoveLine,
  quantityBefore,
}: ProductLineCardProps) {
  const [serialInput, setSerialInput] = useState("");
  const [isVerifyingSerials, setIsVerifyingSerials] = useState(false);
  const [autofillPrefix, setAutofillPrefix] = useState("SN-");

  // Field Array for Bins
  const { fields: binFields, append: appendBin, remove: removeBin } = useFieldArray({
    control,
    name: `lines.${lineIndex}.bins`,
  });

  // Watch line specific values
  const onHand = Number(useWatch({ control, name: `lines.${lineIndex}.quantityOnHand` })) || 0;
  const reserved = Number(useWatch({ control, name: `lines.${lineIndex}.quantityReserved` })) || 0;

  const watchedBins = useWatch({ control, name: `lines.${lineIndex}.bins` }) || [];
  const serials: string[] = useWatch({ control, name: `lines.${lineIndex}.serials` }) || [];

  const isSerialTracked = Boolean(product?.trackSerials);
  const calculatedAvailable = onHand - reserved;
  const calculatedAdjusted = onHand - quantityBefore;

  // Keep quantityAdjusted in sync with form state
  useEffect(() => {
    setValue(`lines.${lineIndex}.quantityAdjusted`, calculatedAdjusted, {
      shouldValidate: true,
      shouldDirty: true,
    });
  }, [calculatedAdjusted, lineIndex, setValue]);

  // Quantities & Capacity calculations
  const binTotal = useMemo(() => {
    return watchedBins.reduce((acc, bin) => acc + (Number(bin?.quantity) || 0), 0);
  }, [watchedBins]);

  const unassignedQuantity = onHand - binTotal;
  const maxAllowedBins = sublocations.length > 0 ? sublocations.length : 1;
  const isMaxBinsReached = binFields.length >= maxAllowedBins;

  // Serial assignments mapping
  const allAssignedBinSerials = useMemo(() => {
    return watchedBins.flatMap((bin) => bin?.serials || []).filter(Boolean);
  }, [watchedBins]);

  const unassignedMasterSerials = useMemo(() => {
    return serials.filter((s) => !allAssignedBinSerials.includes(s));
  }, [serials, allAssignedBinSerials]);

  const handlePushBinSumToOnHand = () => {
    setValue(`lines.${lineIndex}.quantityOnHand`, binTotal, { shouldValidate: true, shouldDirty: true });
    setValue(`lines.${lineIndex}.quantityAvailable`, binTotal - reserved, { shouldValidate: true, shouldDirty: true });
  };

  const checkSerialsInBackend = async (candidates: string[]): Promise<string[]> => {
    if (candidates.length === 0) return [];
    try {
      const response = await fetch("/api/admin/inventory/serials/verify-existing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serials: candidates }),
      });

      if (!response.ok) throw new Error("Failed to verify serial numbers against inventory");

      const data = await response.json();
      return data.existingSerials || [];
    } catch {
      toast.error("Could not verify serial uniqueness with server");
      return [];
    }
  };

  const addSerials = async (rawTokens: string[]) => {
    if (isVerifyingSerials) return;

    const cleaned = Array.from(new Set(rawTokens.map((s) => s.trim()).filter((s) => s.length > 0)));
    if (cleaned.length === 0) return;

    const existingSet = new Set(serials);
    const newCandidates = cleaned.filter((item) => {
      if (existingSet.has(item)) {
        toast.warning(`Serial "${item}" is already added to this item.`);
        return false;
      }
      return true;
    });

    if (newCandidates.length === 0) return;

    if (serials.length + newCandidates.length > onHand) {
      toast.error(`Cannot exceed On-Hand capacity of ${onHand} serials.`);
      return;
    }

    setIsVerifyingSerials(true);
    const existingInDb = await checkSerialsInBackend(newCandidates);
    setIsVerifyingSerials(false);

    if (existingInDb.length > 0) {
      toast.error(`The following serials already exist in database: ${existingInDb.join(", ")}`);
    }

    const dbSet = new Set(existingInDb);
    const validToAdd = newCandidates.filter((sn) => !dbSet.has(sn));

    if (validToAdd.length > 0) {
      setValue(`lines.${lineIndex}.serials`, [...serials, ...validToAdd], {
        shouldValidate: true,
        shouldDirty: true,
      });
      setSerialInput("");
      toast.success(`Added ${validToAdd.length} serial(s).`);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (["Enter", " ", ","].includes(e.key)) {
      e.preventDefault();
      if (serialInput.trim()) {
        addSerials([serialInput]);
      }
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text");
    const parsedSerials = pastedText.split(/[\s,\n\r]+/);
    addSerials(parsedSerials);
  };

  const removeSerial = (indexToRemove: number) => {
    const serialToRemove = serials[indexToRemove];
    const updated = serials.filter((_, idx) => idx !== indexToRemove);

    watchedBins.forEach((bin, bIdx) => {
      if (bin?.serials?.includes(serialToRemove)) {
        const nextBinSerials = bin.serials.filter((s: string) => s !== serialToRemove);
        setValue(`lines.${lineIndex}.bins.${bIdx}.serials`, nextBinSerials, { shouldValidate: true });
      }
    });

    setValue(`lines.${lineIndex}.serials`, updated, { shouldValidate: true, shouldDirty: true });
  };

 const handleAutofillSerials = async () => {
  const remainingNeeded = onHand - serials.length;
  if (remainingNeeded <= 0) {
    toast.info("Master serial pool is already full.");
    return;
  }

  const cleanPrefix = (autofillPrefix || "SN-").trim();
  setIsVerifyingSerials(true);

  try {
    // 1. Fetch all serials starting with this prefix directly from DB
    const response = await fetch("/api/admin/inventory/serials/verify-existing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prefix: cleanPrefix,
        productId: product?.inflowId,
      }),
    });

    if (!response.ok) throw new Error("Failed to fetch existing serials from server");

    const data = await response.json();
    const dbExistingSerials: string[] = data.existingSerials || [];

    // 2. Combine DB serials with currently added form serials (case-insensitive set)
    const takenSerialsSet = new Set(
      [...serials, ...dbExistingSerials].map((s) => s.trim().toUpperCase())
    );

    // 3. Generate candidate serials until we fill the remaining required count
    const validToAdd: string[] = [];
    let currentIndex = serials.length + 1;
    const maxSearchLimit = 10000; // Safety guard against infinite loop
    let iterations = 0;

    while (validToAdd.length < remainingNeeded && iterations < maxSearchLimit) {
      iterations++;
      const [candidate] = generateSequentialSerials(1, {
        prefix: cleanPrefix,
        startingIndex: currentIndex,
        digitPadding: 4,
      });

      currentIndex++;

      // Check against local form state and DB records
      if (!takenSerialsSet.has(candidate.toUpperCase())) {
        takenSerialsSet.add(candidate.toUpperCase());
        validToAdd.push(candidate);
      }
    }

    if (validToAdd.length === 0) {
      toast.warning("Could not find any non-conflicting sequential serials.");
      return;
    }

    // 4. Update Form State & Auto-distribute to Bins
    const updatedMasterSerials = [...serials, ...validToAdd];
    setValue(`lines.${lineIndex}.serials`, updatedMasterSerials, {
      shouldValidate: true,
      shouldDirty: true,
    });

    if (watchedBins.length > 0) {
      const updatedBins = autoDistributeSerialsToBins(watchedBins, updatedMasterSerials);
      setValue(`lines.${lineIndex}.bins`, updatedBins, {
        shouldValidate: true,
        shouldDirty: true,
      });
    }

    toast.success(`Generated and assigned ${validToAdd.length} unique serial(s).`);
  } catch {
    toast.error("An error occurred while generating unique serial numbers.");
  } finally {
    setIsVerifyingSerials(false);
  }
};

  return (
    <div className="border rounded-xl bg-background overflow-hidden shadow-xs space-y-0">
      {/* Header */}
      <div className="bg-muted/40 p-3 border-b flex justify-between items-center">
        <div className="flex gap-2 items-center">
          <div className="w-10 h-10 bg-muted border rounded-lg overflow-hidden flex items-center justify-center shrink-0 relative">
            {product?.thumbnail ? (
              <Image src={product.thumbnail} alt={product.name || "Product"} fill className="object-cover" />
            ) : (
              <ImageIcon className="w-4 h-4 text-muted-foreground/50" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <div>
              <h4 className="text-xs font-semibold text-foreground">{product?.name || "Unselected Product"}</h4>
              <span className="text-[10px] text-muted-foreground font-mono">SKU: {product?.sku || "N/A"}</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted font-medium text-muted-foreground border">
              {binFields.length} / {maxAllowedBins} Bin{maxAllowedBins > 1 ? "s" : ""}
            </span>
            {isSerialTracked && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold border border-blue-200 dark:border-blue-900">
                Tracked by Serial
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {binFields.length > 0 && binTotal > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handlePushBinSumToOnHand}
              className="h-7 text-[11px] text-blue-600 dark:text-blue-400 gap-1 hover:bg-blue-50 dark:hover:bg-blue-950/30"
            >
              <Info className="w-3 h-3" /> Push Bin Sum ({binTotal.toFixed(2)}) to On-Hand
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isMaxBinsReached}
            onClick={() => appendBin({ sublocationId: "", quantity: 0, serials: [] })}
            className="h-7 text-[10px] gap-1.5 disabled:opacity-50"
          >
            <Plus className="w-3 h-3" /> Map Storage Bin
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onRemoveLine(lineIndex)}
            className="w-7 h-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            title="Remove entire product line"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Reasoning & Calculations */}
      <div className="p-4 border-b bg-muted/20">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <FormSelect
            name={`lines.${lineIndex}.reason`}
            label="Adjustment Line Reason"
            control={control}
            options={REASON_OPTIONS}
            placeholder="Select Adjustment Reason"
            classNameLabel="text-muted-foreground text-xs font-semibold"
          />

          <Field className="opacity-90">
            <FieldLabel className="text-muted-foreground text-xs font-semibold">Quantity Before</FieldLabel>
            <div className="h-8 px-3 flex items-center font-mono text-xs font-semibold rounded-md border bg-muted/30 border-border text-foreground">
              {quantityBefore.toFixed(4)}
            </div>
          </Field>

          <Field className="opacity-90">
            <FieldLabel className="text-blue-600 dark:text-blue-400 text-xs font-semibold">
              Calculated Adjustment (+/-)
            </FieldLabel>
            <div
              className={`h-8 px-3 flex items-center font-mono text-xs font-bold rounded-md border ${
                calculatedAdjusted < 0
                  ? "bg-destructive/10 text-destructive border-destructive/20"
                  : calculatedAdjusted > 0
                  ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  : "bg-muted/30 border-border text-muted-foreground"
              }`}
            >
              {calculatedAdjusted > 0 ? `+${calculatedAdjusted.toFixed(4)}` : calculatedAdjusted.toFixed(4)}
            </div>
          </Field>

          <Field className="opacity-90">
            <FieldLabel className="text-foreground text-xs font-semibold">New On-Hand Target</FieldLabel>
            <div className="h-8 px-3 flex items-center font-mono text-xs font-bold rounded-md border bg-background border-border text-foreground">
              {onHand.toFixed(4)}
            </div>
          </Field>
        </div>
      </div>

      {/* Target Quantities */}
      <div className="p-4 border-b bg-muted/5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormInput
            name={`lines.${lineIndex}.quantityOnHand`}
            control={control}
            label="Adjusted Quantity On Hand"
            step="1"
            type="number"
            placeholder="0.00"
            classNameLabel="text-muted-foreground text-xs font-semibold"
          />

          <FormInput
            name={`lines.${lineIndex}.quantityReserved`}
            control={control}
            label="Quantity Reserved (Committed Lines)"
            step="0.0001"
            type="number"
            placeholder="0.00"
            classNameLabel="text-muted-foreground text-xs font-semibold"
          />

          <Field className="opacity-90">
            <FieldLabel className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              Quantity Available (Calculated)
            </FieldLabel>
            <div
              className={`h-8 px-3 flex items-center font-mono text-xs font-bold rounded-md border ${
                calculatedAvailable < 0
                  ? "bg-destructive/10 text-destructive border-destructive/20"
                  : "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
              }`}
            >
              {calculatedAvailable.toFixed(4)}
            </div>
          </Field>
        </div>
      </div>

      {/* Serial Numbers Pool */}
      {isSerialTracked && (
        <div className="p-4 border-b bg-muted/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              Master Serial Pool
              <span
                className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded ${
                  serials.length === onHand
                    ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-600"
                    : serials.length > onHand
                    ? "bg-destructive/10 text-destructive"
                    : "bg-amber-100 dark:bg-amber-950 text-amber-600"
                }`}
              >
                {serials.length} / {onHand}
              </span>
            </span>
            {serials.length !== onHand && (
              <span className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {serials.length < onHand
                  ? `Need ${onHand - serials.length} more serial(s)`
                  : `Exceeds On-Hand limit by ${serials.length - onHand}`}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Input
              value={serialInput}
              onChange={(e) => setSerialInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder="Type or paste serials..."
              disabled={serials.length >= onHand || isVerifyingSerials}
              className="text-xs h-8 bg-background max-w-xs"
            />
            <Button
              type="button"
              variant="secondary"
              disabled={!serialInput.trim() || serials.length >= onHand || isVerifyingSerials}
              onClick={() => serialInput.trim() && addSerials([serialInput])}
              className="h-8 text-xs font-semibold px-3 shrink-0"
            >
              {isVerifyingSerials ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin mr-1" /> Checking...
                </>
              ) : (
                "Add Serial"
              )}
            </Button>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 border rounded-md px-2 bg-background h-8">
                <span className="text-[11px] text-muted-foreground font-medium shrink-0">Prefix:</span>
                <input
                  type="text"
                  value={autofillPrefix}
                  onChange={(e) => setAutofillPrefix(e.target.value)}
                  className="w-14 text-xs bg-transparent outline-none font-mono"
                  placeholder="SN-"
                />
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={serials.length >= onHand || isVerifyingSerials}
                onClick={handleAutofillSerials}
                className="h-8 text-xs gap-1.5 font-medium border-dashed"
              >
                <Wand2 className="w-3.5 h-3.5 text-purple-500" />
                Autofill Remaining ({Math.max(0, onHand - serials.length)})
              </Button>
            </div>
          </div>

          {errors.lines?.[lineIndex]?.serials && (
            <p className="text-xs font-medium text-destructive mt-1">
              {errors.lines[lineIndex]?.serials?.message}
            </p>
          )}

          {serials.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1 max-h-32 overflow-y-auto">
              {serials.map((sn, sIdx) => {
                const isAssignedToBin = allAssignedBinSerials.includes(sn);
                return (
                  <span
                    key={`${sn}-${sIdx}`}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono border rounded-md shadow-2xs group ${
                      isAssignedToBin
                        ? "bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300"
                        : "bg-background border-border"
                    }`}
                  >
                    <Tag className="w-2.5 h-2.5 opacity-60" />
                    {sn}
                    <button
                      type="button"
                      onClick={() => removeSerial(sIdx)}
                      className="text-muted-foreground hover:text-destructive transition-colors ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Unassigned Summary */}
      <div className="flex items-center justify-between text-xs py-2 px-4 bg-muted/30 border-b">
        <span className="text-muted-foreground font-medium">Bulk / Unassigned Storage Area:</span>
        <span className={`font-mono font-bold ${unassignedQuantity < 0 ? "text-destructive" : "text-foreground"}`}>
          {unassignedQuantity.toFixed(4)}
        </span>
      </div>

      {/* Bins Allocation Section */}
      {binFields.length > 0 && (
        <div className="p-3 space-y-3">
          {binFields.map((binItem, binIndex) => {
            const binError = errors.lines?.[lineIndex]?.bins?.[binIndex];
            const binQty = Number(watchedBins[binIndex]?.quantity) || 0;
            const currentBinSublocation = watchedBins[binIndex]?.sublocationId;

            return (
              <div key={binItem.id} className="p-3 border rounded-lg bg-card space-y-3">
                <div className="grid grid-cols-12 gap-3 items-start">
                  <div className="col-span-12 sm:col-span-5">
                    <FormSelect
                      name={`lines.${lineIndex}.bins.${binIndex}.sublocationId`}
                      control={control}
                      options={sublocations}
                      placeholder="Choose Sublocation Slot"
                      classNameLabel="text-muted-foreground font-semibold"
                    />
                  </div>

                  <div className="col-span-10 sm:col-span-6">
                    <FormInput
                      name={`lines.${lineIndex}.bins.${binIndex}.quantity`}
                      control={control}
                      step="0.0001"
                      type="number"
                      placeholder="Volume"
                      classNameLabel="text-muted-foreground font-semibold"
                    />
                  </div>

                  <div className="col-span-2 sm:col-span-1 flex justify-end sm:justify-center pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeBin(binIndex)}
                      className="w-7 h-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {isSerialTracked && currentBinSublocation && (
                  <div className="pt-2 border-t border-dashed space-y-2">
                    <Controller
                      control={control}
                      name={`lines.${lineIndex}.bins.${binIndex}.serials`}
                      render={({ field }) => {
                        const assignedToThisBin: string[] = field.value || [];
                        const isBinCountMatched = assignedToThisBin.length === binQty;

                        const toggleBinSerial = (sn: string) => {
                          const exists = assignedToThisBin.includes(sn);
                          const updatedBinSerials = exists
                            ? assignedToThisBin.filter((s) => s !== sn)
                            : [...assignedToThisBin, sn];

                          field.onChange(updatedBinSerials);
                        };

                        const selectablePool = Array.from(
                          new Set([...assignedToThisBin, ...unassignedMasterSerials])
                        );

                        return (
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="font-semibold text-muted-foreground flex items-center gap-1">
                                Assign Serials to Bin Slot:
                                <span
                                  className={`font-mono font-bold px-1.5 py-0.2 rounded ${
                                    isBinCountMatched
                                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                                      : "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400"
                                  }`}
                                >
                                  {assignedToThisBin.length} / {binQty}
                                </span>
                              </span>
                              {!isBinCountMatched && (
                                <span className="text-[10px] text-amber-600 dark:text-amber-400">
                                  Needs {Math.abs(binQty - assignedToThisBin.length)} serial(s) to match volume
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-1 p-2 bg-muted/20 rounded-md border max-h-28 overflow-y-auto">
                              {selectablePool.length === 0 ? (
                                <span className="text-[11px] text-muted-foreground italic">
                                  No unassigned master serials available.
                                </span>
                              ) : (
                                selectablePool.map((sn) => {
                                  const isSelected = assignedToThisBin.includes(sn);
                                  return (
                                    <button
                                      type="button"
                                      key={sn}
                                      onClick={() => toggleBinSerial(sn)}
                                      className={`text-[11px] font-mono px-2 py-0.5 rounded border flex items-center gap-1 transition-colors ${
                                        isSelected
                                          ? "bg-primary text-primary-foreground border-primary font-medium"
                                          : "bg-background hover:bg-muted border-gray-300 dark:border-gray-700"
                                      }`}
                                    >
                                      {sn}
                                      {isSelected ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        );
                      }}
                    />

                    {binError?.serials && (
                      <p className="text-xs text-destructive font-medium flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3 h-3" />
                        {binError.serials.message}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}