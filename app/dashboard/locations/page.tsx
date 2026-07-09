// app/admin/locations/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, MapPin, Warehouse, Layers, Boxes, CheckCircle2, XCircle, ChevronDown, ChevronUp, ExternalLink, ArrowRight, ShoppingBag, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/layout/dashboard/PageHeader";

interface SublocationMin {
  id: string;
  name: string;
}

interface LocationListItem {
  id: string;
  inflowId: string;
  name: string;
  isActive: boolean;
  isDefault: boolean;
  formattedAddress: string | null;
  sublocationsCount: number;
  inventoryItemsCount: number;
  totalSalesOrdersCount: number,
  activeSalesOrdersCount: number,
  teamMembersCount: number;
  sublocationsList: SublocationMin[];
}

export default function LocationsListPage() {
  const [locations, setLocations] = useState<LocationListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  
  const fetchLocations = async () => {
    try {
      const res = await fetch("/api/admin/locations");
      if (res.ok) {
        const data = await res.json();
        setLocations(data);
      }
    } catch (err) {
      console.error("Error updating facilities index state:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const toggleRowExpand = (inflowId: string) => {
    setExpandedRows((prev) => ({ ...prev, [inflowId]: !prev[inflowId] }));
  };

  const filteredLocations = locations.filter((loc) => {
    const normalizedQuery = searchQuery.toLowerCase();
    return (
      loc.name.toLowerCase().includes(normalizedQuery) ||
      (loc.formattedAddress?.toLowerCase().includes(normalizedQuery) ?? false)
    );
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Logistics & Storage Locations</h1>
          <p className="text-sm text-muted-foreground">
            Monitor inventory depots, verify fulfillment sites, and configure nested sublocation staging areas.
          </p>
        </div>
        <Button asChild size="sm" className="gap-1.5 shrink-0 self-start sm:self-center">
          <Link href="/dashboard/locations/create">
            <Plus className="w-4 h-4" /> Add Logistics Site
          </Link>
        </Button>
      </div>

      {/* Toolbar Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/70" />
          <Input
            placeholder="Search depot names, cities, states..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs w-full"
          />
        </div>

        <div className="text-xs text-muted-foreground font-medium bg-muted/50 border px-3 py-1.5 rounded-lg flex items-center gap-1.5 self-start sm:self-auto">
          <Warehouse className="w-3.5 h-3.5 text-muted-foreground" />
          Active Facilities: <span className="font-bold text-foreground">{locations.length}</span>
        </div>
      </div>

      {/* Core Locations Registry Table Layout */}
      {isLoading ? (
        <div className="p-16 text-center text-xs text-muted-foreground italic bg-card border rounded-xl shadow-sm">
          Loading fulfillment infrastructure indices...
        </div>
      ) : filteredLocations.length === 0 ? (
        <div className="p-16 text-center text-xs text-muted-foreground border-dashed border-2 rounded-xl bg-card">
          No facility records matching your search queries found.
        </div>
      ) : (
        <div className="border rounded-xl bg-card shadow-sm overflow-hidden divide-y divide-border">
          {filteredLocations.map((loc) => {
            const isRowExpanded = !!expandedRows[loc.inflowId];
            return (
              <div key={loc.inflowId} className="flex flex-col transition-all group">
                
                {/* Primary Hub Summary Container */}
                <div className="p-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-start md:items-center bg-card hover:bg-muted/5 transition-colors">
                  
                  {/* Identity Column */}
                  <div className="flex items-start gap-3 min-w-0 md:col-span-5">
                    {/* Expand Sub-zones Toggler Button */}
                    <button
                      type="button"
                      onClick={() => toggleRowExpand(loc.inflowId)}
                      className="mt-0.5 text-muted-foreground hover:bg-muted p-1 rounded transition-colors shrink-0"
                      title="Inspect Sublocations Structure"
                    >
                      {isRowExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    <div className="w-9 h-9 rounded-xl border bg-muted/40 flex items-center justify-center text-muted-foreground shrink-0">
                      <Warehouse className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-foreground tracking-tight truncate">
                          {loc.name}
                        </h3>
                        {/* Status Badges Group */}
                        {loc.isDefault && (
                          <Badge className="text-[10px] tracking-tight bg-blue-500 hover:bg-blue-500 text-white font-semibold h-4 px-1.5 shrink-0">
                            System Default Site
                          </Badge>
                        )}
                        {!loc.isActive && (
                          <Badge variant="destructive" className="text-[10px] tracking-tight font-semibold h-4 px-1.5 shrink-0">
                            Offline / Suspended
                          </Badge>
                        )}
                      </div>

                      {/* Map Location String Indicator */}
                      <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 shrink-0 text-muted-foreground/60" />
                        {loc.formattedAddress || <span className="italic opacity-60">Physical address configuration missing</span>}
                      </p>
                    </div>
                  </div>

                  {/* Operational Relational Asset Metrics (Grid aligned on desktop) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:flex md:items-center gap-4 text-[11px] font-medium text-muted-foreground pl-8 md:pl-0 md:col-span-5">
                    
                    {/* Storage Zones */}
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-blue-500/80 shrink-0" />
                      <span>
                        <strong className="text-foreground">{loc.sublocationsCount}</strong> {loc.sublocationsCount === 1 ? "Zone" : "Zones"}
                      </span>
                    </div>

                    {/* Active Lines */}
                    <div className="flex items-center gap-1.5">
                      <Boxes className="w-3.5 h-3.5 text-emerald-500/80 shrink-0" />
                      <span className="truncate">
                        <strong className="text-foreground">{loc.inventoryItemsCount}</strong> Active lines
                      </span>
                    </div>

                    {/* Sales Orders Metric */}
                    <div className="flex items-center gap-1.5" title={`${loc.totalSalesOrdersCount} total lifetime orders`}>
                      <ShoppingBag className="w-3.5 h-3.5 text-amber-500/80 shrink-0" />
                      <span className="truncate">
                        <strong className="text-foreground">{loc.activeSalesOrdersCount}</strong> Orders
                      </span>
                    </div>

                    {/* Status Operational Metric */}
                    <div className="flex items-center gap-1">
                      {loc.isActive ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 className="w-3 h-3 shrink-0" /> Ready</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-destructive"><XCircle className="w-3 h-3 shrink-0" /> Locked</span>
                      )}
                    </div>
                  </div>

                  {/* Operational Action Column */}
                  <div className="flex items-center justify-end pl-8 md:pl-0 md:col-span-2 w-full">
                    <Link
                      href={`/dashboard/locations/${loc.id}`}
                      className="w-full md:w-auto inline-flex items-center justify-center gap-1 rounded-xl bg-slate-50 dark:bg-slate-900 px-4 py-2 text-xs font-bold border border-slate-200 dark:border-slate-800 hover:bg-slate-900 dark:hover:bg-slate-50 hover:text-white dark:hover:text-slate-900 transition-all shadow-2xs"
                    >
                      Overview
                      <ArrowRight className="h-3.5 w-3.5 transform transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                </div>

                {/* Dropdown Section: Render Sublocations Rows Inside This Hub Node */}
                {isRowExpanded && (
                  <div className="bg-muted/10 px-6 md:px-16 py-4 border-t border-b border-border flex flex-col gap-2">
                    <h4 className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/80">
                      Mapped Internal Sublocation Zones Matrix
                    </h4>
                    {loc.sublocationsList.length === 0 ? (
                      <p className="text-xs text-muted-foreground/60 italic py-1">
                        No internal staging zones or storage aisles configured. Items are mapped directly to the facility floor.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {loc.sublocationsList.map((sub) => (
                          <div key={sub.id} className="text-xs bg-background border rounded-lg px-2.5 py-1 font-medium text-foreground flex items-center gap-1.5 shadow-2xs">
                            <span className="w-1.5 h-1.5 bg-slate-400 dark:bg-slate-600 rounded-full shrink-0" />
                            {sub.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}