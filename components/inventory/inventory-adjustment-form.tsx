"use client";

import { useState, useRef, useEffect } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  inventoryAdjustmentSchema,
  InventoryAdjustmentInput,
  AdjustmentLineInput,
} from "@/schemas/inventory.adjustment.schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Edit3, ArrowLeft, Warehouse, Scale, TrendingUp, TrendingDown, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { AdjustmentLineModal } from "./adjustment-line-modal";

interface SelectionOption {
  id: string;
  name: string;
}

interface ProductOption extends SelectionOption {
  currentQuantity: number;
}

interface SublocationOption {
  id: string;
  name: string;
  locationId: string;
}

interface InventoryAdjustmentFormProps {
  locations: SelectionOption[];
  products: ProductOption[];
  sublocations: SublocationOption[];
  initialData?: InventoryAdjustmentInput | null;
}

export function InventoryAdjustmentForm({
  locations,
  products,
  sublocations,
  initialData,
}: InventoryAdjustmentFormProps) {
  const router = useRouter();
  const isEditMode = !!initialData;
  const [modalOpen, setModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const form = useForm<InventoryAdjustmentInput>({
    resolver: zodResolver(inventoryAdjustmentSchema),
    defaultValues: {
      id: initialData?.id,
      locationId: initialData?.locationId || "",
      reason: initialData?.reason || "DISCREPANCY_FOUND",
      remarks: initialData?.remarks || "",
      lines: initialData?.lines || [],
    },
  });

  const {
    register,
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = form;

  const { fields, append, remove, update } = useFieldArray({
    control,
    name: "lines",
  });

  const watchedLocationId = useWatch({ control, name: "locationId" });
  const watchedReason = useWatch({ control, name: "reason" });
  const watchedLines = useWatch({ control, name: "lines" }) || [];
  const isFirstRender = useRef(true);

  // Clear lines if warehouse changed mid-session
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!isEditMode) {
      setValue("lines", []);
    }
  }, [watchedLocationId, setValue, isEditMode]);

  // Aggregate metrics
  const totalAdditions = watchedLines
    .filter((line) => (line.delta || 0) > 0)
    .reduce((acc, curr) => acc + curr.delta, 0);

  const totalDeductions = watchedLines
    .filter((line) => (line.delta || 0) < 0)
    .reduce((acc, curr) => acc + Math.abs(curr.delta), 0);

  const handleSaveLine = (lineData: AdjustmentLineInput) => {
    if (editingIndex !== null) {
      update(editingIndex, lineData);
    } else {
      append(lineData);
    }
    setEditingIndex(null);
  };

  const handleOpenEdit = (index: number) => {
    setEditingIndex(index);
    setModalOpen(true);
  };

  const onSubmit = async (values: InventoryAdjustmentInput) => {
    try {
      const endpoint = "/api/admin/inventory/adjust";
      const method = isEditMode ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit inventory adjustment.");
      }

      toast.success(isEditMode ? "Adjustment record updated" : "Inventory adjustment applied successfully");
      router.push("/dashboard/inventory");
      router.refresh();
    } catch (err: any) {
      toast.error("Execution Error", { description: err.message });
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              {isEditMode ? "Edit Inventory Adjustment" : "New Inventory Adjustment"}
            </h1>
            <p className="text-xs text-muted-foreground">
              Reconcile physical counts, damage, or stock discrepancies.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Top Configuration Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Warehouse className="w-4 h-4 text-primary" /> Location & Context
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Warehouse Selector */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Target Warehouse / Location</label>
              <Select
                value={watchedLocationId || ""}
                onValueChange={(val) => setValue("locationId", val, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.locationId && <p className="text-xs text-destructive">{errors.locationId.message}</p>}
            </div>

            {/* Adjustment Reason */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Primary Reason</label>
              <Select
                value={watchedReason || "DISCREPANCY_FOUND"}
                onValueChange={(val: any) => setValue("reason", val, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DISCREPANCY_FOUND">Discrepancy Found</SelectItem>
                  <SelectItem value="CYCLE_COUNT_RECOUNT">Cycle Count Recount</SelectItem>
                  <SelectItem value="DAMAGED_EXPIRED">Damaged / Expired Stock</SelectItem>
                  <SelectItem value="THEFT_LOSS">Theft / Loss</SelectItem>
                  <SelectItem value="INVENTORY_FOUND">Unregistered Inventory Found</SelectItem>
                  <SelectItem value="OTHER">Other / Miscellaneous</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Aggregate Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Items Changed</p>
                <p className="text-2xl font-bold">{fields.length}</p>
              </div>
              <Scale className="w-8 h-8 text-muted-foreground/30" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total Added Units</p>
                <p className="text-2xl font-bold text-emerald-600">+{totalAdditions}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-emerald-500/20" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total Deducted Units</p>
                <p className="text-2xl font-bold text-destructive">-{totalDeductions}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-destructive/20" />
            </CardContent>
          </Card>
        </div>

        {/* Adjustment Line Items Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold">Adjustment Lines</CardTitle>
            <Button
              type="button"
              size="sm"
              disabled={!watchedLocationId}
              onClick={() => {
                setEditingIndex(null);
                setModalOpen(true);
              }}
              className="gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add Item
            </Button>
          </CardHeader>
          <CardContent>
            {errors.lines && typeof errors.lines.message === "string" && (
              <p className="text-xs text-destructive mb-3">{errors.lines.message}</p>
            )}

            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Sublocation</TableHead>
                    <TableHead className="text-right">System Stock</TableHead>
                    <TableHead className="text-right">New Count</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="w-[80px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-xs">
                        No lines added yet. Click &quot;Add Item&quot; to begin stock adjustment.
                      </TableCell>
                    </TableRow>
                  ) : (
                    fields.map((field, index) => {
                      const delta = field.adjustedQuantity - field.currentQuantity;
                      return (
                        <TableRow key={field.id}>
                          <TableCell className="font-medium text-xs">
                            {field.productName || field.productId}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {field.sublocationName || "Bulk Area"}
                          </TableCell>
                          <TableCell className="text-right text-xs">{field.currentQuantity}</TableCell>
                          <TableCell className="text-right text-xs font-semibold">{field.adjustedQuantity}</TableCell>
                          <TableCell className="text-right text-xs">
                            <Badge
                              variant={delta > 0 ? "default" : delta < 0 ? "destructive" : "secondary"}
                              className="text-[10px] px-2 py-0.5"
                            >
                              {delta > 0 ? `+${delta}` : delta}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                            {field.reasonNote || "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleOpenEdit(index)}
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => remove(index)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Global Remarks */}
        <Card>
          <CardContent className="pt-4 space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">General Remarks / References</label>
            <Textarea
              placeholder="e.g. Approved during quarterly physical audit, reference PO #1042"
              rows={3}
              {...register("remarks")}
            />
            {errors.remarks && <p className="text-xs text-destructive">{errors.remarks.message}</p>}
          </CardContent>
        </Card>

        {/* Form Controls */}
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {isSubmitting ? "Processing..." : isEditMode ? "Update Adjustment" : "Apply Adjustment"}
          </Button>
        </div>
      </form>

      {/* Modal Dialog for Items */}
      <AdjustmentLineModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        products={products}
        sublocations={sublocations}
        selectedLocationId={watchedLocationId}
        initialData={editingIndex !== null ? fields[editingIndex] : null}
        onSave={handleSaveLine}
      />
    </div>
  );
}