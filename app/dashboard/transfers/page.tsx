"use client";

import { useEffect, useState, Fragment } from "react";
import Link from "next/link";
import { 
  Plus, Search, ArrowRightLeft, Warehouse, ArrowRight, 
  FileText, ChevronDown, ChevronUp, Edit3, Eye, CheckCircle2, 
  AlertCircle, PackageCheck, Truck, Ban, Calendar, User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { DeleteButton } from "@/components/shared/delete-button";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

// Interfaces
interface LineDetail {
  id: string;
  productName: string;
  productSku: string;
  sourceSublocationId?: string | null;
  targetSublocationId?: string | null;
  sourceBinName: string;
  targetBinName: string;
  quantity: number;
  quantityReceived?: number | null;
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

interface ActionPayload {
  order: TransferOrderRow;
  targetStatus: TransferOrderRow["status"];
  title: string;
  description: string;
  toastSuccess: string;
}

export default function TransferOrdersListPage() {
  const [orders, setOrders] = useState<TransferOrderRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  // View Modal State
  const [viewingOrder, setViewingOrder] = useState<TransferOrderRow | null>(null);

  // Status Action Modal State
  const [activeAction, setActiveAction] = useState<ActionPayload | null>(null);
  const [actionRemarks, setActionRemarks] = useState("");
  const [receivedLinesState, setReceivedLinesState] = useState<
    Record<string, { quantityReceived: number; targetSublocationId?: string }>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTransfers = async () => {
    try {
      const res = await fetch("/api/admin/transfers");
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch {
      toast.error("Pipeline Exception", { description: "Failed synchronizing transfer order indices." });
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

  // Prepare & open status transition dialog
  const openStatusActionModal = (
    order: TransferOrderRow, 
    targetStatus: TransferOrderRow["status"], 
    title: string, 
    description: string, 
    toastSuccess: string
  ) => {
    setActionRemarks(order.remarks || "");
    
    // Initialize line-item state for partial/full receiving updates
    const initialLinesState: Record<string, { quantityReceived: number; targetSublocationId?: string }> = {};
    order.lines.forEach((line) => {
      initialLinesState[line.id] = {
        quantityReceived: line.quantityReceived ?? line.quantity,
        targetSublocationId: line.targetSublocationId || undefined,
      };
    });

    setReceivedLinesState(initialLinesState);
    setActiveAction({ order, targetStatus, title, description, toastSuccess });
  };

  // Submit Status Change with Payload
  const handleExecuteStatusUpdate = async () => {
    if (!activeAction) return;
    setIsSubmitting(true);

    const formattedReceivedLines = activeAction.order.lines.map((line) => ({
      lineId: line.id,
      quantityReceived: receivedLinesState[line.id]?.quantityReceived ?? line.quantity,
      targetSublocationId: receivedLinesState[line.id]?.targetSublocationId || line.targetSublocationId,
    }));

    const payload = {
      id: activeAction.order.id,
      status: activeAction.targetStatus,
      remarks: actionRemarks,
      receivedLines: activeAction.targetStatus === "RECEIVED" ? formattedReceivedLines : undefined,
    };

    try {
      const r = await fetch(`/api/admin/transfers/${activeAction.order.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (r.ok) {
        if (activeAction.targetStatus === "CANCELLED") {
          toast.warning(activeAction.toastSuccess);
        } else {
          toast.success(activeAction.toastSuccess);
        }
        await fetchTransfers();
        setActiveAction(null);
      } else {
        const err = await r.json();
        toast.error(err.error || "Execution pipeline failure.");
      }
    } catch {
      toast.error("Network communication failure.");
    } finally {
      setIsSubmitting(false);
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
            placeholder="Search transfer number, site label..."
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
          Loading inter-depot fulfillment pipeline records...
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
                {filteredOrders.map((order) => {
                  const isRowExpanded = !!expandedRows[order.id];
                  const isClosedRecord = order.status === "RECEIVED" || order.status === "CANCELLED";
                  const canEdit = order.status === "DRAFT" || order.status === "PENDING";
                  
                  return (
                    <Fragment key={order.id}>
                      <tr className={`hover:bg-muted/10 transition-colors ${isClosedRecord ? "bg-muted/5 opacity-80" : ""}`}>
                        
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

                        <td className="p-4 font-mono font-bold text-foreground">
                          {order.transferNumber}
                        </td>

                        <td className="p-4 text-muted-foreground font-medium max-w-[160px] truncate">
                          <div className="flex items-center gap-1.5">
                            <Warehouse className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                            <span className="truncate">{order.sourceLocationName}</span>
                          </div>
                        </td>

                        <td className="p-4 text-center text-muted-foreground/40">
                          <ArrowRight className="w-4 h-4 mx-auto" />
                        </td>

                        <td className="p-4 text-muted-foreground font-medium max-w-[160px] truncate">
                          <div className="flex items-center gap-1.5">
                            <Warehouse className="w-3.5 h-3.5 text-blue-500/60 shrink-0" />
                            <span className="truncate">{order.targetLocationName}</span>
                          </div>
                        </td>

                        <td className="p-4 text-center">
                          <Badge variant="secondary" className="text-[10px] font-mono h-5 py-0 bg-muted px-1.5 text-muted-foreground font-normal">
                            {order.linesCount} {order.linesCount === 1 ? "SKU" : "SKUs"}
                          </Badge>
                        </td>

                        <td className="p-4">
                          <Badge variant="outline" className={`text-[10px] tracking-tight font-semibold py-0.5 px-2 ${getStatusBadgeVariant(order.status)}`}>
                            {order.status}
                          </Badge>
                        </td>

                        <td className="p-4">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* VIEW DETAILS MODAL TRIGGER */}
                            <Button
                              onClick={() => setViewingOrder(order)}
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              title="View Transfer Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>

                            {/* DRAFT -> PENDING */}
                            {(order.status === "DRAFT" && order.linesCount > 0) && (
                              <Button
                                onClick={() => openStatusActionModal(
                                  order,
                                  "PENDING",
                                  "Confirm Authorization Request",
                                  `Are you sure you want to request approval for ${order.transferNumber}?`,
                                  "Manifest pending approval"
                                )}
                                variant="outline"
                                className="h-7 text-[10px] px-2 font-bold text-blue-600 bg-blue-50/50 hover:bg-blue-100 border-blue-200"
                              >
                                Submit Order
                              </Button>
                            )}

                            {/* PENDING -> IN_TRANSIT */}
                            {order.status === "PENDING" && (
                              <Button
                                onClick={() => openStatusActionModal(
                                  order,
                                  "IN_TRANSIT",
                                  "Confirm Cargo Dispatch",
                                  `This action will deduct items from ${order.sourceLocationName} departure storage assets.`,
                                  "Consignment Dispatched In-Transit"
                                )}
                                variant="outline"
                                className="h-7 text-[10px] px-2 font-bold text-purple-600 bg-purple-50/50 hover:bg-purple-100 border-purple-200"
                              >
                                Dispatch Cargo
                              </Button>
                            )}

                            {/* IN_TRANSIT -> RECEIVED / CANCELLED */}
                            {order.status === "IN_TRANSIT" && (
                              <Fragment>
                                <Button
                                  onClick={() => openStatusActionModal(
                                    order,
                                    "RECEIVED",
                                    "Confirm Receipt Settlement",
                                    "Verify received stock quantities to shift inventory balances into destination bins.",
                                    "Consignment Received & Settled"
                                  )}
                                  variant="outline"
                                  className="h-7 text-[10px] px-2 font-bold text-emerald-600 bg-emerald-50/50 hover:bg-emerald-100 border-emerald-200"
                                >
                                  Receive Stock
                                </Button>

                                <Button
                                  onClick={() => openStatusActionModal(
                                    order,
                                    "CANCELLED",
                                    "Abort Freight Deployment",
                                    "Void active transit routing allocations completely? Quantities will safely rollback.",
                                    "Shipment routing aborted"
                                  )}
                                  variant="ghost"
                                  className="h-7 text-[10px] px-2 font-medium text-destructive hover:bg-destructive/10"
                                >
                                  Abort
                                </Button>
                              </Fragment>
                            )}

                            {/* EDIT ROUTE */}
                            {canEdit && (
                              <Link 
                                href={`/dashboard/transfers/${order.id}/edit`}
                                className="px-1.5 text-xs font-semibold gap-1 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </Link>
                            )}

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

                      {/* Accordion Line Expansion */}
                      {isRowExpanded && (
                        <tr key={`Sub_${order.id}`}>
                          <td colSpan={8} className="p-0 bg-muted/10 border-b">
                            <div className="px-14 py-4 space-y-3 animate-in fade-in duration-100">
                              <div className="flex flex-col sm:flex-row justify-between sm:items-center text-[11px] text-muted-foreground border-b pb-2 gap-2">
                                <div className="flex flex-wrap gap-4">
                                  <div>Issued Date: <strong className="text-foreground">{new Date(order.createdAt).toLocaleDateString()}</strong></div>
                                  {order.transferredAt && <div>Dispatched: <strong className="text-foreground">{new Date(order.transferredAt).toLocaleDateString()}</strong></div>}
                                  {order.receivedAt && <div>Arrived: <strong className="text-foreground">{new Date(order.receivedAt).toLocaleDateString()}</strong></div>}
                                </div>
                                {canEdit && (
                                  <Button asChild variant="outline" size="xs" className="h-6 text-[10px] gap-1 shrink-0">
                                    <Link href={`/dashboard/transfers/${order.id}/edit`}>
                                      <Edit3 className="w-3 h-3" /> Edit Manifest
                                    </Link>
                                  </Button>
                                )}
                              </div>

                              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                <FileText className="w-3.5 h-3.5" /> Consignment Manifest Stock breakdown lines
                              </div>

                              <div className="border rounded-lg bg-background overflow-hidden shadow-2xs">
                                <table className="w-full text-left border-collapse text-xs">
                                  <thead>
                                    <tr className="bg-muted/30 text-[10px] font-bold uppercase tracking-tight text-muted-foreground border-b">
                                      <th className="p-2">SKU Product</th>
                                      <th className="p-2">Source Bin</th>
                                      <th className="p-2">Target Bin</th>
                                      <th className="p-2 text-right">Transfer Qty</th>
                                      <th className="p-2 text-right">Received Qty</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y text-[11px]">
                                    {order.lines.map((line) => (
                                      <tr key={line.id} className="hover:bg-muted/5">
                                        <td className="p-2 font-medium text-foreground">
                                          {line.productName} <span className="font-mono text-[9px] text-muted-foreground ml-1">({line.productSku})</span>
                                        </td>
                                        <td className="p-2 text-muted-foreground">{line.sourceBinName || "Bulk Floor"}</td>
                                        <td className="p-2 text-muted-foreground">{line.targetBinName || "Bulk Floor"}</td>
                                        <td className="p-2 text-right font-mono font-semibold text-foreground">{line.quantity.toLocaleString()}</td>
                                        <td className="p-2 text-right font-mono text-emerald-600 font-semibold">
                                          {line.quantityReceived != null ? line.quantityReceived.toLocaleString() : "-"}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>

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

      {/* ==================== 1. VIEW TRANSFER ORDER DETAILS MODAL ==================== */}
      <Dialog open={!!viewingOrder} onOpenChange={(open) => !open && setViewingOrder(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Transfer Order {viewingOrder?.transferNumber}
              </DialogTitle>
              {viewingOrder && (
                <Badge variant="outline" className={getStatusBadgeVariant(viewingOrder.status)}>
                  {viewingOrder.status}
                </Badge>
              )}
            </div>
            <DialogDescription className="text-xs">
              Complete dispatch and receipt manifest audit history.
            </DialogDescription>
          </DialogHeader>

          {viewingOrder && (
            <div className="space-y-4 my-2 text-xs">
              {/* Route Summary Card */}
              <div className="grid grid-cols-2 gap-4 p-3 bg-muted/30 border rounded-lg">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                    <Warehouse className="w-3 h-3" /> Source Location
                  </span>
                  <p className="font-semibold text-foreground text-sm">{viewingOrder.sourceLocationName}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                    <Warehouse className="w-3 h-3 text-blue-500" /> Target Destination
                  </span>
                  <p className="font-semibold text-foreground text-sm">{viewingOrder.targetLocationName}</p>
                </div>
              </div>

              {/* Timestamp Tracking Timeline */}
              <div className="grid grid-cols-3 gap-2 border-y py-2 text-[11px]">
                <div>
                  <span className="text-muted-foreground block text-[10px]">Created On</span>
                  <strong className="text-foreground">{new Date(viewingOrder.createdAt).toLocaleString()}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Dispatched On</span>
                  <strong className="text-foreground">
                    {viewingOrder.transferredAt ? new Date(viewingOrder.transferredAt).toLocaleString() : "Not Dispatched"}
                  </strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Received On</span>
                  <strong className="text-foreground">
                    {viewingOrder.receivedAt ? new Date(viewingOrder.receivedAt).toLocaleString() : "Not Settled"}
                  </strong>
                </div>
              </div>

              {/* Items Breakdown Table */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Manifest Line Breakdown ({viewingOrder.lines.length} Items)
                </span>
                <div className="border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 border-b sticky top-0 text-[10px] uppercase font-semibold">
                      <tr>
                        <th className="p-2">Item / SKU</th>
                        <th className="p-2">Source Bin</th>
                        <th className="p-2">Target Bin</th>
                        <th className="p-2 text-right">Qty Dispatched</th>
                        <th className="p-2 text-right">Qty Received</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {viewingOrder.lines.map((l) => (
                        <tr key={l.id}>
                          <td className="p-2 font-medium">{l.productName} <span className="text-muted-foreground">({l.productSku})</span></td>
                          <td className="p-2 text-muted-foreground">{l.sourceBinName}</td>
                          <td className="p-2 text-muted-foreground">{l.targetBinName}</td>
                          <td className="p-2 text-right font-mono font-semibold">{l.quantity}</td>
                          <td className="p-2 text-right font-mono text-emerald-600 font-semibold">
                            {l.quantityReceived != null ? l.quantityReceived : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Remarks */}
              {viewingOrder.remarks && (
                <div className="bg-muted/20 border p-2.5 rounded-lg text-xs">
                  <span className="font-bold block text-[10px] uppercase text-muted-foreground mb-0.5">Remarks / Logistics Notes:</span>
                  <p className="italic text-muted-foreground">{viewingOrder.remarks}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setViewingOrder(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== 2. UPDATE STATUS & REMARKS/RECEIVE MODAL ==================== */}
      <Dialog open={!!activeAction} onOpenChange={(open) => !open && setActiveAction(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{activeAction?.title}</DialogTitle>
            <DialogDescription className="text-xs">
              {activeAction?.description}
            </DialogDescription>
          </DialogHeader>

          {activeAction && (
            <div className="space-y-4 my-2 text-xs">
              
              {/* Detailed Receiving Inputs if target state is RECEIVED */}
              {activeAction.targetStatus === "RECEIVED" && (
                <div className="space-y-2 border rounded-lg p-3 bg-slate-50/50 dark:bg-slate-900/50">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Verify Incoming Line Quantities
                  </Label>
                  <div className="border rounded-md bg-background overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/40 border-b text-[10px] uppercase font-semibold">
                        <tr>
                          <th className="p-2">Item</th>
                          <th className="p-2 text-center">Shipped</th>
                          <th className="p-2 w-32 text-right">Qty Received</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {activeAction.order.lines.map((line) => (
                          <tr key={line.id}>
                            <td className="p-2 font-medium">
                              {line.productName}
                              <span className="block text-[10px] text-muted-foreground font-mono">{line.productSku}</span>
                            </td>
                            <td className="p-2 text-center font-mono font-semibold">{line.quantity}</td>
                            <td className="p-2">
                              <Input
                                type="number"
                                step="any"
                                min="0"
                                max={line.quantity}
                                value={receivedLinesState[line.id]?.quantityReceived ?? line.quantity}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setReceivedLinesState((prev) => ({
                                    ...prev,
                                    [line.id]: {
                                      ...prev[line.id],
                                      quantityReceived: val,
                                    },
                                  }));
                                }}
                                className="h-7 text-xs font-mono text-right"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Remarks Field */}
              <div className="space-y-1.5">
                <Label htmlFor="action-remarks" className="text-xs font-semibold">
                  Update Manifest Remarks / Status Notes (Optional)
                </Label>
                <Textarea
                  id="action-remarks"
                  placeholder="Add notes regarding stock condition, dispatch driver, or verification findings..."
                  value={actionRemarks}
                  onChange={(e) => setActionRemarks(e.target.value)}
                  className="text-xs min-h-[70px]"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button size="sm" variant="outline" onClick={() => setActiveAction(null)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleExecuteStatusUpdate}
              disabled={isSubmitting}
              className={activeAction?.targetStatus === "CANCELLED" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              {isSubmitting ? "Processing..." : "Confirm Status Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}