"use client";

import React, { useEffect, useState, Fragment } from "react";
import Link from "next/link";
import { 
  Plus, Search, ArrowRightLeft, Warehouse, ArrowRight, 
  FileText, ChevronDown, ChevronUp, Edit3, Eye, CheckCircle2, 
  AlertCircle, PackageCheck, Truck, Ban, Calendar, User,
  RefreshCw,
  ChevronRight,
  Building2,
  MessageSquare,
  FileSpreadsheet,
  Pencil
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
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { TransferOrderRow } from "@/types/transfer-dto.type";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FieldGroup } from "@/components/ui/field";
import { TransferStatusUpdateForm, UnifiedStatusUpdateValues } from "@/components/transfer/status-form";

// Interfaces

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
  // const [actionRemarks, setActionRemarks] = useState("");
  // const [receivedLinesState, setReceivedLinesState] = useState<
  //   Record<
  //     string,
  //     {
  //       quantityReceived: number;
  //       targetSublocationId?: string;
  //       discrepancyReason: string;
  //     }
  //   >
  // >({});
  // const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTransfers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/transfers");
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      } else {
        toast.error("Pipeline Exception", {
          description: "Failed synchronizing transfer order indices.",
        });
      }
    } catch {
      toast.error("Pipeline Exception", {
        description: "Failed synchronizing transfer order indices.",
      });
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

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "DRAFT":
        return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300";
      case "PENDING":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300";
      case "IN_TRANSIT":
        return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300";
      case "RECEIVED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300";
      case "PARTIALLY_RECEIVED":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300";
      case "RECEIVED_DISCREPANCY":
        return "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300";
      case "CANCELLED":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const formatReasonLabel = (reason?: string | null) => {
    if (!reason) return "N/A";
    switch (reason) {
      case "DAMAGED_IN_TRANSIT":
        return "Damaged In Transit";
      case "MISSING_BOX":
        return "Missing Box / Shrinkage";
      case "VENDOR_SHORTAGE":
        return "Vendor / Dispatch Shortage";
      case "OVERAGE_UNCOUNTED":
        return "Overage / Extra Shipped";
      case "OTHER":
        return "Other Variance";
      default:
        return reason;
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
    // setActionRemarks(order.remarks || "");

    // Initialize line-item state for partial/full receiving updates
    const initialLinesState: Record<
      string,
      { quantityReceived: number; targetSublocationId?: string; discrepancyReason: string }
    > = {};

    order.lines.forEach((line) => {
      initialLinesState[line.id] = {
        quantityReceived: line.quantityReceived ?? line.quantity,
        targetSublocationId: line.targetSublocationId || undefined,
        discrepancyReason: line.discrepancyReason || "",
      };
    });

    // setReceivedLinesState(initialLinesState);
    setActiveAction({ order, targetStatus, title, description, toastSuccess });
  };

  // Submit Status Change with Payload
  // const handleExecuteStatusUpdate = async () => {
  //   if (!activeAction) return;
  //   setIsSubmitting(true);

  //   const formattedReceivedLines = activeAction.order.lines.map((line) => ({
  //     lineId: line.id,
  //     quantityReceived: receivedLinesState[line.id]?.quantityReceived ?? line.quantity,
  //     discrepancyReason: receivedLinesState[line.id]?.discrepancyReason || null,
  //     targetSublocationId:
  //       receivedLinesState[line.id]?.targetSublocationId || line.targetSublocationId,
  //   }));

  //   const payload = {
  //     id: activeAction.order.id,
  //     status: activeAction.targetStatus,
  //     remarks: actionRemarks,
  //     receivedLines:
  //       activeAction.targetStatus === "RECEIVED" ? formattedReceivedLines : undefined,
  //   };

  //   try {
  //     const r = await fetch(`/api/admin/transfers/${activeAction.order.id}/status`, {
  //       method: "PATCH",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify(payload),
  //     });

  //     if (r.ok) {
  //       if (activeAction.targetStatus === "CANCELLED") {
  //         toast.warning(activeAction.toastSuccess);
  //       } else {
  //         toast.success(activeAction.toastSuccess);
  //       }
  //       await fetchTransfers();
  //       setActiveAction(null);
  //     } else {
  //       const err = await r.json();
  //       toast.error(err.error || "Execution pipeline failure.");
  //     }
  //   } catch {
  //     toast.error("Network communication failure.");
  //   } finally {
  //     setIsSubmitting(false);
  //   }
  // };

  const filteredOrders = orders.filter((order) => {
    const normalized = searchQuery.toLowerCase();
    return (
      order.transferNumber.toLowerCase().includes(normalized) ||
      order.sourceLocationName.toLowerCase().includes(normalized) ||
      order.targetLocationName.toLowerCase().includes(normalized) ||
      (order.remarks?.toLowerCase().includes(normalized) ?? false)
    );
  });

  const handleFormSubmit = async (values: UnifiedStatusUpdateValues) => {
    if (!activeAction) return;

    const payload = {
      id: activeAction.order.id,
      status: values.status,
      remarks: values.remarks,
      receivedLines:
        values.status === "RECEIVED" || values.status === "PARTIALLY_RECEIVED"
          ? values.lines?.map((line) => ({
              lineId: line.lineId,
              quantityReceived: line.quantityReceived,
              discrepancyReason: line.discrepancyReason || null,
            }))
          : undefined,
    };

    try {
      const r = await fetch(`/api/admin/transfers/${activeAction.order.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (r.ok) {
        if (values.status === "CANCELLED") {
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
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <FileSpreadsheet className="h-6 w-6 text-primary" />
            Transfer Orders
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Manage multi-location inventory dispatches, verify incoming stock, and reconcile receiving discrepancies.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchTransfers} disabled={isLoading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
            Sync
          </Button>
          <Button size="sm" onClick={() => (window.location.href = "/dashboard/transfers/create")}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New Transfer Order
          </Button>
        </div>
      </div>

      {/* Toolbar / Search Filter */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Filter by transfer #, origin, destination, or remarks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs h-9"
          />
        </div>
        <div className="text-xs text-muted-foreground font-medium bg-muted/50 border px-3 py-1.5 rounded-lg flex items-center gap-1.5 self-start sm:self-auto">
          <ArrowRightLeft className="w-3.5 h-3.5 text-muted-foreground" />
          Active Manifest lines: <span className="font-bold text-foreground">{orders.length}</span>
        </div>
      </div>
      
      {/* Top Header Row Panel */}
      {/* <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
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
      </div> */}

      {/* Control Utility Toolbar */}
      {/* <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
      </div> */}

      {/* Main Table Matrix Render */}
      {/* Orders Table */}
      <div className="border rounded-lg bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
              <tr>
                <th className="p-3 w-10 text-center"></th>
                <th className="p-3">Transfer #</th>
                <th className="p-3">Source Location</th>
                <th className="p-3">Destination</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Lines</th>
                <th className="p-3 text-right">Created At</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                    Synchronizing transfer manifests...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    No transfer orders match the given criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const isExpanded = !!expandedRows[order.id];
                  const totalShipped = order.lines.reduce((acc, l) => acc + l.quantity, 0);
                  const totalReceived = order.lines.reduce(
                    (acc, l) => acc + (l.quantityReceived ?? 0),
                    0
                  );
                  const hasDiscrepancy = order.lines.some(
                    (l) => l.discrepancyQuantity !== null && l.discrepancyQuantity !== 0
                  );
                  const isClosedRecord = order.status === "RECEIVED" || order.status === "CANCELLED";
                  const canEdit = order.status === "DRAFT" || order.status === "PENDING";

                  return (
                    <React.Fragment key={order.id}>
                      <tr className={`hover:bg-muted/30 transition-colors ${isClosedRecord ? "bg-muted/5 opacity-80" : ""}`}>
                        <td className="p-3 text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => toggleRowExpand(order.id)}
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </td>
                        <td className="p-3 font-semibold font-mono text-foreground">
                          {order.transferNumber}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{order.sourceLocationName}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{order.targetLocationName}</span>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-semibold border ${getStatusBadgeVariant(
                              order.status
                            )}`}
                          >
                            {order.status.replace(/_/g, " ")}
                          </Badge>
                        </td>
                        <td className="p-3 text-center font-mono">
                          {order.lines.length} items
                        </td>
                        <td className="p-3 text-right font-mono text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => setViewingOrder(order)}
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Inspect Manifest</TooltipContent>
                              </Tooltip>
                            </TooltipProvider> */}

                            {order.status === "DRAFT" && (
                              <Button
                                size="sm"
                                className="h-7 text-[11px] gap-1"
                                asChild
                              >
                                <Link href={`/dashboard/transfers/${order.id}/edit`}>
                                  <Pencil className="h-3.5 w-3.5" />
                                  Edit Manifest
                                </Link>
                              </Button>
                            )}

                            { order.status === "PENDING" && (
                              <Button
                                size="sm"
                                className="h-7 text-[11px] gap-1"
                                onClick={() =>
                                  openStatusActionModal(
                                    order,
                                    "IN_TRANSIT",
                                    "Dispatch Transfer Order",
                                    "Confirm dispatching line items from source location. Stock will be debited.",
                                    "Transfer order dispatched and in transit."
                                  )
                                }
                              >
                                <Truck className="h-3.5 w-3.5" />
                                Dispatch
                              </Button>
                            )}

                            {order.status === "IN_TRANSIT" && (
                              <Button
                                size="sm"
                                className="h-7 text-[11px] gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() =>
                                  openStatusActionModal(
                                    order,
                                    "RECEIVED",
                                    "Receive & Verify Manifest",
                                    "Verify counts and log any damaged or missing inventory prior to crediting target stock.",
                                    "Transfer order processed and target inventory updated."
                                  )
                                }
                              >
                                <PackageCheck className="h-3.5 w-3.5" />
                                Receive
                              </Button>
                            )}

                            { order.status !== "IN_TRANSIT" && order.status !== "RECEIVED" &&
                              order.status !== "PARTIALLY_RECEIVED" &&
                              order.status !== "RECEIVED_DISCREPANCY" &&
                              order.status !== "CANCELLED" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                  onClick={() =>
                                    openStatusActionModal(
                                      order,
                                      "CANCELLED",
                                      "Cancel Transfer Order",
                                      "Are you sure you want to cancel this transfer order?",
                                      "Transfer order cancelled."
                                    )
                                  }
                                >
                                  <Ban className="h-3.5 w-3.5" />
                                </Button>
                              )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Accordion Line Breakdown */}
                      {isExpanded && (
                        <tr className="bg-muted/15 border-b">
                          <td colSpan={8} className="p-4">
                            <div className="space-y-3 pl-8">
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

                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                  Manifest Line Items & Breakdown
                                </h4>
                                {(order.status === "RECEIVED" ||
                                  order.status === "PARTIALLY_RECEIVED" ||
                                  order.status === "RECEIVED_DISCREPANCY") && (
                                  <div className="text-[11px] font-mono">
                                    Total Shipped: <span className="font-semibold">{totalShipped}</span> |{" "}
                                    Total Received:{" "}
                                    <span
                                      className={
                                        totalReceived < totalShipped
                                          ? "font-semibold text-amber-600"
                                          : totalReceived > totalShipped
                                          ? "font-semibold text-blue-600"
                                          : "font-semibold text-emerald-600"
                                      }
                                    >
                                      {totalReceived}
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className="border rounded bg-background overflow-hidden">
                                <table className="w-full text-left text-xs">
                                  <thead className="bg-muted/40 border-b text-[10px] uppercase font-semibold">
                                    <tr>
                                      <th className="p-2">Item SKU</th>
                                      <th className="p-2">Product</th>
                                      <th className="p-2 text-center">Shipped</th>
                                      <th className="p-2 text-center">Received</th>
                                      <th className="p-2 text-center">Variance</th>
                                      <th className="p-2">Reason / Tag</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y">
                                    {order.lines.map((line) => {
                                      const variance = line.discrepancyQuantity ?? 0;
                                      return (
                                        <tr key={line.id}>
                                          <td className="p-2 font-mono text-muted-foreground">
                                            {line.productSku}
                                          </td>
                                          <td className="p-2 font-medium">{line.productName}</td>
                                          <td className="p-2 text-center font-mono font-semibold">
                                            {line.quantity}
                                          </td>
                                          <td className="p-2 text-center font-mono">
                                            {line.quantityReceived ?? "—"}
                                          </td>
                                          <td className="p-2 text-center font-mono">
                                            {line.quantityReceived === undefined ||
                                            line.quantityReceived === null ? (
                                              "—"
                                            ) : variance === 0 ? (
                                              <span className="text-muted-foreground">0</span>
                                            ) : variance < 0 ? (
                                              <span className="text-amber-600 font-semibold">
                                                {variance}
                                              </span>
                                            ) : (
                                              <span className="text-blue-600 font-semibold">
                                                +{variance}
                                              </span>
                                            )}
                                          </td>
                                          <td className="p-2">
                                            {line.discrepancyReason ? (
                                              <Badge variant="outline" className="text-[10px]">
                                                {formatReasonLabel(line.discrepancyReason)}
                                              </Badge>
                                            ) : (
                                              <span className="text-muted-foreground italic text-[10px]">
                                                None
                                              </span>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>

                              {order.remarks && (
                                <p className="text-[11px] text-muted-foreground italic">
                                  <span className="font-semibold text-foreground">Remarks:</span>{" "}
                                  {order.remarks}
                                </p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* INSPECTION VIEW MODAL */}

      <Dialog open={!!viewingOrder} onOpenChange={(open) => !open && setViewingOrder(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-mono flex items-center gap-2">
                {viewingOrder?.transferNumber}
                <Badge
                  variant="outline"
                  className={`text-[10px] font-semibold border ${getStatusBadgeVariant(
                    viewingOrder?.status || ""
                  )}`}
                >
                  {viewingOrder?.status.replace(/_/g, " ")}
                </Badge>
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              Manifest Audit & Route Details
            </DialogDescription>
          </DialogHeader>

          {viewingOrder && (
            <div className="space-y-5 my-2 text-xs">
              {/* Route Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border rounded-lg p-3 bg-muted/20">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    Origin (Source)
                  </span>
                  <div className="font-semibold text-sm flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-primary" />
                    {viewingOrder.sourceLocationName}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    Destination (Target)
                  </span>
                  <div className="font-semibold text-sm flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-primary" />
                    {viewingOrder.targetLocationName}
                  </div>
                </div>
              </div>

              {/* Line Items Detail */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Manifest Line Breakdown
                </h4>
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 border-b text-[10px] uppercase font-semibold">
                      <tr>
                        <th className="p-2">SKU</th>
                        <th className="p-2">Product</th>
                        <th className="p-2 text-center">Shipped</th>
                        <th className="p-2 text-center">Received</th>
                        <th className="p-2 text-center">Variance</th>
                        <th className="p-2">Discrepancy Tag</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {viewingOrder.lines.map((line) => {
                        const variance = line.discrepancyQuantity ?? 0;
                        return (
                          <tr key={line.id}>
                            <td className="p-2 font-mono text-muted-foreground">
                              {line.productSku}
                            </td>
                            <td className="p-2 font-medium">{line.productName}</td>
                            <td className="p-2 text-center font-mono font-semibold">
                              {line.quantity}
                            </td>
                            <td className="p-2 text-center font-mono">
                              {line.quantityReceived ?? "—"}
                            </td>
                            <td className="p-2 text-center font-mono">
                              {line.quantityReceived === undefined ||
                              line.quantityReceived === null ? (
                                "—"
                              ) : variance === 0 ? (
                                <span className="text-muted-foreground">0</span>
                              ) : variance < 0 ? (
                                <span className="text-amber-600 font-semibold">{variance}</span>
                              ) : (
                                <span className="text-blue-600 font-semibold">+{variance}</span>
                              )}
                            </td>
                            <td className="p-2">
                              {line.discrepancyReason ? (
                                <Badge variant="outline" className="text-[10px]">
                                  {formatReasonLabel(line.discrepancyReason)}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground italic text-[10px]">
                                  None
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Remarks */}
              {viewingOrder.remarks && (
                <div className="border rounded-md p-3 bg-muted/10 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" /> Audit Remarks & Inspection Findings
                  </span>
                  <p className="text-xs text-foreground whitespace-pre-wrap">
                    {viewingOrder.remarks}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setViewingOrder(null)}>
              Close Audit View
            </Button>
            { (viewingOrder?.status === "DRAFT" || viewingOrder?.status  === "PENDING") && (
                <Button asChild size="sm">
                  <Link href={`/dashboard/transfers/${viewingOrder.id}/edit`}>
                    <Edit3 className="w-3 h-3" /> Edit Manifest
                  </Link>
                </Button>
              )
            }
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* UPDATE STATUS & REMARKS/RECEIVE MODAL */}
      <Dialog open={!!activeAction} onOpenChange={(open) => !open && setActiveAction(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {activeAction?.title}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {activeAction?.description}
            </DialogDescription>
          </DialogHeader>

          

          {activeAction && (
            <>
              {/* Route Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-dashed rounded-lg p-3 bg-muted/20">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    Origin (Source)
                  </span>
                  <div className="font-semibold text-sm flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-primary" />
                    {activeAction.order.sourceLocationName}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    Destination (Target)
                  </span>
                  <div className="font-semibold text-sm flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-primary" />
                    {activeAction.order.targetLocationName}
                  </div>
                </div>
              </div>
              <TransferStatusUpdateForm
                activeAction={activeAction}
                onSubmit={handleFormSubmit}
                onCancel={() => setActiveAction(null)}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
