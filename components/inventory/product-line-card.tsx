"use client";

import { useFieldArray, useWatch, Control, UseFormRegister, UseFormSetValue, FieldErrors } from "react-hook-form";
import { InventoryInput } from "@/schemas/inventory.multi.schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Trash2, Plus, Info } from "lucide-react";
import { FormSelect } from "../shared/form-select";
import { FormInput } from "../shared/form-input";

interface SelectionOption {
  inflowId: string;
  name: string;
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
  products: SelectionOption[];
  sublocations: SublocationOption[];
  onRemoveLine: () => void;
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
  // Nested Field Array for Bins inside this Line
  const { fields: binFields, append: appendBin, remove: removeBin } = useFieldArray({
    control,
    name: `lines.${lineIndex}.bins`,
  });

  // Watch line specific values
  const productId = useWatch({ control, name: `lines.${lineIndex}.productId` });
  const onHand = Number(useWatch({ control, name: `lines.${lineIndex}.quantityOnHand` })) || 0;
  const reserved = Number(useWatch({ control, name: `lines.${lineIndex}.quantityReserved` })) || 0;
  const watchedBins = useWatch({ control, name: `lines.${lineIndex}.bins` }) || [];

  const productName = products.find((p) => p.inflowId === productId)?.name || productId;
  const calculatedAvailable = onHand - reserved;

  // Sum of quantities mapped to bins
  const binTotal = watchedBins.reduce((acc, bin) => acc + (Number(bin?.quantity) || 0), 0);
  const unassignedQuantity = onHand - binTotal;

  const maxAllowedBins = sublocations.length > 0 ? sublocations.length : 1;
  const isMaxBinsReached = binFields.length >= maxAllowedBins;

  const handlePushBinSumToOnHand = () => {
    setValue(`lines.${lineIndex}.quantityOnHand`, binTotal);
    setValue(`lines.${lineIndex}.quantityAvailable`, binTotal - reserved);
  };

  return (
    <div className="border rounded-xl bg-background overflow-hidden shadow-xs space-y-0">
      {/* Product Header */}
      <div className="bg-muted/40 p-3 border-b flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div>
            <h4 className="text-xs font-semibold text-foreground">{productName}</h4>
            <span className="text-[10px] text-muted-foreground font-mono">{productId}</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted font-medium text-muted-foreground border">
            {binFields.length} / {maxAllowedBins} Bin{maxAllowedBins > 1 ? "s" : ""}
          </span>
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
            onClick={() => appendBin({ sublocationId: "", quantity: 0 })}
            className="h-7 text-[10px] gap-1.5 disabled:opacity-50"
          >
            <Plus className="w-3 h-3" /> Map Storage Bin
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRemoveLine}
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
          {/* Quantity On Hand */}
          <FormInput
            name={`lines.${lineIndex}.quantityOnHand`}
            control={control}
            label="Quantity On Hand (Absolute Volume)"
            step="0.0001"
            type="number"
            placeholder="0.00"
            classNameLabel="text-muted-foreground text-xs font-semibold"
          />

          {/* Quantity Reserved */}
          <FormInput
            name={`lines.${lineIndex}.quantityReserved`}
            control={control}
            label="Quantity Reserved (Committed Lines)"
            step="0.0001"
            type="number"
            placeholder="0.00"
            classNameLabel="text-muted-foreground text-xs font-semibold"
          />

          {/* Quantity Available */}
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
              <th className="p-3 w-[50%]">Storage Sublocation / Bin</th>
              <th className="p-3">Target Quantity</th>
              <th className="p-3 text-center w-16">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y text-xs">
            {binFields.map((binItem, binIndex) => (
              <tr key={binItem.id} className="hover:bg-muted/5 transition-colors">
                <td className="p-2 align-top">
                  <FormSelect
                    name={`lines.${lineIndex}.bins.${binIndex}.sublocationId`}
                    control={control}
                    options={sublocations}
                    placeholder="Choose Sublocation Slot"
                    classNameLabel="text-muted-foreground font-semibold"
                  />
                </td>
                <td className="p-2 align-top">
                  <FormInput
                    name={`lines.${lineIndex}.bins.${binIndex}.quantity`}
                    control={control}
                    step="0.0001"
                    type="number"
                    placeholder="Volume"
                    classNameLabel="text-muted-foreground font-semibold"
                  />
                </td>
                <td className="p-2 align-top text-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeBin(binIndex)}
                    className="w-7 h-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}