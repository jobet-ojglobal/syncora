"use client";

import useSWR from "swr";
import { Package, Layers, AlertTriangle, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface InventorySummaryCardsProps {
  locationId: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function InventorySummaryCards({ locationId }: InventorySummaryCardsProps) {
  // Point SWR to your new dedicated endpoint
  const { data, isLoading, error } = useSWR(
    locationId ? `/api/admin/locations/${locationId}/summary` : null,
    fetcher
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-card border rounded-xl p-4 space-y-3 shadow-xs">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (error || !data?.summary) {
    return null;
  }

  const { totalSKUs, totalOnHand, outOfStockCount } = data.summary;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total SKUs */}
      <div className="bg-card border rounded-xl p-4 shadow-xs flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Total Product Lines
          </p>
          <p className="text-2xl font-bold font-mono tracking-tight text-foreground">
            {totalSKUs.toLocaleString()}
          </p>
          <p className="text-[10px] text-muted-foreground">Active tracked SKUs</p>
        </div>
        <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200/50">
          <Package className="w-5 h-5" />
        </div>
      </div>

      {/* Total On Hand */}
      <div className="bg-card border rounded-xl p-4 shadow-xs flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Total On Hand
          </p>
          <p className="text-2xl font-bold font-mono tracking-tight text-foreground">
            {totalOnHand.toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}
          </p>
          <p className="text-[10px] text-muted-foreground">Physical stock units</p>
        </div>
        <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/50">
          <Layers className="w-5 h-5" />
        </div>
      </div>

      {/* Stockouts */}
      <div className="bg-card border rounded-xl p-4 shadow-xs flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Stockouts
          </p>
          <p className="text-2xl font-bold font-mono tracking-tight text-destructive">
            {outOfStockCount.toLocaleString()}
          </p>
          <p className="text-[10px] text-muted-foreground">Items needing reorder</p>
        </div>
        <div className="w-10 h-10 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-200/50">
          <AlertTriangle className="w-5 h-5" />
        </div>
      </div>

      {/* Availability Ratio */}
      <div className="bg-card border rounded-xl p-4 shadow-xs flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Stock Availability
          </p>
          <p className="text-2xl font-bold font-mono tracking-tight text-foreground">
            {totalSKUs > 0
              ? `${(((totalSKUs - outOfStockCount) / totalSKUs) * 100).toFixed(1)}%`
              : "100%"}
          </p>
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
            Operational fill status
          </p>
        </div>
        <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/50">
          <TrendingUp className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}