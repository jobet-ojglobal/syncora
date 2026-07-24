"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { 
  Truck, 
  ArrowRightLeft, 
  Search, 
  MapPin, 
  Clock, 
  Package, 
  ChevronRight,
  AlertCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export interface InboundTransitRow {
  lineId: string;
  transferNumber: string;
  sourceFacility: string;
  dispatchedAt: string | null;
  expectedArrival?: string | null;
  productName: string;
  productSlug: string;
  quantityInTransit: number;
  expectedDestinationBin: string;
  remarks?: string | null;
}

interface InboundTransitMonitorProps {
  locationId: string;
  /** Optional initial data if pre-rendered on the server */
  initialData?: InboundTransitRow[];
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function InboundTransitMonitor({ locationId, initialData }: InboundTransitMonitorProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: shipments = initialData, isLoading, error } = useSWR<InboundTransitRow[]>(
    locationId ? `/api/admin/locations/${locationId}/inbound-transit` : null,
    fetcher,
    { refreshInterval: 30000 } // Auto-refresh every 30 seconds
  );

  // Filter shipments based on search query
  const filteredShipments = useMemo(() => {
    if (!shipments || !Array.isArray(shipments)) return [];
    if (!searchQuery.trim()) return shipments;

    const query = searchQuery.toLowerCase();
    return shipments.filter(
      (s) =>
        s.transferNumber.toLowerCase().includes(query) ||
        s.productName.toLowerCase().includes(query) ||
        s.productSlug.toLowerCase().includes(query) ||
        s.sourceFacility.toLowerCase().includes(query) ||
        s.expectedDestinationBin.toLowerCase().includes(query)
    );
  }, [shipments, searchQuery]);

  const totalIncomingUnits = useMemo(() => {
    if (!shipments || !Array.isArray(shipments)) return 0;
    return shipments.reduce((acc, curr) => acc + curr.quantityInTransit, 0);
  }, [shipments]);

  if (isLoading) return;

  if (error || !shipments) return null;

  // Render a subtle empty state when no transfers are pending
  if (shipments.length === 0) {
    return (
      <div className="border border-dashed rounded-xl p-6 text-center bg-muted/20">
        <Truck className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
        <p className="text-xs font-medium text-muted-foreground">
          No active inbound cargo pipelines heading to this location.
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-xl bg-card shadow-xs overflow-hidden">
      {/* Header Bar */}
      <div className="p-4 sm:p-5 border-b bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <Truck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
              Inbound Cargo Pipeline
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Tracking transfers currently in transit to this facility
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800 text-[11px] px-2.5 py-0.5"
          >
            {shipments.length} Active {shipments.length === 1 ? "Order" : "Orders"}
          </Badge>

          <Badge variant="outline" className="text-[11px] font-mono">
            +{totalIncomingUnits.toLocaleString()} Units
          </Badge>
        </div>
      </div>

      {/* Filter Toolbar (Only visible if > 2 items) */}
      {shipments.length > 2 && (
        <div className="px-4 py-2.5 border-b bg-card flex items-center">
          <div className="relative w-full max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by transfer #, SKU, or product..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs bg-muted/40 focus-visible:bg-background"
            />
          </div>
        </div>
      )}

      {/* Manifest List */}
      <div className="divide-y max-h-[420px] overflow-y-auto">
        {filteredShipments.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground">
            No active shipments match &quot;{searchQuery}&quot;
          </div>
        ) : (
          filteredShipments.map((shipment) => (
            <div
              key={shipment.lineId}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/40 transition-colors"
            >
              {/* Product & Order Details */}
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md border bg-background text-foreground shrink-0 shadow-2xs">
                    {shipment.transferNumber}
                  </span>

                  <Badge
                    variant="outline"
                    className="text-[10px] gap-1 font-normal bg-background text-muted-foreground"
                  >
                    <ArrowRightLeft className="w-3 h-3 text-purple-500" />
                    {shipment.sourceFacility}
                  </Badge>

                  {shipment.dispatchedAt && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3 text-muted-foreground/70" />
                      Dispatched {new Date(shipment.dispatchedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <div>
                  <p className="font-medium text-sm text-foreground truncate">
                    {shipment.productName}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    {shipment.productSlug}
                  </p>
                </div>
              </div>

              {/* Destination & Quantity Metadata */}
              <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-2 sm:pt-0 shrink-0">
                <div className="text-left sm:text-right">
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground flex items-center sm:justify-end gap-1">
                    <MapPin className="w-2.5 h-2.5" />
                    Target Bin
                  </p>
                  <p className="text-xs font-medium text-foreground truncate max-w-[130px]">
                    {shipment.expectedDestinationBin}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground flex items-center justify-end gap-1">
                    <Package className="w-2.5 h-2.5" />
                    Incoming
                  </p>
                  <p className="font-mono font-bold text-purple-600 dark:text-purple-400 text-sm">
                    +{shipment.quantityInTransit.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}