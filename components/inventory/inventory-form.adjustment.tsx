// components/InventoryForm.tsx
"use client";

import { useEffect, useMemo } from "react";
import { useForm, useFieldArray, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { adjustmentSchema, AdjustmentInput } from "@/schemas/adjustment.schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Trash2, 
  Plus, 
  ArrowLeft, 
  Boxes, 
  Warehouse, 
  AlertCircle, 
  Info, 
  ClipboardCheck, 
  UserCheck 
} from "lucide-react";
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
  sublocations: SublocationOption[];
  initialData?: any | null;
  currentUser?: { id: string; name: string } | null; // Added to map audit lines accurately
}

export function InventoryForm({ products, locations, sublocations, initialData, currentUser }: InventoryFormProps) {
  const router = useRouter();
  const isEditMode = !!initialData;

  const form = useForm<AdjustmentInput & { reason: string; notes: string; performedById: string }>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: {
      id: initialData?.id,
      productId: initialData?.productId || "",
      locationId: initialData?.locationId || "",
      quantityOnHand: initialData?.quantityOnHand ? Number(initialData.quantityOnHand) : 0,
      quantityReserved: initialData?.quantityReserved ? Number(initialData.quantityReserved) : 0,
      quantityAvailable: initialData?.quantityAvailable ? Number(initialData.quantityAvailable) : 0,
      reason: "MANUAL", // Audit default
      notes: "",
      performedById: currentUser?.id || "usr_system_agent", // Fallback system pointer
      bins: initialData?.bins?.map((b: any) => ({
        id: b.id,
        sublocationId: b.sublocationId,
        quantity: Number(b.quantity)
      })) || [],
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

  // 📊 Calculate core stock availability metrics automatically
  useEffect(() => {
    const computedAvailable = Number(watchedOnHand) - Number(watchedReserved);
    setValue("quantityAvailable", computedAvailable);
  }, [watchedOnHand, watchedReserved, setValue]);

  // 🧮 Sum up sublocation bins to auto-populate absolute total stock values
  const handleDistributeBinsToTotal = () => {
    if (watchedBins.length > 0) {
      const sum = watchedBins.reduce((acc, current) => acc + (Number(current.quantity) || 0), 0);
      setValue("quantityOnHand", sum);
    }
  };

  const unassignedQuantity = useMemo(() => {
    const binTotal = watchedBins.reduce((sum, b) => sum + (Number(b?.quantity) || 0), 0);
    return Number(watchedOnHand) - binTotal;
  }, [watchedOnHand, watchedBins]);

  const onSubmit = async (values: any) => {
    try {
      const endpoint = `/api/admin/inventory/${initialData.id}/adjustment`;
      const method = isEditMode ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed stock adjustment process allocation.");
      }

      toast.success(isEditMode ? "Stock Levels Updated" : "Inventory Initialized Successfully", {
        description: "Balanced logistics records entry allocations committed with structural audit log keys.",
      });

      router.push("/dashboard/inventory");
      router.refresh();
    } catch (err: any) {
      toast.error("Process Deviation Error", { description: err.message });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-3xl mx-auto p-6 bg-card border rounded-xl shadow-xs space-y-6">
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
                className="w-full text-xs h-9 rounded-md border border-input bg-transparent px-3 py-1 shadow-xs select-none focus-visible:outline-hidden disabled:opacity-60"
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
                className="w-full text-xs h-9 rounded-md border border-input bg-transparent px-3 py-1 shadow-xs select-none focus-visible:outline-hidden disabled:opacity-60"
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
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-start gap-3 bg-muted/30 border p-2 rounded-xl relative">
                
                {/* Reactive filtered structural list picker */}
                <div className="flex-1">
                  <select
                    className="w-full text-xs h-9 rounded-md border border-input bg-background px-3 py-1 shadow-xs focus-visible:outline-hidden"
                    {...register(`bins.${index}.sublocationId` as const)}
                  >
                    <option value="">-- Choose Sublocation Slot --</option>
                    {availableSublocations.map(s => (
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
            ))}

            {fields.length === 0 && (
              <div className="flex items-center gap-2 border border-dashed rounded-xl p-4 text-xs text-muted-foreground italic bg-muted/10">
                <AlertCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                <span>No specific layout bin tracking points assigned. Stock metrics are recorded as a bulk unassigned pile across this main logistics terminal site.</span>
              </div>
            )}
          </div>
        </FieldSet>

        {/* 📋 Mandatory Audit & Reconciliation Configuration Panel */}
        <FieldSet className="border-t pt-5 bg-muted/20 p-4 rounded-xl border space-y-4">
          <FieldLegend className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <ClipboardCheck className="w-4 h-4 text-primary" /> Regulatory Stock Verification Logs
          </FieldLegend>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field>
              <FieldLabel>Reason Context Blueprint *</FieldLabel>
              <select
                className="w-full text-xs h-9 rounded-md border border-input bg-background px-3 py-1 shadow-xs focus-visible:outline-hidden"
                {...register("reason")}
              >
                <option value="MANUAL">Manual Stock Count (Reconciliation)</option>
                <option value="STOCK_COUNT">Scheduled Regular Inventory Cycle Audit</option>
                <option value="CORRECTION">Administrative System Record Patch</option>
                <option value="DAMAGE">Physical Asset Waste / Breakage Allocation</option>
                <option value="LOSS">Unexplained Discrepancy Shrinkage</option>
                <option value="THEFT">Security Incident Discrepancy</option>
                <option value="EXPIRED">Perishable Life Out-of-Date Write-off</option>
                <option value="RETURN">Customer Return Restoration</option>
              </select>
            </Field>

            <Field className="opacity-75">
              <FieldLabel className="flex items-center gap-1"><UserCheck className="w-3.5 h-3.5" /> Authorized Auditor Profile</FieldLabel>
              <Input 
                type="text" 
                disabled 
                className="bg-muted text-xs font-medium cursor-not-allowed" 
                value={currentUser?.name || "System Administrative Terminal Agent"} 
              />
              <input type="hidden" {...register("performedById")} />
            </Field>
          </div>

          <Field>
            <FieldLabel>Justification Notes & Operational Description *</FieldLabel>
            <Textarea 
              placeholder="Provide context explaining why these adjustments are being made (e.g. 'Cycle count variance discovery in Aisle B'...)" 
              rows={2} 
              className="bg-background text-xs"
              {...register("notes", { required: "A structural reason note is required for ledger generation validation." })} 
            />
            {errors.notes && <span className="text-xs text-destructive">{errors.notes.message}</span>}
          </Field>
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