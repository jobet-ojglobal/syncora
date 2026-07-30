"use client";

import { useState, useTransition } from "react";
import { Sliders, Loader2 } from "lucide-react";
import { adjustStockAction } from "@/actions/inventory-actions";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";

interface BinOption {
  id: string;
  sublocation: {
    name: string;
  };
  quantity: number; 
}

interface AdjustStockDialogProps {
  inventoryId: string;
  currentOnHand: number;
  bins: BinOption[];
}

export function AdjustStockDialog({
  inventoryId,
  currentOnHand,
  bins,
}: AdjustStockDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [adjustmentType, setAdjustmentType] = useState<"DELTA" | "SET">("DELTA");
  const [quantity, setQuantity] = useState<string>("0");
  const [selectedBinId, setSelectedBinId] = useState<string>("none");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const parsedQty = parseFloat(quantity) || 0;
  const newOnHand =
    adjustmentType === "SET" ? parsedQty : currentOnHand + parsedQty;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!reason.trim()) {
      setError("Please provide a reason for this stock adjustment.");
      return;
    }

    startTransition(async () => {
      const res = await adjustStockAction({
        inventoryId,
        adjustmentType,
        quantity: parsedQty,
        inventoryBinId: selectedBinId === "none" ? null : selectedBinId,
        reason,
      });

      if (!res.success) {
        // if (res.error?._form) {
        //   setError(res.error._form[0]);
        // } else {
        //   setError("An unexpected error occurred.");
        // }
      } else {
        setOpen(false);
        // Reset form
        setQuantity("0");
        setReason("");
        setSelectedBinId("none");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Sliders className="h-4 w-4 mr-2" />
          Adjust Stock
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Adjust Stock Quantity</DialogTitle>
            <DialogDescription>
              Record manual stock corrections, breakage, or inventory count differences.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {error && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive font-medium">
                {error}
              </div>
            )}

            {/* Adjustment Mode */}
            <div className="space-y-2">
              <Label>Adjustment Mode</Label>
              <RadioGroup
                defaultValue="DELTA"
                value={adjustmentType}
                onValueChange={(v) => setAdjustmentType(v as "DELTA" | "SET")}
                className="grid grid-cols-2 gap-4"
              >
                <div>
                  <RadioGroupItem value="DELTA" id="mode-delta" className="peer sr-only" />
                  <Label
                    htmlFor="mode-delta"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer text-xs font-medium"
                  >
                    <span>Relative (+ / -)</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="SET" id="mode-set" className="peer sr-only" />
                  <Label
                    htmlFor="mode-set"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer text-xs font-medium"
                  >
                    <span>Exact New Total</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Quantity Input */}
            <div className="grid grid-cols-2 gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="qty">
                  {adjustmentType === "DELTA" ? "Quantity Change (+/-)" : "New Total Quantity"}
                </Label>
                <Input
                  id="qty"
                  type="number"
                  step="any"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
              </div>

              {/* Calculated Preview */}
              <div className="rounded-lg bg-muted/60 p-3 text-xs space-y-1">
                <div className="text-muted-foreground">Current: <span className="font-semibold text-foreground">{currentOnHand}</span></div>
                <div className="text-muted-foreground">New Total: <span className="font-bold text-primary">{newOnHand}</span></div>
              </div>
            </div>

            {/* Optional Bin Assignment */}
            {bins.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="bin">Target Bin (Optional)</Label>
                <Select value={selectedBinId} onValueChange={setSelectedBinId}>
                  <SelectTrigger id="bin">
                    <SelectValue placeholder="Select sublocation bin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned / Floor Stock</SelectItem>
                    {bins.map((bin) => (
                      <SelectItem key={bin.id} value={bin.id}>
                        {bin.sublocation.name} (Qty: {Number(bin.quantity)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">Reason / Notes</Label>
              <Textarea
                id="reason"
                placeholder="e.g. Annual audit count, damaged in transit, shrinkage..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit Adjustment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}