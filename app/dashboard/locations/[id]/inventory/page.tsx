// app/dashboard/locations/[id]/inventory/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { 
  ArrowLeft, Warehouse, Package, Layers, AlertTriangle, 
  Edit, Info, Truck, RefreshCw, Layers3, ArrowRightLeft, Search,
  AlertCircle,
  Sliders
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InboundTransitMonitor } from "@/components/transfer/inbound-pipeline-card";
import { ReplenishmentSettingsModal } from "@/components/inventory/replenishment-settings-modal";

// Data Interfaces
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
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  quantityInTransit: number;
  reorderThreshold: number;
  bins: BinDetail[];
}

interface InboundTransitRow {
  lineId: string;
  transferNumber: string;
  sourceFacility: string;
  dispatchedAt: string;
  productName: string;
  productSlug: string;
  quantityInTransit: number;
  expectedDestinationBin: string;
}

interface LocationMeta {
  id: string;
  name: string;
  isActive: boolean;
  isDefault: boolean;
}

interface LookupLocation {
  id: string;
  inflowId: string;
  name: string;
}


/**
 * 🏢 2. PARENT LOCATION INVENTORY CONTROLLER
 */
export default function LocationInventoryPage() {
  const { id: locationId } = useParams();
  const [inventory, setInventory] = useState<InventoryStockRow[]>([]);
  const [location, setLocation] = useState<LocationMeta>();
  const [inboundCargo, setInboundCargo] = useState<InboundTransitRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [selectedReplenishItem, setSelectedReplenishItem] = useState<any | null>(null);
  const [isReplenishModalOpen, setIsReplenishModalOpen] = useState(false);

  const [locations, setLocations] = useState<LookupLocation[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);

   // 📡 Fetch dynamic system location list options on mount
  useEffect(() => {
    setIsLoadingLocations(true);
    fetch("/api/locations/lookup")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setLocations(data))
      .catch((err) => console.error("Error loading hubs:", err))
      .finally(() => setIsLoadingLocations(false));
  }, []);

  // Unified dashboard aggregation trigger
  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // Execute both stock list and incoming freight queries concurrently
      const [stockRes, inboundRes] = await Promise.all([
        fetch(`/api/admin/locations/${locationId}/inventory`),
        fetch(`/api/admin/locations/${locationId}/inbound-transit`)
      ]);

      if (stockRes.ok) {
        const {location, inventory } = await stockRes.json();
        setLocation(location);
        setInventory(inventory);
      }
      
      if (inboundRes.ok) {
        const inboundData = await inboundRes.json();
        setInboundCargo(inboundData);
      }
    } catch (err) {
      console.error("Critical tracking data sync error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (locationId) {
      fetchDashboardData();
    }
  }, [locationId]);

  const filteredItems = inventory.filter((item) => {
    const normQuery = searchQuery.toLowerCase();
    return (
      item.productName.toLowerCase().includes(normQuery) ||
      item.productSlug.toLowerCase().includes(normQuery)
    );
  });

  // Calculate high-level performance metrics
  const totalSKUs = inventory.length;
  const totalOnHand = inventory.reduce((acc, curr) => acc + curr.quantityOnHand, 0);
  const totalInboundPipeline = inboundCargo.reduce((acc, curr) => acc + curr.quantityInTransit, 0);
  const outOfStockCount = inventory.filter(item => item.quantityAvailable <= 0).length;

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      
      {/* Back Navigation Bar */}
      <div className="flex flex-col gap-2">
        {/* <Button asChild variant="ghost" size="sm" className="w-fit gap-1 text-xs -ml-2">
          <Link href="/dashboard/locations">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Facilities
          </Link>
        </Button> */}
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-muted border rounded-xl flex items-center justify-center shrink-0 mt-1">
              <Warehouse className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Inventory</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Targeted internal warehouse balances, allocated bin vectors, and tracking references.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchDashboardData} className="h-8 gap-1.5 text-xs">
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} /> Refresh Data
            </Button>
            <Button asChild size="sm" className="h-8 gap-1.5 text-xs">
              <Link href="/dashboard/inventory/new">
                Post Adjustment
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* 📊 Facility Metrics Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-none rounded-xl bg-card border">
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Package className="w-3 h-3 text-blue-500" /> Catalog SKUs
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold tracking-tight">{totalSKUs}</div>
          </CardContent>
        </Card>

        <Card className="shadow-none rounded-xl bg-card border">
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Layers3 className="w-3 h-3 text-emerald-500" /> Aggregated On Hand
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold tracking-tight">{totalOnHand.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">units</span></div>
          </CardContent>
        </Card>

        <Card className="shadow-none rounded-xl bg-card border">
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Truck className="w-3 h-3 text-purple-500" /> Inbound Expected
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold tracking-tight text-purple-600 dark:text-purple-400">
              +{totalInboundPipeline.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">units</span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none rounded-xl bg-card border">
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-destructive" /> Stock-Out Critical
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className={`text-xl font-bold tracking-tight ${outOfStockCount > 0 ? "text-destructive" : ""}`}>{outOfStockCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* 🚀 2. INBOUND MONITOR PLACEMENT */}
      {/* This renders dynamically below your summary metrics cards if incoming shipments exist */}
      <InboundTransitMonitor shipments={inboundCargo} />

      {/* Filter Utilities Block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/70" />
          <Input
            placeholder="Search SKU name or slug inside this warehouse..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>
      </div>

      {/* Main Stock Inventory Table Datagrid */}
      {isLoading ? (
        <div className="p-16 text-center text-xs text-muted-foreground italic bg-card border rounded-xl shadow-sm">
          Isolating location stock configurations...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-16 text-center text-xs text-muted-foreground border-dashed border-2 rounded-xl bg-card">
          No inventory stock items matching current parameters found for this facility.
        </div>
      ) : (
        <div className="border rounded-xl bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="p-4">SKU Product Line</th>
                  <th className="p-4 text-right">On Hand</th>
                  <th className="p-4 text-right">Committed</th>
                  <th className="p-4 text-right">Outbound Transit</th>
                  <th className="p-4 text-right">Available for Sale</th>
                  <th className="p-4 pl-8">Picking Sub-Bins & Distribution Mapping</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y text-xs">
                {filteredItems.map((item) => {
                  const isOutOfStock = item.quantityAvailable <= 0;
                  const isStrained = item.quantityReserved > item.quantityOnHand * 0.5;
                  const isLowStock = item.reorderThreshold > 0 && item.quantityAvailable <= item.reorderThreshold;

                  return (
                    <tr 
                      key={item.id} 
                      className={`hover:bg-muted/20 transition-colors ${
                          isLowStock ? "bg-amber-50/30 dark:bg-amber-950/15" : ""
                      }`}
                    >
                        
                      <td className="p-4 max-w-[300px]">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 bg-muted border rounded-md flex items-center justify-center shrink-0">
                            <Package className="w-3.5 h-3.5 text-muted-foreground/80" />
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-foreground block truncate">{item.productName}</span>
                            <span className="font-mono text-[10px] text-muted-foreground block truncate">{item.productSlug}</span>
                          </div>
                          {isLowStock && (
                            <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                            <AlertCircle className="w-2.5 h-2.5" /> LOW STOCK
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-4 text-right font-mono font-medium text-foreground">
                        {item.quantityOnHand.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>

                      <td className="p-4 text-right font-mono text-muted-foreground">
                        {item.quantityReserved > 0 ? (
                          <span className={isStrained ? "text-amber-600 font-bold" : ""}>
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
                            {item.quantityAvailable.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        )}
                      </td>

                      <td className="p-4 pl-8 max-w-[340px]">
                        {item.bins.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {item.bins.map((bin) => (
                              <Badge 
                                key={bin.id} 
                                variant="secondary" 
                                className="font-medium text-[10px] px-2 py-0.5 rounded-md bg-muted border text-muted-foreground flex gap-1 font-mono"
                              >
                                <span className="font-sans text-foreground font-semibold">{bin.sublocationName}:</span> 
                                {bin.quantity.toFixed(0)}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground/50 italic">Bulk Floor Placement</span>
                        )}
                      </td>

                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* 🚀 ACTION 1: The Automation Rules Gear Button */}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-blue-600"
                          title="Configure Auto-Replenishment Rules"
                          onClick={() => {
                            setSelectedReplenishItem(item);
                            setIsReplenishModalOpen(true);
                          }}
                        >
                          <Sliders className="w-3.5 h-3.5" />
                        </Button>

                        <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs font-semibold gap-1">
                          <Link href={`/dashboard/inventory/${item.id}/edit`}>
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

      {selectedReplenishItem && (
        <ReplenishmentSettingsModal
          isOpen={isReplenishModalOpen}
          onClose={() => {
            setIsReplenishModalOpen(false);
            setSelectedReplenishItem(null);
          }}
          locations={locations}
          isLoadingLocations={isLoadingLocations}
          inventoryItem={{
            id: selectedReplenishItem.id,
            productName: selectedReplenishItem.productName,
            productSlug: selectedReplenishItem.productSlug,
            // Fallback parameters to prevent component crashes on initial setup
            reorderThreshold: selectedReplenishItem.reorderThreshold || 0,
            reorderQuantity: selectedReplenishItem.reorderQuantity || 0,
            isAutoReorderEnabled: selectedReplenishItem.isAutoReorderEnabled || false,
            preferredSourceLocationId: selectedReplenishItem.preferredSourceLocationId || null,
          }}
          // Re-pull live metrics from backend database when a rule gets saved
          onSaveSuccess={() => {
            fetchDashboardData(); 
          }}
        />
      )}
    </div>
  );
}