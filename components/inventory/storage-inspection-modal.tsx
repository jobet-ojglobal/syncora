"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Image from "next/image";

interface BinDetail {
  id: string;
  sublocationName: string;
  quantity: number;
}

interface Product {
  inflowId: string;
  name: string;
  slug: string;
  sku: string;
  thumbnail: string | null;
  trackSerials: boolean;
}

export interface InspectionItem {
  id: string;
  product: Product;
  locationId: string;
  locationName?: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  quantityInTransit: number;
  bins: BinDetail[];
}

interface StorageInspectionModalProps {
  item: InspectionItem | null;
  locationName?: string;
  onClose: () => void;
}

export function StorageInspectionModalEnhance({
  item,
  locationName = "Location",
  onClose,
}: StorageInspectionModalProps) {
  if (!item) return null;

  const formatNumber = (num: number) =>
    num.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 4,
    });

  const totalBinQty = item.bins.reduce((sum, bin) => sum + bin.quantity, 0);
  const bulkAreaQty = Math.max(0, item.quantityOnHand - totalBinQty);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-card border w-full max-w-lg rounded-xl p-5 shadow-lg space-y-4 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b pb-3">
          <div className="flex items-center gap-3">
            {item.product.thumbnail ? (
              <Image
                src={item.product.thumbnail}
                alt={item.product.name}
                width={40}
                height={40}
                className="w-10 h-10 object-cover rounded-md border"
              />
            ) : (
              <div className="w-10 h-10 rounded-md border bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                N/A
              </div>
            )}
            <div>
              <h3 className="text-sm font-bold text-foreground">
                {item.product.name}
              </h3>
              <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                SKU: {item.product.sku}
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className="text-[10px] py-0 h-5 border-blue-200 text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
          >
            {item.locationName || locationName}
          </Badge>
        </div>

        {/* 4-Column Metric Cards */}
        <div className="grid grid-cols-4 gap-2 bg-muted/40 p-2.5 rounded-lg border text-center">
          <div>
            <span className="text-[9px] text-muted-foreground font-medium block uppercase tracking-wide">
              On Hand
            </span>
            <span className="text-xs font-mono font-bold text-foreground">
              {formatNumber(item.quantityOnHand)}
            </span>
          </div>
          <div>
            <span className="text-[9px] text-muted-foreground font-medium block uppercase tracking-wide">
              Reserved
            </span>
            <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
              {formatNumber(item.quantityReserved)}
            </span>
          </div>
          <div>
            <span className="text-[9px] text-muted-foreground font-medium block uppercase tracking-wide">
              Available
            </span>
            <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {formatNumber(item.quantityAvailable)}
            </span>
          </div>
          <div>
            <span className="text-[9px] text-muted-foreground font-medium block uppercase tracking-wide">
              In Transit
            </span>
            <span className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400">
              {formatNumber(item.quantityInTransit)}
            </span>
          </div>
        </div>

        {/* Detailed Breakdown */}
        <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
          <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1">
            Storage Allocation & Status Breakdown
          </div>

          {/* Bulk Area Row */}
          <div className="flex items-center justify-between border p-2 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/60 font-medium">
            <span className="text-xs text-amber-900 dark:text-amber-300 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              Bulk Floor / Unassigned Area
            </span>
            <span className="font-mono text-xs text-amber-800 dark:text-amber-400">
              <strong className="text-amber-950 dark:text-amber-200">
                {formatNumber(bulkAreaQty)}
              </strong>{" "}
              units
            </span>
          </div>

          {/* Assigned Sub-bins */}
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
                  {formatNumber(bin.quantity)}
                </strong>{" "}
                units
              </span>
            </div>
          ))}

          {/* Reserved Stock Info Row */}
          {item.quantityReserved > 0 && (
            <div className="flex items-center justify-between border p-2 rounded-lg bg-red-50/50 dark:bg-red-950/20 border-red-200/60 font-medium">
              <span className="text-xs text-red-900 dark:text-red-300 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                Committed / Reserved
              </span>
              <span className="font-mono text-xs text-red-800 dark:text-red-400">
                <strong>{formatNumber(item.quantityReserved)}</strong> units
              </span>
            </div>
          )}

          {/* In-Transit Stock Info Row */}
          {item.quantityInTransit > 0 && (
            <div className="flex items-center justify-between border p-2 rounded-lg bg-purple-50/50 dark:bg-purple-950/20 border-purple-200/60 font-medium">
              <span className="text-xs text-purple-900 dark:text-purple-300 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                In Transit (Incoming/Outgoing)
              </span>
              <span className="font-mono text-xs text-purple-800 dark:text-purple-400">
                <strong>{formatNumber(item.quantityInTransit)}</strong> units
              </span>
            </div>
          )}
        </div>

        {/* Action Footer */}
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
            <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{item.product.slug}</p>
          </div>
          <Badge variant="outline" className="text-[10px] py-0 h-5 border-blue-200 text-blue-600 bg-blue-50">
            {item.locationName || locationName }
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