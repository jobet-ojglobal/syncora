// app/admin/inventory/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, Warehouse, Package, Layers, AlertTriangle, Edit, Info, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "@/components/shared/delete-button";

interface BinDetail {
  id: string;
  sublocationName: string;
  quantity: number;
}

interface InventoryStockRow {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  locationId: string;
  locationName: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  quantityInTransit: number; // 🚀 Registered new state metric
  bins: BinDetail[];
}

export default function InventoryListIntransit() {
  const [inventory, setInventory] = useState<InventoryStockRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [activeInspectionItem, setActiveInspectionItem] = useState<InventoryStockRow | null>(null);

  const fetchInventory = async () => {
    try {
      const res = await fetch("/api/admin/inventory");
      if (res.ok) {
        const data = await res.json();
        setInventory(data);
      }
    } catch (err) {
      console.error("Error updating system inventory states:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const filteredItems = inventory.filter((item) => {
    const normQuery = searchQuery.toLowerCase();
    return (
      item.productName.toLowerCase().includes(normQuery) ||
      item.productSlug.toLowerCase().includes(normQuery) ||
      item.locationName.toLowerCase().includes(normQuery)
    );
  });

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      
      {/* Upper Title Segment */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Master Stock Ledger</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time multi-warehouse balance records, dynamic picker bin configurations, and reserve allocations.
          </p>
        </div>
        <Button asChild size="sm" className="gap-1.5 shrink-0">
          <Link href="/dashboard/inventory/new">
            <Plus className="w-4 h-4" /> Post Stock Adjustment
          </Link>
        </Button>
      </div>

      {/* Filter Options Utility Block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/70" />
          <Input
            placeholder="Filter stock by name, SKU slug, or facility..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        <div className="text-xs text-muted-foreground font-medium bg-muted/50 border px-3 py-1.5 rounded-lg flex items-center gap-2 self-start sm:self-auto">
          <Info className="w-3.5 h-3.5 text-blue-500" />
          Monitored Stock Lines: <span className="font-bold text-foreground">{inventory.length}</span>
        </div>
      </div>

      {/* Main Datagrid Output */}
      {isLoading ? (
        <div className="p-16 text-center text-xs text-muted-foreground italic bg-card border rounded-xl shadow-sm">
          Fetching cross-terminal ledger matrices...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-16 text-center text-xs text-muted-foreground border-dashed border-2 rounded-xl bg-card">
          No active inventory allocations or matching configurations found.
        </div>
      ) : (
        <div className="border rounded-xl bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="p-4">SKU Product Assignment</th>
                  <th className="p-4">Logistics Depot</th>
                  <th className="p-4 text-right">On Hand</th>
                  <th className="p-4 text-right">Committed</th>
                  <th className="p-4 text-right">In Transit</th> {/* 🚀 New Header Column */}
                  <th className="p-4 text-right">Available for Sale</th>
                  <th className="p-4 text-center">Sub-bins</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y text-xs">
                ={filteredItems.map((item) => {
                  const isOutOfStock = item.quantityAvailable <= 0;
                  const isStrained = item.quantityReserved > item.quantityOnHand * 0.5;

                  return (
                    <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                      {/* Product Column */}
                      <td className="p-4 max-w-[220px]">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 bg-muted border rounded-md flex items-center justify-center shrink-0">
                            <Package className="w-3.5 h-3.5 text-muted-foreground/80" />
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-foreground block truncate">{item.productName}</span>
                            <span className="font-mono text-[10px] text-muted-foreground block truncate">{item.productSlug}</span>
                          </div>
                        </div>
                      </td>

                      {/* Location Column */}
                      <td className="p-4 text-muted-foreground font-medium">
                        <div className="flex items-center gap-1.5 truncate max-w-[150px]">
                          <Warehouse className="w-3.5 h-3.5 opacity-60 shrink-0" />
                          <span className="truncate">{item.locationName}</span>
                        </div>
                      </td>

                      {/* On Hand Numeric Value */}
                      <td className="p-4 text-right font-mono font-medium text-foreground">
                        {item.quantityOnHand.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                      </td>

                      {/* Reserved Volume Value */}
                      <td className="p-4 text-right font-mono text-muted-foreground">
                        {item.quantityReserved > 0 ? (
                          <span className={`inline-flex items-center gap-1 ${isStrained ? "text-amber-600 font-bold" : ""}`}>
                            {item.quantityReserved.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                          </span>
                        ) : (
                          <span className="opacity-40">-</span>
                        )}
                      </td>

                      {/* 🚀 In Transit Numeric Column */}
                      <td className="p-4 text-right font-mono text-muted-foreground">
                        {item.quantityInTransit > 0 ? (
                          <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 font-bold px-1.5 py-0.5 rounded-sm text-[11px]">
                            <Truck className="w-3 h-3 shrink-0" />
                            {item.quantityInTransit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                          </span>
                        ) : (
                          <span className="opacity-30">-</span>
                        )}
                      </td>

                      {/* Available Balance Status String */}
                      <td className="p-4 text-right font-mono">
                        {isOutOfStock ? (
                          <span className="text-destructive font-bold inline-flex items-center gap-1 bg-destructive/10 px-1.5 py-0.5 rounded-sm">
                            <AlertTriangle className="w-3 h-3" /> 0.00
                          </span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            {item.quantityAvailable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                          </span>
                        )}
                      </td>

                      {/* Internal Storage Sublocations Count Metric Badge */}
                      <td className="p-4 text-center">
                        {item.bins.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => setActiveInspectionItem(item)}
                            className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-md font-medium transition-colors text-[11px]"
                          >
                            <Layers className="w-3 h-3" /> {item.bins.length} {item.bins.length === 1 ? "bin" : "bins"}
                          </button>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/50 italic font-normal">Bulk Floor</span>
                        )}
                      </td>

                      {/* Actions Controls buttons mapping context row */}
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button asChild variant="ghost" size="sm" className="h-7 px-2 font-semibold gap-1">
                            <Link href={`/dashboard/inventory/${item.id}/edit`}>
                              <Edit className="w-3 h-3" /> Adjust
                            </Link>
                          </Button>
                          <DeleteButton
                            itemId={item.id}
                            itemName={`Inventory line (${item.productSlug})`}
                            endpointUrl={`/api/admin/inventory/${item.id}`}
                            onSuccess={fetchInventory}
                            variant="icon"
                          />
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

      {/* Slide-out Inspection Modal Panel */}
      {activeInspectionItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border w-full max-w-md rounded-xl p-5 shadow-lg space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b pb-3">
              <div>
                <h3 className="text-sm font-bold text-foreground">Storage Layout Inspection</h3>
                <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{activeInspectionItem.productSlug}</p>
              </div>
              <Badge variant="outline" className="text-[10px] py-0 h-5 border-blue-200 text-blue-600 bg-blue-50">
                {activeInspectionItem.locationName}
              </Badge>
            </div>

            <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
              <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1">Assigned Layout Picking Slots</div>
              {activeInspectionItem.bins.map((bin) => (
                <div key={bin.id} className="flex items-center justify-between border p-2 rounded-lg bg-muted/30 font-medium">
                  <span className="text-xs text-foreground flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                    {bin.sublocationName}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    <strong className="text-foreground">{bin.quantity}</strong> units
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setActiveInspectionItem(null)}
                className="text-xs px-4"
              >
                Close View
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}