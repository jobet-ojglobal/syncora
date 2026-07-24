"use client";

import { useEffect, useRef, useState } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { transferOrderSchema, TransferOrderInput } from "@/schemas/transfer.schema";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus, ArrowLeft, Warehouse, Package, Lock, FileText, Edit3, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { ProductLineModal, ProductMatrixItem } from "./product-lines-modal";
import useSWR from "swr";

export interface LookupItem {
  inflowId: string;
  name: string;
}

export interface SublocationLookup {
  id: string;
  name: string;
  locationId: string;
}

interface TransferOrderFormProps {
  locations: LookupItem[];
  initialData: {
    id: string;
    transferNumber: string;
    sourceLocationId: string | null;
    targetLocationId: string | null;
    status: string;
    remarks?: string | null;
    lines?: Array<{
      id?: string;
      productId: string;
      sourceSublocationId?: string | null;
      targetSublocationId?: string | null;
      quantity: number | string;
    }>;
  };
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function TransferOrderForm({ locations, initialData }: TransferOrderFormProps) {
  const router = useRouter();
  const isFormDisabled = initialData.status !== "DRAFT";
  const [modalOpen, setModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const form = useForm<TransferOrderInput>({
    resolver: zodResolver(transferOrderSchema),
    defaultValues: {
      id: initialData.id,
      transferNumber: initialData.transferNumber,
      sourceLocationId: initialData.sourceLocationId || "",
      targetLocationId: initialData.targetLocationId || "",
      status: initialData.status as any,
      remarks: initialData.remarks || "",
      lines:
        initialData.lines?.map((l) => ({
          id: l.id,
          productId: l.productId,
          sourceSublocationId: l.sourceSublocationId || "",
          targetSublocationId: l.targetSublocationId || "",
          quantity: Number(l.quantity),
        })) || [],
    },
  });

  const {
    register,
    reset,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = form;

  const { fields, append, remove, update } = useFieldArray({ control, name: "lines" });

  const watchedSourceLocId = useWatch({ control, name: "sourceLocationId" });
  const watchedTargetLocId = useWatch({ control, name: "targetLocationId" });

  const isFirstRender = useRef(true);

  // Single batch fetch for all products & stock states when locations are selected
  const swrKey = watchedSourceLocId
    ? `/api/admin/transfers/stock-matrix?sourceLocationId=${watchedSourceLocId}&targetLocationId=${watchedTargetLocId || ""}`
    : null;

  const { data: matrixData, isLoading: isLoadingMatrix } = useSWR<{
    matrix: ProductMatrixItem[];
    sublocations: SublocationLookup[];
  }>(swrKey, fetcher, { revalidateOnFocus: false });

  const productMatrix = matrixData?.matrix || [];
  const sublocations = matrixData?.sublocations || [];

  useEffect(() => {
    if (!initialData) return;

    reset({
      id: initialData.id,
      transferNumber: initialData.transferNumber,
      sourceLocationId: initialData.sourceLocationId || "",
      targetLocationId: initialData.targetLocationId || "",
      status: initialData.status as any,
      remarks: initialData.remarks || "",
      lines:
        initialData.lines?.map((l) => ({
          id: l.id,
          productId: l.productId,
          sourceSublocationId: l.sourceSublocationId || "",
          targetSublocationId: l.targetSublocationId || "",
          quantity: Number(l.quantity),
        })) || [],
    });
  }, [initialData, reset]);

  // Clear lines when source or target location changes
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setValue("lines", []);
  }, [watchedSourceLocId, watchedTargetLocId, setValue]);

  const onSubmit = async (values: TransferOrderInput) => {
    try {
      const response = await fetch(`/api/admin/transfers/${values.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) throw new Error("Failed to save transfer order.");

      toast.success("Transfer order saved successfully");
      router.push("/dashboard/transfers");
      router.refresh();
    } catch (err: any) {
      toast.error("Execution Error", { description: err.message });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-6 bg-card border rounded-xl p-6 shadow-xs relative">
      {isFormDisabled && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded-xl p-3 flex items-center gap-2 text-xs font-medium">
          <Lock className="w-4 h-4 shrink-0" />
          <span>
            Immutable Document: Marked as <strong>{initialData.status}</strong>. Only entries in <strong>DRAFT</strong> states can be altered.
          </span>
        </div>
      )}

      <FieldGroup className="gap-6">
        <div className="bg-muted/40 border rounded-lg p-3 flex items-center gap-3">
          <div className="p-2 bg-background border rounded-md text-muted-foreground">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Internal Tracking ID</p>
            <p className="text-sm font-mono font-bold text-foreground">{initialData.transferNumber}</p>
          </div>
        </div>

        <FieldSet className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/20 border rounded-xl">
          <Field>
            <FieldLabel className="text-amber-600 font-semibold flex items-center gap-1 text-xs">
              <Warehouse className="w-3.5 h-3.5" /> Departure Source Site *
            </FieldLabel>
            <select
              disabled={isFormDisabled || fields.length > 0}
              className="w-full text-xs h-9 rounded-md border border-input bg-background px-3 focus-visible:outline-hidden disabled:opacity-60"
              {...register("sourceLocationId")}
            >
              <option value="">-- Choose Origin Depot Site --</option>
              {locations.map((loc) => (
                <option key={loc.inflowId} value={loc.inflowId}>
                  {loc.name}
                </option>
              ))}
            </select>
            {fields.length > 0 && (
              <span className="text-[10px] text-muted-foreground mt-1 block">Clear line assignments to unlock site changes.</span>
            )}
            {errors.sourceLocationId && <span className="text-xs text-destructive">{errors.sourceLocationId.message}</span>}
          </Field>

          <Field>
            <FieldLabel className="text-blue-600 font-semibold flex items-center gap-1 text-xs">
              <Warehouse className="w-3.5 h-3.5" /> Arrival Target Destination *
            </FieldLabel>
            <select
              disabled={isFormDisabled || fields.length > 0}
              className="w-full text-xs h-9 rounded-md border border-input bg-background px-3 focus-visible:outline-hidden disabled:opacity-60"
              {...register("targetLocationId")}
            >
              <option value="">-- Choose Destination Terminal Hub --</option>
              {locations.map((loc) => (
                <option key={loc.inflowId} value={loc.inflowId}>
                  {loc.name}
                </option>
              ))}
            </select>
            {errors.targetLocationId && <span className="text-xs text-destructive">{errors.targetLocationId.message}</span>}
          </Field>
        </FieldSet>

        <FieldSet className="border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <FieldLegend className="flex items-center gap-2 text-sm font-semibold">
              <Package className="w-4 h-4 text-muted-foreground" /> Consignment Product Components
            </FieldLegend>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!watchedSourceLocId || !watchedTargetLocId || isFormDisabled || isLoadingMatrix}
              onClick={() => {
                setEditingIndex(null);
                setModalOpen(true);
              }}
              className="h-8 text-xs gap-1"
            >
              {isLoadingMatrix ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              Append Product Component
            </Button>
          </div>

          {errors.lines?.root && <p className="text-xs font-semibold text-destructive mb-2">{errors.lines.root.message}</p>}

          <div className="border rounded-xl overflow-hidden bg-background">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                  <th className="p-3">Product SKU Info</th>
                  <th className="p-3">Source Bin Route</th>
                  <th className="p-3">Target Bin Route</th>
                  <th className="p-3 text-right">Quantity</th>
                  <th className="p-3 text-center w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y text-xs">
                {fields.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground font-medium">
                      No product component tracks assigned to this cargo manifest layout yet.
                    </td>
                  </tr>
                ) : (
                  fields.map((field, index) => {
                    const matchedMatrix = productMatrix.find((item) => item.product.inflowId === field.productId);
                    const prodName = matchedMatrix?.product.name || field.productId;
                    const srcBinName =
                      sublocations.find((s) => s.id === field.sourceSublocationId)?.name || "Floor / Bulk Area";
                    const tgtBinName =
                      sublocations.find((s) => s.id === field.targetSublocationId)?.name || "Floor / Bulk Area";

                    return (
                      <tr key={field.id} className="hover:bg-muted/10">
                        <td className="p-3 font-medium text-foreground">{prodName}</td>
                        <td className="p-3 text-muted-foreground font-mono">{srcBinName}</td>
                        <td className="p-3 text-muted-foreground font-mono">{tgtBinName}</td>
                        <td className="p-3 text-right font-bold font-mono">{field.quantity}</td>
                        <td className="p-3 flex items-center justify-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={isFormDisabled}
                            onClick={() => {
                              setEditingIndex(index);
                              setModalOpen(true);
                            }}
                            className="w-7 h-7"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-muted-foreground" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={isFormDisabled}
                            onClick={() => remove(index)}
                            className="w-7 h-7 hover:text-destructive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </FieldSet>

        <Field>
          <FieldLabel className="text-xs">Consignment Delivery Remarks / Carrier Manifest Notes</FieldLabel>
          <Textarea disabled={isFormDisabled} placeholder="Detail specific freight forwarder info..." rows={2} {...register("remarks")} />
        </Field>

        <div className="flex items-center justify-between border-t pt-4">
          <Button type="button" variant="ghost" size="sm" onClick={() => router.back()} className="text-xs gap-1.5">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <Button type="submit" disabled={isSubmitting || isFormDisabled} size="sm" className="min-w-[160px]">
            {isSubmitting ? "Processing Routes..." : "Commit Transfer Changes"}
          </Button>
        </div>
      </FieldGroup>

      {modalOpen && (
        <ProductLineModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditingIndex(null);
          }}
          productMatrix={productMatrix}
          sublocations={sublocations}
          sourceLocationId={watchedSourceLocId}
          targetLocationId={watchedTargetLocId}
          existingLines={fields}
          editingLineIndex={editingIndex}
          onSave={(data) => {
            if (editingIndex !== null) {
              update(editingIndex, data);
            } else {
              if (Array.isArray(data)) {
                data.forEach((item) => append(item));
              } else {
                append(data);
              }
            }
            setModalOpen(false);
            setEditingIndex(null);
          }}
        />
      )}
    </form>
  );
}