// app/admin/transfers/page.tsx
"use client";

import { useEffect, useState, Fragment } from "react";
import Link from "next/link";
import { Plus, Search, ArrowRightLeft, Warehouse, ArrowRight, Layers, FileText, ChevronDown, ChevronUp, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { DeleteButton } from "@/components/shared/delete-button";
import { TransferActionCell } from "@/components/transfer/transfer-action-cell";

interface LineDetail {
  id: string;
  productName: string;
  productSku: string;
  sourceBinName: string;
  targetBinName: string;
  quantity: number;
}

interface TransferOrderRow {
  id: string;
  transferNumber: string;
  sourceLocationName: string;
  targetLocationName: string;
  status: "DRAFT" | "PENDING" | "IN_TRANSIT" | "RECEIVED" | "CANCELLED";
  remarks: string | null;
  linesCount: number;
  transferredAt: string | null;
  receivedAt: string | null;
  createdAt: string;
  lines: LineDetail[];
}

export default function TransferOrdersListPage() {
  const [orders, setOrders] = useState<TransferOrderRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const fetchTransfers = async () => {
    try {
      const res = await fetch("/api/admin/transfers");
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      toast.error("Pipeline Exception", { description: "Failed synchronizing freight manifest records indices." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, []);

  const toggleRowExpand = (id: string) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getStatusBadgeVariant = (status: TransferOrderRow["status"]) => {
    switch (status) {
      case "DRAFT":
        return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/30";
      case "PENDING":
        return "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/20";
      case "IN_TRANSIT":
        return "bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-950/20";
      case "RECEIVED":
        return "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/20";
      case "CANCELLED":
        return "bg-destructive/10 text-destructive border-destructive/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const filteredOrders = orders.filter((order) => {
    const normalized = searchQuery.toLowerCase();
    return (
      order.transferNumber.toLowerCase().includes(normalized) ||
      order.sourceLocationName.toLowerCase().includes(normalized) ||
      order.targetLocationName.toLowerCase().includes(normalized) ||
      (order.remarks?.toLowerCase().includes(normalized) ?? false)
    );
  });

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      
      {/* Top Header Row Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Stock Transfer Dispatches</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track physical consignment logs, authorize inter-depot movements, and verify received stock balances.
          </p>
        </div>
        <Button asChild size="sm" className="gap-1.5 shrink-0">
          <Link href="/dashboard/transfers/create">
            <Plus className="w-4 h-4" /> Issue Transfer Order
          </Link>
        </Button>
      </div>

      {/* Control Utility Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/70" />
          <Input
            placeholder="Search transfer number, terminal site label..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        <div className="text-xs text-muted-foreground font-medium bg-muted/50 border px-3 py-1.5 rounded-lg flex items-center gap-1.5 self-start sm:self-auto">
          <ArrowRightLeft className="w-3.5 h-3.5 text-muted-foreground" />
          Active Manifest lines: <span className="font-bold text-foreground">{orders.length}</span>
        </div>
      </div>

      {/* Main Table Matrix Render */}
      {isLoading ? (
        <div className="p-16 text-center text-xs text-muted-foreground italic bg-card border rounded-xl shadow-xs">
          Loading inter-depot fulfillment pipelines records...
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="p-16 text-center text-xs text-muted-foreground border-dashed border-2 rounded-xl bg-card">
          No active stock transfer orders found matching your criteria.
        </div>
      ) : (
        <div className="border rounded-xl bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="p-4 w-[40px]">Inspect</th>
                  <th className="p-4">Manifest Tracking Number</th>
                  <th className="p-4">Departure Origin Site</th>
                  <th className="p-4 w-[20px] text-center">Route</th>
                  <th className="p-4">Arrival Destination Hub</th>
                  <th className="p-4 text-center">Components</th>
                  <th className="p-4">Workflow Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y text-xs">
                {filteredOrders.map((order, idx) => {
                  const isRowExpanded = !!expandedRows[order.id];
                  const isClosedRecord = order.status === "RECEIVED" || order.status === "CANCELLED";
                  
                  return (
                    <Fragment key={order.id}>
                      <tr className={`hover:bg-muted/10 transition-colors ${isClosedRecord ? "bg-muted/5 opacity-80" : ""}`}>
                        
                        {/* Expandable row dropdown trigger button link arrow */}
                        <td className="p-4 text-center">
                          <button
                            type="button"
                            onClick={() => toggleRowExpand(order.id)}
                            className="text-muted-foreground hover:bg-muted p-1 rounded-md transition-colors"
                            title="Inspect Consignment Component Lines"
                          >
                            {isRowExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </td>

                        {/* Order Number column code identifier */}
                        <td className="p-4 font-mono font-bold text-foreground">
                          {order.transferNumber}
                        </td>

                        {/* Source Facility Label */}
                        <td className="p-4 text-muted-foreground font-medium max-w-[160px] truncate">
                          <div className="flex items-center gap-1.5">
                            <Warehouse className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                            <span className="truncate">{order.sourceLocationName}</span>
                          </div>
                        </td>

                        {/* Direction Arrow Vector Graphic */}
                        <td className="p-4 text-center text-muted-foreground/40">
                          <ArrowRight className="w-4 h-4 mx-auto" />
                        </td>

                        {/* Destination Facility Label */}
                        <td className="p-4 text-muted-foreground font-medium max-w-[160px] truncate">
                          <div className="flex items-center gap-1.5">
                            <Warehouse className="w-3.5 h-3.5 text-blue-500/60 shrink-0" />
                            <span className="truncate">{order.targetLocationName}</span>
                          </div>
                        </td>

                        {/* Individual Line Quantities count indicator pill */}
                        <td className="p-4 text-center">
                          <Badge variant="secondary" className="text-[10px] font-mono h-5 py-0 bg-muted px-1.5 text-muted-foreground font-normal">
                            {order.linesCount} {order.linesCount === 1 ? "SKU" : "SKUs"}
                          </Badge>
                        </td>

                        {/* Stage Progress State Badge Option */}
                        <td className="p-4">
                          <Badge variant="outline" className={`text-[10px] tracking-tight font-semibold py-0.5 px-2 ${getStatusBadgeVariant(order.status)}`}>
                            {order.status}
                          </Badge>
                        </td>

                        {/* Action Control Modifiers panel anchors */}
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-2">
                              {/* Contextual Pipeline Progress Buttons */}
                              {order.status === "DRAFT" && (
                              <Button
                                  onClick={async () => {
                                  if(confirm("Confirm manifest approval request step?")) {
                                      const r = await fetch('/api/admin/transfers', {
                                      method: 'PATCH',
                                      headers: {'Content-Type': 'application/json'},
                                      body: JSON.stringify({ id: order.id, status: 'PENDING' })
                                      });
                                      if(r.ok) { toast.success("Manifest pending approval"); fetchTransfers(); }
                                  }
                                  }}
                                  variant="outline"
                                  className="h-7 text-[10px] px-2 font-bold text-blue-600 bg-blue-50/50 hover:bg-blue-100 border-blue-200"
                              >
                                  Submit Order
                              </Button>
                              )}

                              {order.status === "PENDING" && (
                              <Button
                                  onClick={async () => {
                                  if(confirm("Deduct items from departure stock and mark shipment as Shipped?")) {
                                      const r = await fetch('/api/admin/transfers', {
                                      method: 'PATCH',
                                      headers: {'Content-Type': 'application/json'},
                                      body: JSON.stringify({ id: order.id, status: 'IN_TRANSIT' })
                                      });
                                      if(r.ok) { toast.success("Consignment Dispatched In-Transit"); fetchTransfers(); }
                                      else { const err = await r.json(); toast.error(err.error); }
                                  }
                                  }}
                                  variant="outline"
                                  className="h-7 text-[10px] px-2 font-bold text-purple-600 bg-purple-50/50 hover:bg-purple-100 border-purple-200"
                              >
                                  Dispatch Cargo
                              </Button>
                              )}

                              {order.status === "IN_TRANSIT" && (
                              <Fragment>
                                  <Button
                                  onClick={async () => {
                                      if(confirm("Verify all components arrived safely? This will add quantities to destination terminal ledger storage.")) {
                                      const r = await fetch('/api/admin/transfers', {
                                          method: 'PATCH',
                                          headers: {'Content-Type': 'application/json'},
                                          body: JSON.stringify({ id: order.id, status: 'RECEIVED' })
                                      });
                                      if(r.ok) { toast.success("Consignment Received & Settled"); fetchTransfers(); }
                                      }
                                  }}
                                  variant="outline"
                                  className="h-7 text-[10px] px-2 font-bold text-emerald-600 bg-emerald-50/50 hover:bg-emerald-100 border-emerald-200"
                                  >
                                  Receive Stock
                                  </Button>

                                  <Button
                                  onClick={async () => {
                                      if(confirm("Void cargo dispatch route? Quantities will be returned to origin bin storage indexes.")) {
                                      const r = await fetch('/api/admin/transfers', {
                                          method: 'PATCH',
                                          headers: {'Content-Type': 'application/json'},
                                          body: JSON.stringify({ id: order.id, status: 'CANCELLED' })
                                      });
                                      if(r.ok) { toast.warning("Shipment routing aborted"); fetchTransfers(); }
                                      }
                                  }}
                                  variant="ghost"
                                  className="h-7 text-[10px] px-2 font-medium text-destructive hover:bg-destructive/10"
                                  >
                                  Abort
                                  </Button>
                              </Fragment>
                              )}

                              {/* Default Manage Anchor Controls */}
                              <TransferActionCell orderId={order.id} />
                              {/* <Button asChild variant="ghost" size="sm" className="h-7 px-2 font-semibold gap-1" disabled={isClosedRecord}>
                              <Link href={`/dashboard/transfers/${order.id}/edit`}>
                                  <Edit3 className="w-3 h-3" /> Manage
                              </Link>
                              </Button> */}
                              
                              <DeleteButton
                              itemId={order.id}
                              itemName={`Transfer manifest (${order.transferNumber})`}
                              endpointUrl={`/api/admin/transfers/${order.id}`}
                              onSuccess={fetchTransfers}
                              variant="icon"
                              />
                          </div>
                        </td>
                      </tr>

                      {/* Dropdown Expander: Sub-table detailing discrete product row counts */}
                      {isRowExpanded && (
                        <tr key={`Sub_${order.id}`}>
                          <td colSpan={8} className="p-0 bg-muted/10 border-b">
                            <div className="px-14 py-4 space-y-3 animate-in fade-in duration-100">
                              
                              {/* Summary Context Fields */}
                              <div className="flex flex-col sm:flex-row gap-4 text-[11px] text-muted-foreground border-b pb-2">
                                <div>Issued Date: <strong className="text-foreground">{new Date(order.createdAt).toLocaleDateString()}</strong></div>
                                {order.transferredAt && <div>Dispatched: <strong className="text-foreground">{new Date(order.transferredAt).toLocaleDateString()}</strong></div>}
                                {order.receivedAt && <div>Arrived: <strong className="text-foreground">{new Date(order.receivedAt).toLocaleDateString()}</strong></div>}
                              </div>

                              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                <FileText className="w-3.5 h-3.5" /> Consignment Manifest Stock breakdown lines
                              </div>

                              {/* Nested items listing matrix table grids */}
                              <div className="border rounded-lg bg-background overflow-hidden shadow-2xs">
                                <table className="w-full text-left border-collapse text-xs">
                                  <thead>
                                    <tr className="bg-muted/30 text-[10px] font-bold uppercase tracking-tight text-muted-foreground border-b">
                                      <th className="p-2">Assigned SKU Product Specification</th>
                                      <th className="p-2">Departure Source Bin</th>
                                      <th className="p-2">Arrival Destination Bin</th>
                                      <th className="p-2 text-right">Transfer Volume</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y text-[11px]">
                                    {order.lines.map((line) => (
                                      <tr key={line.id} className="hover:bg-muted/5">
                                        <td className="p-2 font-medium text-foreground">
                                          {line.productName} <span className="font-mono text-[9px] text-muted-foreground ml-1">({line.productSku})</span>
                                        </td>
                                        <td className="p-2 text-muted-foreground">{line.sourceBinName}</td>
                                        <td className="p-2 text-muted-foreground">{line.targetBinName}</td>
                                        <td className="p-2 text-right font-mono font-semibold text-foreground">{line.quantity.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>

                              {/* Remarks footnotes indicator text wrapper box panel */}
                              {order.remarks && (
                                <p className="text-[11px] text-muted-foreground bg-background border p-2 rounded-lg italic max-w-3xl">
                                  <strong>Logistical Manifest Remarks:</strong> {order.remarks}
                                </p>
                              )}

                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}