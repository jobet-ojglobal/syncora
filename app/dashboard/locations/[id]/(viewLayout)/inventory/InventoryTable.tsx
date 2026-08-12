"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import useSWR from "swr";
import { 
  Search, RefreshCw, AlertCircle, Edit, Layers, 
  Sliders, AlertTriangle, Package 
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FormattedInventoryItem } from "@/types/inventory.dto";
import Image from "next/image";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// 1. Updated Props Interface
export interface InventoryTableProps {
  locationId: string;
  locationInflowId?: string;
  onInspectBins: (item: any) => void;
  onSelectItemForReplenishment: (item: any) => void;
  onDataChanged?: () => Promise<void>;
}

export function InventoryTable({
  locationId,
  locationInflowId,
  onInspectBins,
  onSelectItemForReplenishment,
  onDataChanged,
}: InventoryTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [syncingProductId, setSyncingProductId] = useState<string | null>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPageIndex(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch paginated inventory for current location
  const { data, isLoading, error, mutate } = useSWR(
    locationId
      ? `/api/admin/locations/${locationId}/inventory?search=${encodeURIComponent(
          debouncedSearch
        )}&page=${pageIndex}&limit=10`
      : null,
    fetcher
  );

  const inventory: FormattedInventoryItem[] = data?.inventory ?? [];
  const pagination = data?.pagination;

  // Sync single product with cloud / upstream
  const handleSyncSingleProduct = (item: any) => {
    if (!locationInflowId) {
      toast.error("Location configuration missing for cloud sync.");
      return;
    }

    setSyncingProductId(item.productId);

    toast.promise(
      async () => {
        const res = await fetch(`/api/sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source: "single_inventory",
            locationIds: [locationInflowId],
            selectedRecords: [item.productId],
          }),
        });

        const resData = await res.json();
        if (!res.ok) {
          throw new Error(resData.error || `Failed to sync ${item.productName}`);
        }

        await mutate();
        if (onDataChanged) await onDataChanged();
        return resData;
      },
      {
        loading: `Syncing cloud inventory for "${item.productName}"...`,
        success: `Inventory for ${item.productName} updated!`,
        error: (err) => err.message || `Failed to sync ${item.productName}`,
        finally: () => setSyncingProductId(null),
      }
    );
  };

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/70" />
          <Input
            placeholder="Search SKU name or slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>
      </div>

      {/* Table Data States */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-muted-foreground italic bg-card border rounded-xl shadow-sm">
          Loading inventory stock...
        </div>
      ) : error ? (
        <div className="p-12 text-center text-xs text-destructive bg-card border border-destructive/20 rounded-xl shadow-sm">
          Failed to load inventory records.
        </div>
      ) : inventory.length === 0 ? (
        <div className="p-12 text-center text-xs text-muted-foreground border-dashed border-2 rounded-xl bg-card">
          No inventory stock items matching current parameters found.
        </div>
      ) : (
        <div className="border rounded-xl bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-muted/40 border-b text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="p-4">SKU Product Line</th>
                  <th className="p-4 text-right">On Hand</th>
                  <th className="p-4 text-right">Committed</th>
                  <th className="p-4 text-right">Outbound Transit</th>
                  <th className="p-4 text-right">Available for Sale</th>
                  <th className="p-4 text-center">Sub-bins & Bulk</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {inventory.map((item: FormattedInventoryItem) => {
                  const isItemSyncing = syncingProductId === item.product.inflowId;
                  const isOutOfStock = item.quantityAvailable <= 0;
                  const isLowStock =
                    item.reorderThreshold > 0 &&
                    item.quantityAvailable <= item.reorderThreshold;

                  const totalBinQty = item.bins.reduce(
                    (sum: number, b: any) => sum + b.quantity,
                    0
                  );
                  const bulkAreaQty = Math.max(0, item.quantityOnHand - totalBinQty);

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-muted/20 transition-colors ${
                        isLowStock ? "bg-amber-50/30 dark:bg-amber-950/15" : ""
                      }`}
                    >
                      <td className="p-4 max-w-[300px]">
                        {/* <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 bg-muted border rounded-md flex items-center justify-center shrink-0">
                            <Package className="w-3.5 h-3.5 text-muted-foreground/80" />
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-foreground block truncate">
                              {item.product.name}
                            </span>
                            <span className="font-mono text-[10px] text-muted-foreground block truncate">
                              {item.product.slug}
                            </span>
                          </div>
                          {isLowStock && (
                            <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shrink-0">
                              <AlertCircle className="w-2.5 h-2.5" /> LOW
                            </span>
                          )}
                        </div> */}
                        <div className="flex items-center gap-2.5 max-w-[220px]">
                          <div className="w-9 h-9 bg-muted border rounded-lg overflow-hidden flex items-center justify-center shrink-0 relative">
                            {item.product.thumbnail ? (
                              <Image
                                src={item.product.thumbnail}
                                alt={item.product.name}
                                className="w-full h-full object-cover"
                                width={36}
                                height={36}
                              />
                            ) : (
                              <Package className="w-4 h-4 text-muted-foreground/50" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-foreground text-[13px] block truncate">
                              {item.product.name}
                            </span>
                            <span className="font-mono text-[10px] text-muted-foreground block truncate">
                              {item.product.slug}
                            </span>
                          </div>
                          {isLowStock && (
                            <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shrink-0">
                              <AlertCircle className="w-2.5 h-2.5" /> LOW
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-4 text-right font-mono font-medium text-foreground">
                        {item.quantityOnHand.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>

                      <td className="p-4 text-right font-mono text-muted-foreground">
                        {item.quantityReserved > 0 ? (
                          <span>
                            {item.quantityReserved.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="opacity-30">-</span>
                        )}
                      </td>

                      <td className="p-4 text-right font-mono text-muted-foreground">
                        {item.quantityInTransit > 0 ? (
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 font-bold px-1.5 py-0.5 rounded-sm text-[10px]">
                            {item.quantityInTransit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="opacity-30">-</span>
                        )}
                      </td>

                      <td className="p-4 text-right font-mono">
                        {isOutOfStock ? (
                          <span className="text-destructive font-bold inline-flex items-center gap-1 bg-destructive/10 px-1.5 py-0.5 rounded-sm">
                            <AlertTriangle className="w-3 h-3" /> 0.00
                          </span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            {item.quantityAvailable.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 4,
                            })}
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-center">
                        <button
                          type="button"
                          onClick={() => onInspectBins(item)}
                          className="inline-flex items-center gap-1.5 bg-muted/60 hover:bg-muted border px-2.5 py-1 rounded-md transition-colors text-[11px]"
                        >
                          <Layers className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span className="font-semibold">
                            {item.bins.length} {item.bins.length === 1 ? "bin" : "bins"}
                          </span>
                          <span className="text-muted-foreground font-mono text-[10px] pl-1 border-l border-muted-foreground/30">
                            Bulk:{" "}
                            <strong className="text-amber-600 dark:text-amber-400 font-medium">
                              {bulkAreaQty.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </strong>
                          </span>
                        </button>
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isItemSyncing}
                            onClick={() => handleSyncSingleProduct(item)}
                            className="h-8 w-8 text-muted-foreground hover:text-indigo-600 hover:bg-indigo-500/5"
                            title={`Fetch Latest Cloud Inventory for ${item.product.name}`}
                          >
                            <RefreshCw
                              className={`w-3.5 h-3.5 ${
                                isItemSyncing ? "animate-spin text-indigo-500" : ""
                              }`}
                            />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-blue-600"
                            title="Configure Auto-Replenishment Rules"
                            onClick={() => onSelectItemForReplenishment(item)}
                          >
                            <Sliders className="w-3.5 h-3.5" />
                          </Button>

                          <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs font-semibold gap-1">
                            <Link href={`/dashboard/inventory/stocks/${item.id}/adjust`}>
                              <Edit className="w-3 h-3" /> Adjust
                            </Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {pagination && pagination.pageCount > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>
            Page {pageIndex + 1} of {pagination.pageCount} ({pagination.totalRecords} records)
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pageIndex === 0}
              onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
              className="h-7 px-3 text-xs"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pageIndex + 1 >= pagination.pageCount}
              onClick={() => setPageIndex((p) => p + 1)}
              className="h-7 px-3 text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}