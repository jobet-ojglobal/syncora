// components/TransferOrderForm.tsx
"use client";

import { useEffect } from "react";
import { useForm, useFieldArray, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { transferOrderSchema, TransferOrderInput } from "@/schemas/transfer.schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus, ArrowLeft, MoveHorizontal, Warehouse, Package, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";

interface LookupItem {
  inflowId: string;
  name: string;
}

interface SublocationLookup {
  id: string;
  name: string;
  locationId: string; // Used to filter matches reactively
}

interface TransferOrderFormProps {
  locations: LookupItem[];
  products: LookupItem[];
  sublocations: SublocationLookup[];
  initialData?: any | null;
}

export function TransferOrderForm({ locations, products, sublocations, initialData }: TransferOrderFormProps) {
  const router = useRouter();
  const isEditMode = !!initialData;

  const form = useForm<TransferOrderInput>({
    resolver: zodResolver(transferOrderSchema),
    defaultValues: {
      id: initialData?.id,
      transferNumber: initialData?.transferNumber || `TO-UUID`,
      sourceLocationId: initialData?.sourceLocationId || "",
      targetLocationId: initialData?.targetLocationId || "",
      status: initialData?.status || "DRAFT",
      remarks: initialData?.remarks || "",
      lines: initialData?.lines?.map((l: any) => ({
        id: l.id,
        productId: l.productId,
        sourceSublocationId: l.sourceSublocationId || "",
        targetSublocationId: l.targetSublocationId || "",
        quantity: Number(l.quantity)
      })) || [{ productId: "", sourceSublocationId: "", targetSublocationId: "", quantity: 1 }],
    },
  });

  const { register, control, handleSubmit, setValue, formState: { errors, isSubmitting } } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "lines",
  });

  // 👁️ Watch root location parameters to contextualize picking dropdown options
  const watchedSourceLocId = useWatch({ control, name: "sourceLocationId" });
  const watchedTargetLocId = useWatch({ control, name: "targetLocationId" });

  // Filter sublocations down relative to the chosen warehouse source vs target keys
  const departureSublocations = sublocations.filter(sub => sub.locationId === watchedSourceLocId);
  const arrivalSublocations = sublocations.filter(sub => sub.locationId === watchedTargetLocId);

  // Auto-clear sublocation selection strings if an operator switches the parent facilities mid-edit
  useEffect(() => {
    if (!isEditMode) {
      setValue("lines", form.getValues("lines").map(line => ({
        ...line,
        sourceSublocationId: "",
        targetSublocationId: ""
      })));
    }
  }, [watchedSourceLocId, watchedTargetLocId, setValue, isEditMode, form]);

  const onSubmit = async (values: TransferOrderInput) => {
    try {
      const endpoint = "/api/admin/transfers";
      const method = isEditMode ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Network processing exception formulating stock routing.");
      }

      toast.success(isEditMode ? "Transfer updated successfully" : "Transfer order registered");
      router.push("/dashboard/transfers");
      router.refresh();
    } catch (err: any) {
      toast.error("Execution Error", { description: err.message });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-5xl mx-auto p-6 bg-card border rounded-xl shadow-xs space-y-6">
      <FieldGroup className="gap-6">
        
        {/* SECTION 1: Master Order Header Info */}
        <FieldSet className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FieldLegend className="col-span-1 md:col-span-3 flex items-center gap-2 border-b pb-2">
            <ArrowRightLeft className="w-4 h-4 text-primary" /> Stock Relocation Dispatch Header
          </FieldLegend>

          <Field>
            <FieldLabel>Transfer Tracking Number *</FieldLabel>
            <Input placeholder="TO-XXXXXX" {...register("transferNumber")} />
            {errors.transferNumber && <span className="text-xs text-destructive">{errors.transferNumber.message}</span>}
          </Field>

          <Field>
            <FieldLabel>Processing Stage Status</FieldLabel>
            <select className="w-full text-xs h-9 rounded-md border border-input bg-background px-3" {...register("status")}>
              <option value="DRAFT">Draft</option>
              <option value="PENDING">Pending Approval</option>
              <option value="IN_TRANSIT">In Transit / Shipped</option>
              <option value="RECEIVED">Received & Stocked</option>
              <option value="CANCELLED">Void / Cancelled</option>
            </select>
          </Field>

          {/* Logistics Terminals Routing Pair Selectors */}
          <div className="col-span-1 md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/20 border rounded-xl relative">
            <Field>
              <FieldLabel className="text-amber-600 font-semibold flex items-center gap-1">
                <Warehouse className="w-3.5 h-3.5" /> Departure Source Facility *
              </FieldLabel>
              <select className="w-full text-xs h-9 rounded-md border border-input bg-background px-3 shadow-xs" {...register("sourceLocationId")}>
                <option value="">-- Choose Origin Depot Site --</option>
                {locations.map(loc => <option key={loc.inflowId} value={loc.inflowId}>{loc.name}</option>)}
              </select>
              {errors.sourceLocationId && <span className="text-xs text-destructive">{errors.sourceLocationId.message}</span>}
            </Field>

            <Field>
              <FieldLabel className="text-blue-600 font-semibold flex items-center gap-1">
                <Warehouse className="w-3.5 h-3.5" /> Arrival Target Destination *
              </FieldLabel>
              <select className="w-full text-xs h-9 rounded-md border border-input bg-background px-3 shadow-xs" {...register("targetLocationId")}>
                <option value="">-- Choose Destination Terminal Hub --</option>
                {locations.map(loc => <option key={loc.inflowId} value={loc.inflowId}>{loc.name}</option>)}
              </select>
              {errors.targetLocationId && <span className="text-xs text-destructive">{errors.targetLocationId.message}</span>}
            </Field>
          </div>

          <Field className="md:col-span-3">
            <FieldLabel>Consignment Delivery Remarks / Carrier Manifest Notes</FieldLabel>
            <Textarea placeholder="Detail specific freight forwarder info, tracking URLs or load dimensions restrictions..." rows={2} {...register("remarks")} />
          </Field>
        </FieldSet>

        {/* SECTION 2: Dynamic Multi-Line Relocation Items Matrix Grid */}
        <FieldSet className="border-t pt-4">
          <div className="flex items-center justify-between border-b pb-2 mb-4">
            <FieldLegend className="flex items-center gap-2">
              <Package className="w-4 h-4 text-muted-foreground" /> Consignment Product Line Components
            </FieldLegend>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!watchedSourceLocId || !watchedTargetLocId}
              onClick={() => append({ productId: "", sourceSublocationId: "", targetSublocationId: "", quantity: 1 })}
              className="h-8 text-xs gap-1"
            >
              <Plus className="w-3 h-3" /> Insert Product Line
            </Button>
          </div>

          {errors.lines?.root && (
            <p className="text-xs font-semibold text-destructive mb-3">{errors.lines.root.message}</p>
          )}

          {/* Table Headers */}
          <div className="hidden md:grid grid-cols-12 gap-3 px-2 mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <div className="col-span-4">Product SKU Specification *</div>
            <div className="col-span-3">Source Bin / Zone</div>
            <div className="col-span-3">Target Bin / Zone</div>
            <div className="col-span-1 text-right">Qty *</div>
            <div className="col-span-1 text-right">Drop</div>
          </div>

          {/* Rows Content mapping loop */}
          <div className="space-y-3 md:space-y-2 max-h-[360px] overflow-y-auto pr-1">
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-muted/30 md:bg-transparent p-3 md:p-0 border md:border-0 rounded-xl md:rounded-none relative items-start">
                
                {/* Product Choice Dropdown */}
                <div className="col-span-1 md:col-span-4">
                  <select
                    className="w-full text-xs h-9 rounded-md border border-input bg-background px-2"
                    {...register(`lines.${index}.productId` as const)}
                  >
                    <option value="">-- Choose SKU --</option>
                    {products.map(p => <option key={p.inflowId} value={p.inflowId}>{p.name}</option>)}
                  </select>
                  {errors.lines?.[index]?.productId && (
                    <span className="text-[10px] text-destructive mt-0.5 block">{errors.lines[index].productId?.message}</span>
                  )}
                </div>

                {/* Source Bin Choice Selectors */}
                <div className="col-span-1 md:col-span-3">
                  <select
                    className="w-full text-xs h-9 rounded-md border border-input bg-background px-2 disabled:opacity-50"
                    disabled={!watchedSourceLocId}
                    {...register(`lines.${index}.sourceSublocationId` as const)}
                  >
                    <option value="">Floor / Bulk Area</option>
                    {departureSublocations.map(sub => (
                      <option key={sub.id} value={sub.id}>{sub.name}</option>
                    ))}
                  </select>
                </div>

                {/* Target Bin Choice Selectors */}
                <div className="col-span-1 md:col-span-3">
                  <select
                    className="w-full text-xs h-9 rounded-md border border-input bg-background px-2 disabled:opacity-50"
                    disabled={!watchedTargetLocId}
                    {...register(`lines.${index}.targetSublocationId` as const)}
                  >
                    <option value="">Floor / Bulk Area</option>
                    {arrivalSublocations.map(sub => (
                      <option key={sub.id} value={sub.id}>{sub.name}</option>
                    ))}
                  </select>
                </div>

                {/* Relocation Volume Quantity Input Parameters */}
                <div className="col-span-1 md:col-span-1">
                  <Input
                    type="number"
                    step="0.0001"
                    placeholder="1"
                    className="text-xs h-9 text-right"
                    {...register(`lines.${index}.quantity`, { valueAsNumber: true })}
                  />
                  {errors.lines?.[index]?.quantity && (
                    <span className="text-[10px] text-destructive text-right mt-0.5 block">{errors.lines[index].quantity?.message}</span>
                  )}
                </div>

                {/* Delete Row Button */}
                <div className="col-span-1 md:col-span-1 text-right self-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={fields.length === 1}
                    onClick={() => remove(index)}
                    className="h-9 w-9 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

              </div>
            ))}

            {!watchedSourceLocId || !watchedTargetLocId ? (
              <div className="text-center py-8 text-xs border-2 border-dashed bg-muted/10 text-muted-foreground rounded-xl font-medium">
                Please set the Source and Target Facility nodes above before appending inventory dispatch lines.
              </div>
            ) : null}
          </div>
        </FieldSet>

        {/* Form CTAs Footer Control Block */}
        <div className="flex items-center justify-between gap-4 border-t pt-4">
          <Button type="button" variant="ghost" size="sm" onClick={() => router.back()} className="text-xs gap-1.5">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <Button type="submit" disabled={isSubmitting} size="sm" className="min-w-[150px]">
            {isSubmitting ? "Processing stock routes..." : isEditMode ? "Save Order Adjustments" : "Post Stock Transfer Order"}
          </Button>
        </div>

      </FieldGroup>
    </form>
  );
}