// app/admin/locations/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, MapPin, Warehouse, Layers, Boxes, CheckCircle2, XCircle, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "@/components/shared/delete-button";
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
    <div className="w-full mx-auto p-6 space-y-6">
      {/* Page Header */}
      <PageHeader 
        className=" border-b pb-5" 
        title="Logistics & Storage Locations" 
        description="Monitor inventory depots, verify fulfillment sites, and configure nested sublocation staging areas." 
        >
        <Button asChild size="sm" className="gap-1.5 shrink-0">
          <Link href="/dashboard/locations/create">
            <Plus className="w-4 h-4" /> Add Logistics Site
          </Link>
        </Button>
      </PageHeader>

      {/* Toolbar Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/70" />
          <Input
            placeholder="Search depot names, cities, states..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        <div className="text-xs text-muted-foreground font-medium bg-muted/50 border px-3 py-1.5 rounded-lg flex items-center gap-1.5">
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
        <div className="border rounded-xl bg-card shadow-sm overflow-hidden divide-y">
          {filteredLocations.map((loc) => {
            const isRowExpanded = !!expandedRows[loc.inflowId];
            return (
              <div key={loc.inflowId} className="flex flex-col transition-all">
                
                {/* Primary Hub Summary Row Segment */}
                <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card hover:bg-muted/10 transition-colors">
                  <div className="flex items-start gap-3 min-w-0">
                    {/* Expand Sub-zones Toggler Button */}
                    <button
                      type="button"
                      onClick={() => toggleRowExpand(loc.inflowId)}
                      className="mt-1 text-muted-foreground hover:bg-muted p-1 rounded transition-colors shrink-0"
                      title="Inspect Sublocations Structure"
                    >
                      {isRowExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    <div className="w-9 h-9 rounded-xl border bg-muted/40 flex items-center justify-center text-muted-foreground shrink-0">
                      <Warehouse className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/dashboard/locations/${loc.id}`} title="Go to Inventory">
                          <h3 className="text-sm font-bold text-foreground hover:text-indigo-500 tracking-tight truncate">{loc.name}</h3>
                        </Link>
                        {/* Status Badges Group */}
                        {loc.isDefault && (
                          <Badge className="text-[10px] tracking-tight bg-blue-500 hover:bg-blue-500 text-white font-semibold h-4 px-1.5">
                            System Default Site
                          </Badge>
                        )}
                        {!loc.isActive && (
                          <Badge variant="destructive" className="text-[10px] tracking-tight font-semibold h-4 px-1.5">
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

                  {/* Operational Relational Asset Totals Metrics */}
                  <div className="flex items-center gap-6 text-[11px] font-medium text-muted-foreground pl-9 md:pl-0">
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-blue-500/80" />
                      <span>
                        <strong className="text-foreground">{loc.sublocationsCount}</strong> {loc.sublocationsCount === 1 ? "Storage Zone" : "Storage Zones"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Boxes className="w-3.5 h-3.5 text-emerald-500/80" />
                      <span>
                        <strong className="text-foreground">{loc.inventoryItemsCount}</strong> Active lines
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {loc.isActive ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 className="w-3 h-3" /> Ready</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-destructive"><XCircle className="w-3 h-3" /> Locked</span>
                      )}
                    </div>
                  </div>

                  {/* Actions Operations Controls Bar Panel */}
                  <div className="flex items-center gap-1 justify-end pl-9 md:pl-0 shrink-0">
                    <Button asChild variant="ghost" size="sm" className="h-8 text-xs font-semibold gap-1">
                      <Link href={`/dashboard/locations/${loc.id}/edit`}>
                        Modify <ExternalLink className="w-3 h-3" />
                      </Link>
                    </Button>
                    <DeleteButton
                      itemId={loc.id}
                      itemName={loc.name}
                      endpointUrl={`/api/admin/locations/${loc.id}/soft-delete`}
                      onSuccess={fetchLocations}
                      variant="icon"
                    />
                  </div>
                </div>

                {/* Dropdown Section: Render Sublocations Rows Inside This Hub Node */}
                {isRowExpanded && (
                  <div className="bg-muted/10 px-14 py-3.5 border-b flex flex-col gap-2">
                    <h4 className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/80">Mapped Internal Sublocation Zones Matrix</h4>
                    {loc.sublocationsList.length === 0 ? (
                      <p className="text-xs text-muted-foreground/60 italic py-1">No internal staging zones or storage aisles configured. Items are mapped directly to the facility floor.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {loc.sublocationsList.map((sub) => (
                          <div key={sub.id} className="text-xs bg-background border rounded-lg px-2.5 py-1 font-medium text-foreground flex items-center gap-1.5 shadow-2xs">
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full shrink-0" />
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