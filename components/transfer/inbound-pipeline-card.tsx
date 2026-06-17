import { Truck, ArrowRightLeft } from "lucide-react";
import { Badge } from "../ui/badge";

// Add this component section to your warehouse views to render live manifest feeds
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

export function InboundTransitMonitor({ shipments }: { shipments: InboundTransitRow[] }) {
  if (shipments.length === 0) return null;

  return (
    <div className="border rounded-xl bg-card shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-purple-500" />
          <h3 className="text-sm font-bold text-foreground">Inbound Cargo Pipeline</h3>
        </div>
        <Badge variant="secondary" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 text-[10px]">
          {shipments.length} Active Shipments
        </Badge>
      </div>
      
      <div className="divide-y">
        {shipments.map((shipment) => (
          <div
            key={shipment.lineId}
            className="py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between hover:bg-muted/30 px-2 rounded-lg transition-colors"
          >
            {/* Left Section */}
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] font-bold px-2 py-1 rounded-md border bg-muted shrink-0">
                  {shipment.transferNumber}
                </span>

                <Badge
                  variant="outline"
                  className="text-[10px] gap-1 font-normal"
                >
                  <ArrowRightLeft className="w-3 h-3" />
                  {shipment.sourceFacility}
                </Badge>
              </div>

              <div>
                <p className="font-semibold text-sm truncate">
                  {shipment.productName}
                </p>

                <p className="text-[11px] text-muted-foreground font-mono">
                  {shipment.productSlug}
                </p>
              </div>
            </div>

            {/* Right Section */}
            <div className="grid grid-cols-2 sm:flex sm:flex-col gap-2 sm:gap-1 text-right">
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">
                  Incoming
                </p>

                <p className="font-mono font-bold text-purple-600 text-sm">
                  +{shipment.quantityInTransit.toLocaleString()}
                </p>
              </div>

              <div>
                <p className="text-[10px] uppercase text-muted-foreground">
                  Target Bin
                </p>

                <p className="font-medium truncate max-w-[140px]">
                  {shipment.expectedDestinationBin}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}