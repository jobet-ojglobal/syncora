"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface BinDetail {
  id: string;
  sublocationName: string;
  quantity: number;
}

export interface InspectionItem {
  id: string;
  productSlug: string;
  quantityOnHand: number;
  bins: BinDetail[];
}

interface StorageInspectionModalProps {
  item: InspectionItem | null;
  locationName?: string;
  onClose: () => void;
}

export function StorageInspectionModal({
  item,
  locationName = "Location",
  onClose,
}: StorageInspectionModalProps) {
  if (!item) return null;

  const totalBinQty = item.bins.reduce((sum, bin) => sum + bin.quantity, 0);
  const bulkAreaQty = Math.max(0, item.quantityOnHand - totalBinQty);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-card border w-full max-w-md rounded-xl p-5 shadow-lg space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between border-b pb-3">
          <div>
            <h3 className="text-sm font-bold text-foreground">Storage Layout Inspection</h3>
            <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{item.productSlug}</p>
          </div>
          <Badge variant="outline" className="text-[10px] py-0 h-5 border-blue-200 text-blue-600 bg-blue-50">
            {locationName}
          </Badge>
        </div>

        {/* Total Summary Matrix Cards */}
        <div className="grid grid-cols-3 gap-2 bg-muted/40 p-2.5 rounded-lg border text-center">
          <div>
            <span className="text-[10px] text-muted-foreground font-medium block uppercase tracking-wide">
              Total On Hand
            </span>
            <span className="text-xs font-mono font-bold text-foreground">
              {item.quantityOnHand.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 4,
              })}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground font-medium block uppercase tracking-wide">
              In Bins
            </span>
            <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
              {totalBinQty.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 4,
              })}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground font-medium block uppercase tracking-wide">
              Bulk Area
            </span>
            <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
              {bulkAreaQty.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 4,
              })}
            </span>
          </div>
        </div>

        {/* Picking Slots & Bulk Area Detailed Breakdown */}
        <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
          <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1">
            Storage Allocation Breakdown
          </div>

          {/* Bulk Floor Row */}
          <div className="flex items-center justify-between border p-2 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/60 font-medium">
            <span className="text-xs text-amber-900 dark:text-amber-300 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              Bulk Floor / Unassigned Area
            </span>
            <span className="font-mono text-xs text-amber-800 dark:text-amber-400">
              <strong className="text-amber-950 dark:text-amber-200">
                {bulkAreaQty.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 4,
                })}
              </strong>{" "}
              units
            </span>
          </div>

          {/* Assigned Sub-bins Rows */}
          {item.bins.map((bin) => (
            <div
              key={bin.id}
              className="flex items-center justify-between border p-2 rounded-lg bg-muted/30 font-medium"
            >
              <span className="text-xs text-foreground flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                {bin.sublocationName}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                <strong className="text-foreground">
                  {bin.quantity.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 4,
                  })}
                </strong>{" "}
                units
              </span>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-2 border-t">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs px-4"
          >
            Close View
          </Button>
        </div>
      </div>
    </div>
  );
}