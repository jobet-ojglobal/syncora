"use client";

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { adjustmentLineSchema, AdjustmentLineInput } from "@/schemas/inventory.adjustment.schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownRight, Equal } from "lucide-react";

interface ProductOption {
  id: string;
  name: string;
  sku?: string;
  currentQuantity: number;
}

interface SublocationOption {
  id: string;
  name: string;
  locationId: string;
}

interface LineModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: ProductOption[];
  sublocations: SublocationOption[];
  selectedLocationId: string;
  initialData?: AdjustmentLineInput | null;
  onSave: (data: AdjustmentLineInput) => void;
}

export function AdjustmentLineModal({
  open,
  onOpenChange,
  products,
  sublocations,
  selectedLocationId,
  initialData,
  onSave,
}: LineModalProps) {
  const form = useForm<AdjustmentLineInput>({
    resolver: zodResolver(adjustmentLineSchema),
    defaultValues: {
      productId: "",
      sublocationId: "",
      currentQuantity: 0,
      adjustedQuantity: 0,
      delta: 0,
      reasonNote: "",
    },
  });

  const { register, handleSubmit, setValue, reset, control, formState: { errors } } = form;

  const watchedProductId = useWatch({ control, name: "productId" });
  const watchedCurrentQty = useWatch({ control, name: "currentQuantity" }) || 0;
  const watchedAdjustedQty = useWatch({ control, name: "adjustedQuantity" }) || 0;

  // Filter sublocations for current warehouse
  const filteredSublocations = sublocations.filter(
    (sub) => sub.locationId === selectedLocationId
  );

  // Auto populate stock on product selection
  useEffect(() => {
    if (watchedProductId && !initialData) {
      const prod = products.find((p) => p.id === watchedProductId);
      if (prod) {
        setValue("productName", prod.name);
        setValue("currentQuantity", prod.currentQuantity);
        setValue("adjustedQuantity", prod.currentQuantity);
        setValue("delta", 0);
      }
    }
  }, [watchedProductId, products, setValue, initialData]);

  // Recalculate delta variance on adjusted quantity change
  useEffect(() => {
    const current = Number(watchedCurrentQty) || 0;
    const adjusted = Number(watchedAdjustedQty) || 0;
    setValue("delta", adjusted - current);
  }, [watchedCurrentQty, watchedAdjustedQty, setValue]);

  useEffect(() => {
    if (open) {
      if (initialData) {
        reset(initialData);
      } else {
        reset({
          productId: "",
          sublocationId: "",
          currentQuantity: 0,
          adjustedQuantity: 0,
          delta: 0,
          reasonNote: "",
        });
      }
    }
  }, [open, initialData, reset]);

  const onSubmit = (data: AdjustmentLineInput) => {
    const selectedProd = products.find((p) => p.id === data.productId);
    const selectedSub = sublocations.find((s) => s.id === data.sublocationId);

    onSave({
      ...data,
      productName: selectedProd?.name || data.productName,
      sublocationName: selectedSub?.name || "",
      delta: Number(data.adjustedQuantity) - Number(data.currentQuantity),
    });
    onOpenChange(false);
  };

  const delta = watchedAdjustedQty - watchedCurrentQty;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Line Item" : "Add Line Adjustment"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {/* Product Picker */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Product</label>
            <Select
              value={watchedProductId || ""}
              onValueChange={(val) => setValue("productId", val, { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((prod) => (
                  <SelectItem key={prod.id} value={prod.id}>
                    {prod.name} (In stock: {prod.currentQuantity})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.productId && <p className="text-xs text-destructive">{errors.productId.message}</p>}
          </div>

          {/* Sublocation / Bin Selection */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Sublocation / Bin Area (Optional)</label>
            <Select
              value={useWatch({ control, name: "sublocationId" }) || "bulk"}
              onValueChange={(val) => setValue("sublocationId", val === "bulk" ? "" : val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Area / Bin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bulk">Bulk / Unassigned Area</SelectItem>
                {filteredSublocations.map((sub) => (
                  <SelectItem key={sub.id} value={sub.id}>
                    {sub.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quantity Controls & Variance */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Current Stock</label>
              <Input type="number" readOnly className="bg-muted text-muted-foreground font-medium" {...register("currentQuantity", { valueAsNumber: true })} />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">New Counted Stock</label>
              <Input type="number" min="0" {...register("adjustedQuantity", { valueAsNumber: true })} />
              {errors.adjustedQuantity && <p className="text-xs text-destructive">{errors.adjustedQuantity.message}</p>}
            </div>
          </div>

          {/* Computed Variance Delta */}
          <div className="p-3 bg-muted/40 rounded-lg border flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Variance Delta:</span>
            <div className="flex items-center gap-2">
              <Badge variant={delta > 0 ? "default" : delta < 0 ? "destructive" : "secondary"} className="gap-1 px-2.5 py-1">
                {delta > 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : delta < 0 ? <ArrowDownRight className="w-3.5 h-3.5" /> : <Equal className="w-3.5 h-3.5" />}
                {delta > 0 ? `+${delta}` : delta}
              </Badge>
            </div>
          </div>

          {/* Line Notes */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Item Level Note (Optional)</label>
            <Input placeholder="e.g. Found on rack B3, expired box" {...register("reasonNote")} />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{initialData ? "Update Line" : "Add Line"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}