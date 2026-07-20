// components/InventoryForm.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useFieldArray, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { inventorySchema, InventoryInput } from "@/schemas/inventory.schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, ArrowLeft, Boxes, Warehouse, AlertCircle, Info } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";

interface SelectionOption {
  inflowId: string;
  name: string;
}

interface SublocationOption {
  id: string;
  name: string;
  locationId: string;
}

interface InventoryFormProps {
  products: SelectionOption[];
  locations: SelectionOption[];
  sublocations: SublocationOption[]; // Global list filtered reactively below
  initialData?: any | null;
}

export function InventoryForm({ products, locations, sublocations, initialData }: InventoryFormProps) {
  const router = useRouter();
  const isEditMode = !!initialData;

  const form = useForm<InventoryInput>({
    resolver: zodResolver(inventorySchema),
    defaultValues: {
      id: initialData?.id || undefined,
      productId: initialData?.productId || "",
      locationId: initialData?.locationId || "",
      quantityOnHand: initialData?.quantityOnHand ? Number(initialData.quantityOnHand) : 0,
      quantityReserved: initialData?.quantityReserved ? Number(initialData.quantityReserved) : 0,
      quantityAvailable: initialData?.quantityAvailable ? Number(initialData.quantityAvailable) : 0,
      bins: initialData?.bins?.map((b: any) => ({
        id: b.id,
        sublocationId: b.sublocationId,
        quantity: Number(b.quantity)
      })) || [], // Explicitly non-undefined default fallback
    },
  });

  const { register, control, handleSubmit, setValue, formState: { errors, isSubmitting } } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "bins",
  });

  // Watch key inputs to calculate stock balances reactively
  const watchedLocationId = useWatch({ control, name: "locationId" });
  const watchedOnHand = useWatch({ control, name: "quantityOnHand" }) || 0;
  const watchedReserved = useWatch({ control, name: "quantityReserved" }) || 0;
  const watchedBins = useWatch({ control, name: "bins" }) || [];

  // Filter sublocations down exclusively to zones matching the selected master facility location
  const availableSublocations = sublocations.filter(sub => sub.locationId === watchedLocationId);

  // 📊 Equation 1: Calculate core stock availability metrics automatically
  useEffect(() => {
    const computedAvailable = Number(watchedOnHand) - Number(watchedReserved);
    setValue("quantityAvailable", computedAvailable);
  }, [watchedOnHand, watchedReserved, setValue]);

  // 🧮 Equation 2: Sum up sublocation bins to auto-populate absolute total stock values
  const handleDistributeBinsToTotal = () => {
    if (watchedBins.length > 0) {
      const sum = watchedBins.reduce((acc, current) => acc + (Number(current.quantity) || 0), 0);
      setValue("quantityOnHand", sum);
    }
  };

  // Inside InventoryForm component:
  const unassignedQuantity = useMemo(() => {
    const binTotal = watchedBins.reduce((sum, b) => sum + (Number(b?.quantity) || 0), 0);
    return Number(watchedOnHand) - binTotal;
  }, [watchedOnHand, watchedBins]);

  const onSubmit = async (values: InventoryInput) => {
      try {
        const endpoint = "/api/admin/inventory";
        const method = isEditMode ? "PATCH" : "POST";

        // 1. Calculate sum of existing bins
        const activeBins = values.bins || [];
        const binTotal = activeBins.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);
        const unassigned = Number(values.quantityOnHand) - binTotal;

        // 2. Locate the designated Bulk/Unassigned sublocation for this warehouse location
        const bulkSublocation = availableSublocations.find(
          (sub) => sub.name.toLowerCase().includes("bulk") || sub.name.toLowerCase().includes("unassigned")
        );

        const finalBins = [...activeBins];

        // 3. If there is remaining unassigned stock and a Bulk zone exists, assign the excess to it
        if (unassigned > 0 && bulkSublocation) {
          const existingBulkIndex = finalBins.findIndex((b) => b.sublocationId === bulkSublocation.id);
          if (existingBulkIndex >= 0) {
            finalBins[existingBulkIndex].quantity += unassigned;
          } else {
            finalBins.push({
              sublocationId: bulkSublocation.id,
              quantity: unassigned,
            });
          }
        }

        // 4. Clean empty/invalid bin rows
        const cleanedValues = {
          ...values,
          bins: finalBins.filter((b) => b.sublocationId && Number(b.quantity) > 0),
        };

        const response = await fetch(endpoint, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cleanedValues),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed stock adjustment process allocation.");
        }

        toast.success(isEditMode ? "Stock Levels Updated" : "Inventory Initialized Successfully");
        router.push("/dashboard/inventory");
        router.refresh();
      } catch (err: any) {
        toast.error("Process Deviation Error", { description: err.message });
      }
    };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-3xl mx-auto p-6 bg-card border rounded-xl shadow-sm space-y-6">
      <FieldGroup className="gap-5">
        <FieldSet>
          <FieldLegend className="flex items-center gap-2">
            <Boxes className="w-4 h-4 text-muted-foreground" />
            {isEditMode ? "Process Stock Level Corrections" : "Initialize Virtual Warehouse Inventory Balance"}
          </FieldLegend>

          

          {/* Core Selectors Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <Field>
              <FieldLabel>Target Stock Product Variant *</FieldLabel>
              <select 
                disabled={isEditMode}
                className="w-full text-xs h-9 rounded-md border border-input bg-transparent px-3 py-1 shadow-sm select-none focus-visible:outline-hidden disabled:opacity-60"
                {...register("productId")}
              >
                <option value="">-- Select SKU Product Line --</option>
                {products.map(p => <option key={p.inflowId} value={p.inflowId}>{p.name}</option>)}
              </select>
              {errors.productId && <span className="text-xs text-destructive">{errors.productId.message}</span>}
            </Field>

            <Field>
              <FieldLabel>Holding Warehouse Facility *</FieldLabel>
              <select
                disabled={isEditMode}
                className="w-full text-xs h-9 rounded-md border border-input bg-transparent px-3 py-1 shadow-sm select-none focus-visible:outline-hidden disabled:opacity-60"
                {...register("locationId")}
              >
                <option value="">-- Select Storage Facility Hub --</option>
                {locations.map(l => <option key={l.inflowId} value={l.inflowId}>{l.name}</option>)}
              </select>
              {errors.locationId && <span className="text-xs text-destructive">{errors.locationId.message}</span>}
            </Field>
          </div>
        </FieldSet>

        {/* Math Variables Configuration Layout Row */}
        <FieldSet className="border-t pt-5">
          <FieldLegend className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Absolute Stock Balancing Metrics</FieldLegend>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
            <Field>
              <FieldLabel>Quantity On Hand (Absolute Volume)</FieldLabel>
              <Input 
                type="number" 
                step="0.0001" 
                min={0}
                placeholder="0.00" 
                {...register("quantityOnHand", { valueAsNumber: true })} 
              />
              {errors.quantityOnHand && (
                <span className="text-[11px] text-destructive font-medium block mt-1 leading-snug">{errors.quantityOnHand.message}</span>
              )}
            </Field>

            <Field>
              <FieldLabel>Quantity Reserved (Committed Lines)</FieldLabel>
              <Input 
                type="number" 
                step="0.0001" 
                min={0}
                placeholder="0.00" 
                {...register("quantityReserved", { valueAsNumber: true })} 
              />
              {errors.quantityReserved && <span className="text-xs text-destructive">{errors.quantityReserved.message}</span>}
            </Field>

            <Field className="opacity-80">
              <FieldLabel className="text-emerald-600 dark:text-emerald-400 font-semibold">Quantity Available (Calculated)</FieldLabel>
              <Input 
                type="number" 
                disabled 
                className="bg-muted font-bold border-emerald-500/20 text-emerald-600 dark:text-emerald-400 disabled:opacity-100" 
                {...register("quantityAvailable", { valueAsNumber: true })} 
              />
            </Field>
          </div>
        </FieldSet>

        {/* Dynamic Nested InventoryBin Storage Allocation Blocks */}
        <FieldSet className="border-t pt-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <FieldLegend className="font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Warehouse className="w-4 h-4" /> <span className="text-xs">Internal Sublocation Bin Allocations</span>
              </FieldLegend>
              <p className="text-[11px] text-muted-foreground mt-0.5">Distribute total stock across active aisles, rows, or picker slots.</p>
            </div>

            
            
            <div className="flex flex-col items-center gap-2 self-start sm:self-auto">
              
              {watchedBins.length > 0 && (
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleDistributeBinsToTotal}
                  className="h-8 text-[11px] text-blue-600 gap-1"
                >
                  <Info className="w-3 h-3" /> Push Bin Sum to On-Hand
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!watchedLocationId}
                onClick={() => append({ sublocationId: "", quantity: 0 })}
                className="h-8 text-xs gap-1.5"
              >
                <Plus className="w-3 h-3" /> Map Storage Bin
              </Button>
            </div>
          </div>

          

          <div className="mt-3 space-y-2 max-h-[260px] overflow-y-auto pr-1">
            <div className="flex items-center justify-between text-xs py-1 px-2 bg-muted/50 rounded-lg border">
              <span className="text-muted-foreground">Bulk / Unassigned Area:</span>
              <span className={`font-semibold ${unassignedQuantity < 0 ? 'text-destructive' : 'text-foreground'}`}>
                {unassignedQuantity.toFixed(4)}
              </span>
            </div>
            {fields.map((field, index) => {
              // 1. Gather all currently selected sublocation IDs across the field array
              const selectedBinIds = watchedBins.map((b) => b?.sublocationId).filter(Boolean);
              
              // 2. Identify what this specific row has selected (if anything)
              const currentSelection = watchedBins[index]?.sublocationId;

              // 3. Filter the global list: must match location, AND must not be taken by another row
              const uniquelyAvailableSublocations = availableSublocations.filter((sub) => {
                const isSelectedByAnotherRow = selectedBinIds.includes(sub.id) && sub.id !== currentSelection;
                return !isSelectedByAnotherRow;
              });

              return (
                <div key={field.id} className="flex items-start gap-3 bg-muted/30 border p-2 rounded-xl relative">
                  
                  {/* Reactive filtered structural list picker */}
                  <div className="flex-1">
                    <select
                      className="w-full text-xs h-9 rounded-md border border-input bg-background px-3 py-1 shadow-sm focus-visible:outline-hidden"
                      {...register(`bins.${index}.sublocationId` as const)}
                    >
                      <option value="">-- Choose Sublocation Slot --</option>
                      {uniquelyAvailableSublocations.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    {errors.bins?.[index]?.sublocationId && (
                      <span className="text-[10px] text-destructive block mt-1">{errors.bins[index].sublocationId.message}</span>
                    )}
                  </div>

                  {/* Specific assigned payload quantity volume input parameter */}
                  <div className="w-44">
                    <Input
                      type="number"
                      step="0.0001"
                      min={0}
                      placeholder="Volume"
                      className="text-xs h-9 bg-background"
                      {...register(`bins.${index}.quantity`, { valueAsNumber: true })}
                    />
                    {errors.bins?.[index]?.quantity && (
                      <span className="text-[10px] text-destructive block mt-1">{errors.bins[index].quantity.message}</span>
                    )}
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                    className="h-9 w-9 text-muted-foreground hover:text-destructive shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}

            {fields.length === 0 && (
              <div className="flex items-center gap-2 border border-dashed rounded-xl p-4 text-xs text-muted-foreground italic bg-muted/10">
                <AlertCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                <span>No specific layout bin tracking points assigned. Stock metrics are recorded as a bulk unassigned pile across this main logistics terminal site.</span>
              </div>
            )}
          </div>
        </FieldSet>

        {/* Controls Actions Row */}
        <div className="flex items-center justify-between gap-4 border-t pt-4">
          <Button type="button" variant="ghost" size="sm" onClick={() => router.back()} className="text-xs gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} size="sm" className="min-w-[140px]">
            {isSubmitting ? "Processing math balances..." : isEditMode ? "Apply Stock Rectification" : "Post Stock Ledger Entry"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}