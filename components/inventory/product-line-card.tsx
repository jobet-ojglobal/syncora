"use client";

import { useState, KeyboardEvent, ClipboardEvent, useMemo } from "react";
import {
  useFieldArray,
  useWatch,
  Control,
  UseFormRegister,
  UseFormSetValue,
  FieldErrors,
  Controller,
} from "react-hook-form";
import { InventoryInput } from "@/schemas/inventory.multi.schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Trash2, Plus, Info, ImageIcon, X, AlertCircle, Check, Tag } from "lucide-react";
import { FormSelect } from "../shared/form-select";
import { FormInput } from "../shared/form-input";
import Image from "next/image";
import { toast } from "sonner";

interface LookupItem {
  inflowId: string;
  name: string;
  image: string | null;
  sku: string;
  trackSerials: boolean;
}

interface SublocationOption {
  id: string;
  name: string;
  locationId: string;
}

interface ProductLineCardProps {
  lineIndex: number;
  control: Control<InventoryInput>;
  register: UseFormRegister<InventoryInput>;
  setValue: UseFormSetValue<InventoryInput>;
  errors: FieldErrors<InventoryInput>;
  products: LookupItem[];
  sublocations: SublocationOption[];
  onRemoveLine: (idx: number) => void;
}

export function ProductLineCard({
  lineIndex,
  control,
  register,
  setValue,
  errors,
  products,
  sublocations,
  onRemoveLine,
}: ProductLineCardProps) {
  const [serialInput, setSerialInput] = useState("");

  // Nested Field Array for Bins
  const { fields: binFields, append: appendBin, remove: removeBin } = useFieldArray({
    control,
    name: `lines.${lineIndex}.bins`,
  });

  // Watch line specific values
  const productId = useWatch({ control, name: `lines.${lineIndex}.productId` });
  const onHand = Number(useWatch({ control, name: `lines.${lineIndex}.quantityOnHand` })) || 0;
  const reserved = Number(useWatch({ control, name: `lines.${lineIndex}.quantityReserved` })) || 0;
  const watchedBins = useWatch({ control, name: `lines.${lineIndex}.bins` }) || [];
  const serials: string[] = useWatch({ control, name: `lines.${lineIndex}.serials` }) || [];

  const product = products.find((p) => p.inflowId === productId);
  const isSerialTracked = product?.trackSerials;
  const calculatedAvailable = onHand - reserved;

  // Sum of quantities mapped to bins
  const binTotal = watchedBins.reduce((acc, bin) => acc + (Number(bin?.quantity) || 0), 0);
  const unassignedQuantity = onHand - binTotal;

  const maxAllowedBins = sublocations.length > 0 ? sublocations.length : 1;
  const isMaxBinsReached = binFields.length >= maxAllowedBins;

  // Compute all serials that are currently assigned to any bin
  const allAssignedBinSerials = useMemo(() => {
    return watchedBins.flatMap((bin) => bin?.serials || []).filter(Boolean);
  }, [watchedBins]);

  // Master serials not yet assigned to any bin
  const unassignedMasterSerials = useMemo(() => {
    return serials.filter((s) => !allAssignedBinSerials.includes(s));
  }, [serials, allAssignedBinSerials]);

  const handlePushBinSumToOnHand = () => {
    setValue(`lines.${lineIndex}.quantityOnHand`, binTotal, { shouldValidate: true });
    setValue(`lines.${lineIndex}.quantityAvailable`, binTotal - reserved, { shouldValidate: true });
  };

  // Helper to append unique, cleaned serial numbers
  const addSerials = (rawTokens: string[]) => {
    const cleaned = rawTokens
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (cleaned.length === 0) return;

    const existingSet = new Set(serials);
    const updated = [...serials];

    for (const item of cleaned) {
      if (!existingSet.has(item)) {
        if (updated.length >= onHand) {
          toast.error(`Serial capacity reached. Total On-Hand is ${onHand}.`);
          break;
        }
        existingSet.add(item);
        updated.push(item);
      }
    }

    setValue(`lines.${lineIndex}.serials`, updated, { shouldValidate: true });
  };

  // Handle keydown for Space, Enter, and Comma
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (["Enter", " ", ","].includes(e.key)) {
      e.preventDefault();
      if (serialInput.trim()) {
        addSerials([serialInput]);
        setSerialInput("");
      }
    }
  };

  // Handle Paste events (handles commas, spaces, and newline delimiters)
  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text");
    const parsedSerials = pastedText.split(/[\s,\n\r]+/);
    addSerials(parsedSerials);
    setSerialInput("");
  };

  const removeSerial = (indexToRemove: number) => {
    const serialToRemove = serials[indexToRemove];
    const updated = serials.filter((_, idx) => idx !== indexToRemove);

    // Also strip from any bin assignments
    watchedBins.forEach((bin, bIdx) => {
      if (bin?.serials?.includes(serialToRemove)) {
        const nextBinSerials = bin.serials.filter((s) => s !== serialToRemove);
        setValue(`lines.${lineIndex}.bins.${bIdx}.serials`, nextBinSerials, { shouldValidate: true });
      }
    });

    setValue(`lines.${lineIndex}.serials`, updated, { shouldValidate: true });
  };

  return (
    <div className="border rounded-xl bg-background overflow-hidden shadow-xs space-y-0">
      {/* Product Header */}
      <div className="bg-muted/40 p-3 border-b flex justify-between items-center">
        <div className="flex gap-2 items-center">
          <div className="w-10 h-10 bg-muted border rounded-lg overflow-hidden flex items-center justify-center shrink-0 relative">
            {product?.image ? (
              <Image
                src={product.image}
                alt={product.name || "Product"}
                className="w-full h-full object-cover"
                width={40}
                height={40}
              />
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

      {/* Stock Numbers Configuration */}
      <div className="p-4 border-b bg-muted/5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormInput
            name={`lines.${lineIndex}.quantityOnHand`}
            control={control}
            label="Quantity On Hand (Absolute Volume)"
            step="0.0001"
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
              className={`h-9 px-3 flex items-center font-mono text-xs font-bold rounded-md border ${
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

      {/* Serial Tracking Inputs */}
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

          <div className="flex gap-2">
            <Input
              value={serialInput}
              onChange={(e) => setSerialInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder="Type or paste serials (separated by space, comma, or newline)..."
              disabled={serials.length >= onHand}
              className="text-xs h-8 bg-background max-w-md"
            />
            <Button
              type="button"
              variant="secondary"
              disabled={!serialInput.trim() || serials.length >= onHand}
              onClick={() => {
                if (serialInput.trim()) {
                  addSerials([serialInput]);
                  setSerialInput("");
                }
              }}
              className="h-8 text-xs font-semibold px-3 shrink-0"
            >
              Add Serial
            </Button>
          </div>

          {/* Display Zod Validation Error for Line Serials */}
          {errors.lines?.[lineIndex]?.serials && (
            <p className="text-xs font-medium text-destructive mt-1">
              {errors.lines[lineIndex]?.serials?.message}
            </p>
          )}

          {/* Serial Chips Display */}
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

      {/* Unassigned / Bulk Banner */}
      <div className="flex items-center justify-between text-xs py-2 px-4 bg-muted/30 border-b">
        <span className="text-muted-foreground font-medium">Bulk / Unassigned Storage Area:</span>
        <span
          className={`font-mono font-bold ${
            unassignedQuantity < 0 ? "text-destructive" : "text-foreground"
          }`}
        >
          {unassignedQuantity.toFixed(4)}
        </span>
      </div>

      {/* Table for Nested Bins */}
      {binFields.length > 0 && (
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-muted/10 border-b text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
              <th className="p-3 w-[40%]">Storage Sublocation / Bin</th>
              <th className="p-3">Target Quantity</th>
              <th className="p-3 text-center w-16">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y text-xs">
            {binFields.map((binItem, binIndex) => {
              const binError = errors.lines?.[lineIndex]?.bins?.[binIndex];
              const binQty = Number(watchedBins[binIndex]?.quantity) || 0;
              const currentBinSublocation = watchedBins[binIndex]?.sublocationId;

              return (
                <tr key={binItem.id} className="hover:bg-muted/5 transition-colors">
                  <td colSpan={3} className="p-0">
                    <div className="p-3 space-y-3">
                      <div className="grid grid-cols-12 gap-3 items-start">
                        {/* Sublocation Selector */}
                        <div className="col-span-5">
                          <FormSelect
                            name={`lines.${lineIndex}.bins.${binIndex}.sublocationId`}
                            control={control}
                            options={sublocations}
                            placeholder="Choose Sublocation Slot"
                            classNameLabel="text-muted-foreground font-semibold"
                          />
                        </div>

                        {/* Target Bin Quantity */}
                        <div className="col-span-6">
                          <FormInput
                            name={`lines.${lineIndex}.bins.${binIndex}.quantity`}
                            control={control}
                            step="0.0001"
                            type="number"
                            placeholder="Volume"
                            classNameLabel="text-muted-foreground font-semibold"
                          />
                        </div>

                        {/* Remove Action */}
                        <div className="col-span-1 flex justify-center pt-1">
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

                      {/* Bin-Specific Serial Number Allocation (If Serial Tracked) */}
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

                              // Combine assigned to this bin + unassigned master serials pool
                              const selectablePool = [
                                ...assignedToThisBin,
                                ...unassignedMasterSerials,
                              ];

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
                                            {isSelected ? (
                                              <Check className="w-3 h-3" />
                                            ) : (
                                              <Plus className="w-3 h-3" />
                                            )}
                                          </button>
                                        );
                                      })
                                    )}
                                  </div>
                                </div>
                              );
                            }}
                          />

                          {/* Bin Serial Error */}
                          {binError?.serials && (
                            <p className="text-xs text-destructive font-medium flex items-center gap-1 mt-1">
                              <AlertCircle className="w-3 h-3" />
                              {binError.serials.message}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

// "use client";

// import { useState, KeyboardEvent, ClipboardEvent } from "react";
// import {
//   useFieldArray,
//   useWatch,
//   Control,
//   UseFormRegister,
//   UseFormSetValue,
//   FieldErrors,
// } from "react-hook-form";
// import { InventoryInput } from "@/schemas/inventory.multi.schema";
// import { Input } from "@/components/ui/input";
// import { Button } from "@/components/ui/button";
// import { Field, FieldLabel } from "@/components/ui/field";
// import { Trash2, Plus, Info, ImageIcon, X, AlertCircle } from "lucide-react";
// import { FormSelect } from "../shared/form-select";
// import { FormInput } from "../shared/form-input";
// import Image from "next/image";
// import { toast } from "sonner";

// interface LookupItem {
//   inflowId: string;
//   name: string;
//   image: string | null;
//   sku: string;
//   trackSerials: boolean; // e.g., "YES" | "NO" or "SERIAL"
// }

// interface SublocationOption {
//   id: string;
//   name: string;
//   locationId: string;
// }

// interface ProductLineCardProps {
//   lineIndex: number;
//   control: Control<InventoryInput>;
//   register: UseFormRegister<InventoryInput>;
//   setValue: UseFormSetValue<InventoryInput>;
//   errors: FieldErrors<InventoryInput>;
//   products: LookupItem[];
//   sublocations: SublocationOption[];
//   onRemoveLine: (idx: number) => void;
// }

// export function ProductLineCard({
//   lineIndex,
//   control,
//   register,
//   setValue,
//   errors,
//   products,
//   sublocations,
//   onRemoveLine,
// }: ProductLineCardProps) {
//   const [serialInput, setSerialInput] = useState("");

//   // Nested Field Array for Bins
//   const { fields: binFields, append: appendBin, remove: removeBin } = useFieldArray({
//     control,
//     name: `lines.${lineIndex}.bins`,
//   });

//   // Watch line specific values
//   const productId = useWatch({ control, name: `lines.${lineIndex}.productId` });
//   const onHand = Number(useWatch({ control, name: `lines.${lineIndex}.quantityOnHand` })) || 0;
//   const reserved = Number(useWatch({ control, name: `lines.${lineIndex}.quantityReserved` })) || 0;
//   const watchedBins = useWatch({ control, name: `lines.${lineIndex}.bins` }) || [];
//   const serials: string[] = useWatch({ control, name: `lines.${lineIndex}.serials` }) || [];

//   const product = products.find((p) => p.inflowId === productId);
//   const isSerialTracked = product?.trackSerials;
//   const calculatedAvailable = onHand - reserved;

//   // Sum of quantities mapped to bins
//   const binTotal = watchedBins.reduce((acc, bin) => acc + (Number(bin?.quantity) || 0), 0);
//   const unassignedQuantity = onHand - binTotal;

//   const maxAllowedBins = sublocations.length > 0 ? sublocations.length : 1;
//   const isMaxBinsReached = binFields.length >= maxAllowedBins;

//   const handlePushBinSumToOnHand = () => {
//     setValue(`lines.${lineIndex}.quantityOnHand`, binTotal, { shouldValidate: true });
//     setValue(`lines.${lineIndex}.quantityAvailable`, binTotal - reserved, { shouldValidate: true });
//   };

//   // Helper to append unique, cleaned serial numbers
//   const addSerials = (rawTokens: string[]) => {
//     const cleaned = rawTokens
//       .map((s) => s.trim())
//       .filter((s) => s.length > 0);

//     if (cleaned.length === 0) return;

//     const existingSet = new Set(serials);
//     const updated = [...serials];

//     for (const item of cleaned) {
//       if (!existingSet.has(item)) {
//         if (updated.length >= onHand) {
//           toast.error(`Serial capacity reached. Total On-Hand is ${onHand}.`);
//           break;
//         }
//         existingSet.add(item);
//         updated.push(item);
//       }
//     }

//     setValue(`lines.${lineIndex}.serials`, updated, { shouldValidate: true });
//   };

//   // Handle keydown for Space, Enter, and Comma
//   const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
//     if (["Enter", " ", ","].includes(e.key)) {
//       e.preventDefault();
//       if (serialInput.trim()) {
//         addSerials([serialInput]);
//         setSerialInput("");
//       }
//     }
//   };

//   // Handle Paste events (handles commas, spaces, and newline delimiters)
//   const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
//     e.preventDefault();
//     const pastedText = e.clipboardData.getData("text");
//     const parsedSerials = pastedText.split(/[\s,\n\r]+/);
//     addSerials(parsedSerials);
//     setSerialInput("");
//   };

//   const removeSerial = (indexToRemove: number) => {
//     const updated = serials.filter((_, idx) => idx !== indexToRemove);
//     setValue(`lines.${lineIndex}.serials`, updated, { shouldValidate: true });
//   };

//   return (
//     <div className="border rounded-xl bg-background overflow-hidden shadow-xs space-y-0">
//       {/* Product Header */}
//       <div className="bg-muted/40 p-3 border-b flex justify-between items-center">
//         <div className="flex gap-2 items-center">
//           <div className="w-10 h-10 bg-muted border rounded-lg overflow-hidden flex items-center justify-center shrink-0 relative">
//             {product?.image ? (
//               <Image
//                 src={product.image}
//                 alt={product.name || "Product"}
//                 className="w-full h-full object-cover"
//                 width={40}
//                 height={40}
//               />
//             ) : (
//               <ImageIcon className="w-4 h-4 text-muted-foreground/50" />
//             )}
//           </div>
//           <div className="flex items-center gap-2">
//             <div>
//               <h4 className="text-xs font-semibold text-foreground">{product?.name || "Unselected Product"}</h4>
//               <span className="text-[10px] text-muted-foreground font-mono">SKU: {product?.sku || "N/A"}</span>
//             </div>
//             <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted font-medium text-muted-foreground border">
//               {binFields.length} / {maxAllowedBins} Bin{maxAllowedBins > 1 ? "s" : ""}
//             </span>
//             {isSerialTracked && (
//               <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold border border-blue-200 dark:border-blue-900">
//                 Tracked by Serial
//               </span>
//             )}
//           </div>
//         </div>

//         <div className="flex items-center gap-2">
//           {binFields.length > 0 && binTotal > 0 && (
//             <Button
//               type="button"
//               variant="ghost"
//               size="sm"
//               onClick={handlePushBinSumToOnHand}
//               className="h-7 text-[11px] text-blue-600 dark:text-blue-400 gap-1 hover:bg-blue-50 dark:hover:bg-blue-950/30"
//             >
//               <Info className="w-3 h-3" /> Push Bin Sum ({binTotal.toFixed(2)}) to On-Hand
//             </Button>
//           )}

//           <Button
//             type="button"
//             variant="outline"
//             size="sm"
//             disabled={isMaxBinsReached}
//             onClick={() => appendBin({ sublocationId: "", quantity: 0 })}
//             className="h-7 text-[10px] gap-1.5 disabled:opacity-50"
//           >
//             <Plus className="w-3 h-3" /> Map Storage Bin
//           </Button>

//           <Button
//             type="button"
//             variant="ghost"
//             size="icon"
//             onClick={() => onRemoveLine(lineIndex)}
//             className="w-7 h-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
//             title="Remove entire product line"
//           >
//             <Trash2 className="w-3.5 h-3.5" />
//           </Button>
//         </div>
//       </div>

//       {/* Stock Numbers Configuration */}
//       <div className="p-4 border-b bg-muted/5">
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//           <FormInput
//             name={`lines.${lineIndex}.quantityOnHand`}
//             control={control}
//             label="Quantity On Hand (Absolute Volume)"
//             step="0.0001"
//             type="number"
//             placeholder="0.00"
//             classNameLabel="text-muted-foreground text-xs font-semibold"
//           />

//           <FormInput
//             name={`lines.${lineIndex}.quantityReserved`}
//             control={control}
//             label="Quantity Reserved (Committed Lines)"
//             step="0.0001"
//             type="number"
//             placeholder="0.00"
//             classNameLabel="text-muted-foreground text-xs font-semibold"
//           />

//           <Field className="opacity-90">
//             <FieldLabel className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
//               Quantity Available (Calculated)
//             </FieldLabel>
//             <div
//               className={`h-9 px-3 flex items-center font-mono text-xs font-bold rounded-md border ${
//                 calculatedAvailable < 0
//                   ? "bg-destructive/10 text-destructive border-destructive/20"
//                   : "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
//               }`}
//             >
//               {calculatedAvailable.toFixed(4)}
//             </div>
//           </Field>
//         </div>
//       </div>

//       {/* Serial Tracking Inputs */}
//       {isSerialTracked && (
//         <div className="p-4 border-b bg-muted/10 space-y-3">
//           <div className="flex items-center justify-between">
//             <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
//               Serial Numbers Allocation
//               <span
//                 className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded ${
//                   serials.length === onHand
//                     ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-600"
//                     : serials.length > onHand
//                     ? "bg-destructive/10 text-destructive"
//                     : "bg-amber-100 dark:bg-amber-950 text-amber-600"
//                 }`}
//               >
//                 {serials.length} / {onHand}
//               </span>
//             </span>
//             {serials.length !== onHand && (
//               <span className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
//                 <AlertCircle className="w-3 h-3" />
//                 {serials.length < onHand
//                   ? `Need ${onHand - serials.length} more serial(s)`
//                   : `Exceeds On-Hand limit by ${serials.length - onHand}`}
//               </span>
//             )}
//           </div>

//           <div className="flex gap-2">
//             <Input
//               value={serialInput}
//               onChange={(e) => setSerialInput(e.target.value)}
//               onKeyDown={handleKeyDown}
//               onPaste={handlePaste}
//               placeholder="Type or paste serials (separated by space, comma, or newline)..."
//               disabled={serials.length >= onHand}
//               className="text-xs h-8 bg-background max-w-md"
//             />
//             <Button
//               type="button"
//               variant="secondary"
//               disabled={!serialInput.trim() || serials.length >= onHand}
//               onClick={() => {
//                 if (serialInput.trim()) {
//                   addSerials([serialInput]);
//                   setSerialInput("");
//                 }
//               }}
//               className="h-8 text-xs font-semibold px-3 shrink-0"
//             >
//               Add Serial
//             </Button>
//           </div>

//           {/* Display Zod Validation Error for Serials */}
//           {errors.lines?.[lineIndex]?.serials && (
//             <p className="text-xs font-medium text-destructive mt-1">
//               {errors.lines[lineIndex]?.serials?.message}
//             </p>
//           )}

//           {/* Serial Chips Display */}
//           {serials.length > 0 && (
//             <div className="flex flex-wrap gap-1.5 pt-1 max-h-32 overflow-y-auto">
//               {serials.map((sn, sIdx) => (
//                 <span
//                   key={`${sn}-${sIdx}`}
//                   className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono bg-background border rounded-md shadow-2xs group"
//                 >
//                   {sn}
//                   <button
//                     type="button"
//                     onClick={() => removeSerial(sIdx)}
//                     className="text-muted-foreground hover:text-destructive transition-colors ml-0.5"
//                   >
//                     <X className="w-3 h-3" />
//                   </button>
//                 </span>
//               ))}
//             </div>
//           )}
//         </div>
//       )}

//       {/* Unassigned / Bulk Banner */}
//       <div className="flex items-center justify-between text-xs py-2 px-4 bg-muted/30 border-b">
//         <span className="text-muted-foreground font-medium">Bulk / Unassigned Storage Area:</span>
//         <span
//           className={`font-mono font-bold ${
//             unassignedQuantity < 0 ? "text-destructive" : "text-foreground"
//           }`}
//         >
//           {unassignedQuantity.toFixed(4)}
//         </span>
//       </div>

//       {/* Table for Nested Bins */}
//       {binFields.length > 0 && (
//         <table className="w-full text-left border-collapse">
//           <thead>
//             <tr className="bg-muted/10 border-b text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
//               <th className="p-3 w-[50%]">Storage Sublocation / Bin</th>
//               <th className="p-3">Target Quantity</th>
//               <th className="p-3 text-center w-16">Actions</th>
//             </tr>
//           </thead>
//           <tbody className="divide-y text-xs">
//             {binFields.map((binItem, binIndex) => (
//               <tr key={binItem.id} className="hover:bg-muted/5 transition-colors">
//                 <td className="p-2 align-top">
//                   <FormSelect
//                     name={`lines.${lineIndex}.bins.${binIndex}.sublocationId`}
//                     control={control}
//                     options={sublocations}
//                     placeholder="Choose Sublocation Slot"
//                     classNameLabel="text-muted-foreground font-semibold"
//                   />
//                 </td>
//                 <td className="p-2 align-top">
//                   <FormInput
//                     name={`lines.${lineIndex}.bins.${binIndex}.quantity`}
//                     control={control}
//                     step="0.0001"
//                     type="number"
//                     placeholder="Volume"
//                     classNameLabel="text-muted-foreground font-semibold"
//                   />
//                 </td>
//                 <td className="p-2 align-top text-center">
//                   <Button
//                     type="button"
//                     variant="ghost"
//                     size="icon"
//                     onClick={() => removeBin(binIndex)}
//                     className="w-7 h-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
//                   >
//                     <Trash2 className="w-3.5 h-3.5" />
//                   </Button>
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       )}
//     </div>
//   );
// }

// "use client";

// import { useFieldArray, useWatch, Control, UseFormRegister, UseFormSetValue, FieldErrors } from "react-hook-form";
// import { InventoryInput } from "@/schemas/inventory.multi.schema";
// import { Input } from "@/components/ui/input";
// import { Button } from "@/components/ui/button";
// import { Field, FieldLabel } from "@/components/ui/field";
// import { Trash2, Plus, Info, ImageIcon } from "lucide-react";
// import { FormSelect } from "../shared/form-select";
// import { FormInput } from "../shared/form-input";
// import Image from "next/image";

// interface LookupItem {
//   inflowId: string;
//   name: string;
//   image: string | null;
//   sku: string;
//   trackSerials: string;
// }

// interface SublocationOption {
//   id: string;
//   name: string;
//   locationId: string;
// }

// interface ProductLineCardProps {
//   lineIndex: number;
//   control: Control<InventoryInput>;
//   register: UseFormRegister<InventoryInput>;
//   setValue: UseFormSetValue<InventoryInput>;
//   errors: FieldErrors<InventoryInput>;
//   products: LookupItem[];
//   sublocations: SublocationOption[];
//   onRemoveLine: (idx: number) => void;
// }

// export function ProductLineCard({
//   lineIndex,
//   control,
//   register,
//   setValue,
//   errors,
//   products,
//   sublocations,
//   onRemoveLine,
// }: ProductLineCardProps) {
//   // Nested Field Array for Bins inside this Line
//   const { fields: binFields, append: appendBin, remove: removeBin } = useFieldArray({
//     control,
//     name: `lines.${lineIndex}.bins`,
//   });

//   // Watch line specific values
//   const productId = useWatch({ control, name: `lines.${lineIndex}.productId` });
//   const onHand = Number(useWatch({ control, name: `lines.${lineIndex}.quantityOnHand` })) || 0;
//   const reserved = Number(useWatch({ control, name: `lines.${lineIndex}.quantityReserved` })) || 0;
//   const watchedBins = useWatch({ control, name: `lines.${lineIndex}.bins` }) || [];
  

//   const product = products.find((p) => p.inflowId === productId);
//   const calculatedAvailable = onHand - reserved;

//   // Sum of quantities mapped to bins
//   const binTotal = watchedBins.reduce((acc, bin) => acc + (Number(bin?.quantity) || 0), 0);
//   const unassignedQuantity = onHand - binTotal;

//   const maxAllowedBins = sublocations.length > 0 ? sublocations.length : 1;
//   const isMaxBinsReached = binFields.length >= maxAllowedBins;

//   const handlePushBinSumToOnHand = () => {
//     setValue(`lines.${lineIndex}.quantityOnHand`, binTotal);
//     setValue(`lines.${lineIndex}.quantityAvailable`, binTotal - reserved);
//   };

//   return (
//     <div className="border rounded-xl bg-background overflow-hidden shadow-xs space-y-0">
//       {/* Product Header */}
//       <div className="bg-muted/40 p-3 border-b flex justify-between items-center">
//         <div className="flex gap-2">
//           <div className="w-10 h-10 bg-muted border rounded-lg overflow-hidden flex items-center justify-center shrink-0 relative">
//             {product?.image ? (
//               <Image src={product.image} alt={product.name} className="w-full h-full object-cover" width={10} height={10} />
//             ) : (
//               <ImageIcon className="w-4 h-4 text-muted-foreground/50" />
//             )}
//           </div>
//           <div className="flex items-center gap-2">
//             <div>
//               <h4 className="text-xs font-semibold text-foreground">{product?.name}</h4>
//               <span className="text-[10px] text-muted-foreground font-mono">SKU: {product?.sku}</span>
//             </div>
//             <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted font-medium text-muted-foreground border">
//               {binFields.length} / {maxAllowedBins} Bin{maxAllowedBins > 1 ? "s" : ""}
//             </span>
//           </div>
//         </div>

//         <div className="flex items-center gap-2">
//           {binFields.length > 0 && binTotal > 0 && (
//             <Button
//               type="button"
//               variant="ghost"
//               size="sm"
//               onClick={handlePushBinSumToOnHand}
//               className="h-7 text-[11px] text-blue-600 dark:text-blue-400 gap-1 hover:bg-blue-50 dark:hover:bg-blue-950/30"
//             >
//               <Info className="w-3 h-3" /> Push Bin Sum ({binTotal.toFixed(2)}) to On-Hand
//             </Button>
//           )}
          

//           <Button
//             type="button"
//             variant="outline"
//             size="sm"
//             disabled={isMaxBinsReached}
//             onClick={() => appendBin({ sublocationId: "", quantity: 0 })}
//             className="h-7 text-[10px] gap-1.5 disabled:opacity-50"
//           >
//             <Plus className="w-3 h-3" /> Map Storage Bin
//           </Button>

//           <Button
//             type="button"
//             variant="ghost"
//             size="icon"
//             onClick={() => onRemoveLine(lineIndex)}
//             className="w-7 h-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
//             title="Remove entire product line"
//           >
//             <Trash2 className="w-3.5 h-3.5" />
//           </Button>
//         </div>
//       </div>

//       {/* Stock Numbers Configuration */}
//       <div className="p-4 border-b bg-muted/5">
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//           {/* Quantity On Hand */}
//           <FormInput
//             name={`lines.${lineIndex}.quantityOnHand`}
//             control={control}
//             label="Quantity On Hand (Absolute Volume)"
//             step="0.0001"
//             type="number"
//             placeholder="0.00"
//             classNameLabel="text-muted-foreground text-xs font-semibold"
//           />

//           {/* Quantity Reserved */}
//           <FormInput
//             name={`lines.${lineIndex}.quantityReserved`}
//             control={control}
//             label="Quantity Reserved (Committed Lines)"
//             step="0.0001"
//             type="number"
//             placeholder="0.00"
//             classNameLabel="text-muted-foreground text-xs font-semibold"
//           />

//           {/* Quantity Available */}
//           <Field className="opacity-90">
//             <FieldLabel className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
//               Quantity Available (Calculated)
//             </FieldLabel>
//             <div
//               className={`h-9 px-3 flex items-center font-mono text-xs font-bold rounded-md border ${
//                 calculatedAvailable < 0
//                   ? "bg-destructive/10 text-destructive border-destructive/20"
//                   : "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
//               }`}
//             >
//               {calculatedAvailable.toFixed(4)}
//             </div>
//           </Field>
//         </div>
//       </div>

//       <div className="space-y-2">
//         <div className="flex gap-2">
//           <Input
//             placeholder=""
//             className="text-xs h-8 bg-background max-w-xs"
            
//           />
//           <Button 
//             type="button" 
//             variant="secondary" 
//             className="h-8 text-xs font-semibold px-3"
            
//           >
//             Add Serial
//           </Button>
//         </div>
//       </div>

//       {/* Unassigned / Bulk Banner */}
//       <div className="flex items-center justify-between text-xs py-2 px-4 bg-muted/30 border-b">
//         <span className="text-muted-foreground font-medium">Bulk / Unassigned Storage Area:</span>
//         <span
//           className={`font-mono font-bold ${
//             unassignedQuantity < 0 ? "text-destructive" : "text-foreground"
//           }`}
//         >
//           {unassignedQuantity.toFixed(4)}
//         </span>
//       </div>

//       {/* Table for Nested Bins */}
//       {binFields.length > 0 && (
//         <table className="w-full text-left border-collapse">
//           <thead>
//             <tr className="bg-muted/10 border-b text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
//               <th className="p-3 w-[50%]">Storage Sublocation / Bin</th>
//               <th className="p-3">Target Quantity</th>
//               <th className="p-3 text-center w-16">Actions</th>
//             </tr>
//           </thead>
//           <tbody className="divide-y text-xs">
//             {binFields.map((binItem, binIndex) => (
//               <tr key={binItem.id} className="hover:bg-muted/5 transition-colors">
//                 <td className="p-2 align-top">
//                   <FormSelect
//                     name={`lines.${lineIndex}.bins.${binIndex}.sublocationId`}
//                     control={control}
//                     options={sublocations}
//                     placeholder="Choose Sublocation Slot"
//                     classNameLabel="text-muted-foreground font-semibold"
//                   />
//                 </td>
//                 <td className="p-2 align-top">
//                   <FormInput
//                     name={`lines.${lineIndex}.bins.${binIndex}.quantity`}
//                     control={control}
//                     step="0.0001"
//                     type="number"
//                     placeholder="Volume"
//                     classNameLabel="text-muted-foreground font-semibold"
//                   />
//                 </td>
//                 <td className="p-2 align-top text-center">
//                   <Button
//                     type="button"
//                     variant="ghost"
//                     size="icon"
//                     onClick={() => removeBin(binIndex)}
//                     className="w-7 h-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
//                   >
//                     <Trash2 className="w-3.5 h-3.5" />
//                   </Button>
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       )}
//     </div>
//   );
// }