"use client";

import { useEffect, useMemo, useState } from "react";
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
import { TransferOrderStatus } from "@/generated/prisma/enums";

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
  initialData?: {
    id: string;
    transferNumber: string;
    sourceLocationId: string | null;
    targetLocationId: string | null;
    status: TransferOrderStatus;
    remarks?: string | null;
    lines?: Array<{
      id?: string;
      productId: string;
      sourceSublocationId?: string | null;
      targetSublocationId?: string | null;
      quantity: number | string;
    }>;
  } | null;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function TransferOrderForm({ locations, initialData }: TransferOrderFormProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  const isEditableStatus = initialData ? (initialData.status === "DRAFT" || initialData.status === "PENDING") : true;
  const isFormDisabled = !isEditableStatus;

  const form = useForm<TransferOrderInput>({
    resolver: zodResolver(transferOrderSchema),
    defaultValues: {
      id: initialData?.id || "",
      sourceLocationId: initialData?.sourceLocationId || "",
      targetLocationId: initialData?.targetLocationId || "",
      status: initialData?.status || "DRAFT",
      remarks: initialData?.remarks || "",
      lines:
        initialData?.lines?.map((l) => ({
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
    formState: { errors, isSubmitting },
  } = form;

  const { fields, append, remove } = useFieldArray({ control, name: "lines" });

  const watchedSourceLocId = useWatch({ control, name: "sourceLocationId" });
  const watchedTargetLocId = useWatch({ control, name: "targetLocationId" });

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
      sourceLocationId: initialData.sourceLocationId || "",
      targetLocationId: initialData.targetLocationId || "",
      status: initialData.status || "DRAFT",
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

  // Group fields by productId
  const groupedProducts = useMemo(() => {
    const map = new Map<
      string,
      {
        productId: string;
        indices: number[];
        totalQty: number;
        items: Array<{ fieldIndex: number; line: TransferOrderInput["lines"][number] }>;
      }
    >();

    fields.forEach((field, index) => {
      const line = field as TransferOrderInput["lines"][number];
      const existing = map.get(line.productId);

      if (existing) {
        existing.indices.push(index);
        existing.totalQty += Number(line.quantity) || 0;
        existing.items.push({ fieldIndex: index, line });
      } else {
        map.set(line.productId, {
          productId: line.productId,
          indices: [index],
          totalQty: Number(line.quantity) || 0,
          items: [{ fieldIndex: index, line }],
        });
      }
    });

    return Array.from(map.values());
  }, [fields]);

  const handleRemoveProductGroup = (indices: number[]) => {
    // Remove indices from largest to smallest to keep field index references valid
    const sortedIndices = [...indices].sort((a, b) => b - a);
    sortedIndices.forEach((idx) => remove(idx));
  };

  const editingLineIndex = useMemo(() => {
    if (!editingProductId) return null;
    return fields.findIndex((f) => (f as TransferOrderInput["lines"][number]).productId === editingProductId);
  }, [editingProductId, fields]);

  const onSubmit = async (values: TransferOrderInput) => {
    try {
      const endpoint = values.id ? `/api/admin/transfers/${values.id}` : `/api/admin/transfers`;
      const method = values.id ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Network transaction failed.");
      }

      toast.success("Transfer order saved successfully");
      router.push("/dashboard/transfers");
      router.refresh();
    } catch (err: any) {
      toast.error("Execution Error", { description: err.message || "Failed to save transfer order." });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit, (errors) => console.log("Validation Errors:", errors))} className="w-full space-y-6 bg-card border rounded-xl p-6 shadow-xs relative">
      {isFormDisabled && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded-xl p-3 flex items-center gap-2 text-xs font-medium">
          <Lock className="w-4 h-4 shrink-0" />
          <span>
            Immutable Document: Marked as <strong>{initialData?.status}</strong>. Only entries in <strong>DRAFT</strong> states can be altered.
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
            <p className="text-sm font-mono font-bold text-foreground">{initialData?.transferNumber}</p>
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
                setEditingProductId(null);
                setModalOpen(true);
              }}
              className="h-8 text-xs gap-1"
            >
              {isLoadingMatrix ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Append Product Component
            </Button>
          </div>

          {errors.lines?.root && <p className="text-xs font-semibold text-destructive mb-2">{errors.lines.root.message}</p>}

          <div className="border rounded-xl overflow-hidden bg-background">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                  <th className="p-3">Product SKU Info</th>
                  <th className="p-3">Source Bin Route(s)</th>
                  <th className="p-3">Target Bin Route</th>
                  <th className="p-3 text-right">Total Qty</th>
                  <th className="p-3 text-center w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y text-xs">
                {groupedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground font-medium">
                      No product component tracks assigned to this cargo manifest layout yet.
                    </td>
                  </tr>
                ) : (
                  groupedProducts.map((group) => {
                    const matchedMatrix = productMatrix.find((item) => item.product.inflowId === group.productId);
                    const prodName = matchedMatrix?.product.name || group.productId;
                    const targetSubId = group.items[0]?.line.targetSublocationId;
                    const tgtBinName =
                      sublocations.find((s) => s.id === targetSubId)?.name || "Floor / Bulk Area";

                    return (
                      <tr key={group.productId} className="hover:bg-muted/10 align-top">
                        <td className="p-3 font-medium text-foreground">
                          <div>{prodName}</div>
                          {group.items.length > 1 && (
                            <span className="inline-block mt-0.5 text-[10px] text-amber-600 font-semibold bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                              Multi-Bin Split ({group.items.length} sources)
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-muted-foreground font-mono">
                          <div className="space-y-1">
                            {group.items.map((item, idx) => {
                              const binName =
                                sublocations.find((s) => s.id === item.line.sourceSublocationId)?.name ||
                                "Floor / Bulk Area";
                              return (
                                <div key={idx} className="flex items-center gap-2">
                                  <span>• {binName}</span>
                                  <span className="text-[11px] font-bold text-foreground">({item.line.quantity})</span>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                        <td className="p-3 text-muted-foreground font-mono">{tgtBinName}</td>
                        <td className="p-3 text-right font-bold font-mono text-sm">{group.totalQty}</td>
                        <td className="p-3 flex items-center justify-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={isFormDisabled}
                            onClick={() => {
                              setEditingProductId(group.productId);
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
                            onClick={() => handleRemoveProductGroup(group.indices)}
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
            setEditingProductId(null);
          }}
          productMatrix={productMatrix}
          sublocations={sublocations}
          sourceLocationId={watchedSourceLocId}
          targetLocationId={watchedTargetLocId}
          existingLines={fields as unknown as TransferOrderInput["lines"]}
          editingLineIndex={editingLineIndex}
          onSave={(data) => {
            const newLines = Array.isArray(data) ? data : [data];

            if (editingProductId) {
              // Remove all existing lines for this product, then append updated allocations
              const indicesToRemove = fields
                .map((f, idx) => ((f as TransferOrderInput["lines"][number]).productId === editingProductId ? idx : -1))
                .filter((idx) => idx !== -1)
                .sort((a, b) => b - a);

              indicesToRemove.forEach((idx) => remove(idx));
              newLines.forEach((item) => append(item));
            } else {
              newLines.forEach((item) => append(item));
            }

            setModalOpen(false);
            setEditingProductId(null);
          }}
        />
      )}
    </form>
  );
}