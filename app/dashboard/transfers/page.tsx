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
  Pencil,
  MoreHorizontalIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { TransferOrderRow } from "@/types/transfer-dto.type";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TransferStatusUpdateForm, UnifiedStatusUpdateValues } from "@/components/transfer/status-form";
import PageHeader from "@/components/layout/dashboard/PageHeader";
import SearchInput from "@/components/shared/search-input";
import { formatReasonLabel, getStatusBadgeVariant } from "@/helpers/transferOrder.helper";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import useSWR from "swr";
import { TransferFilters } from "@/components/transfer/transfer-filter";

  const PAGE_SIZE = 10;

interface ActionPayload {
  order: TransferOrderRow;
  targetStatus: TransferOrderRow["status"];
  title: string;
  description: string;
  toastSuccess: string;
}

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error("Failed to resolve team member directory.");
  return res.json();
});

export default function TransferOrdersListPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const PAGE_SIZE = 10;

  const [status, setStatus] = useState("ALL");
  const [sourceLocationId, setSourceLocationId] = useState("ALL");
  const [targetLocationId, setTargetLocationId] = useState("ALL");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPageIndex(0);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset page to 1 whenever any dropdown filter changes
  const handleStatusChange = (val: string) => {
    setStatus(val);
    setPageIndex(0);
  };

  const handleSourceChange = (val: string) => {
    setSourceLocationId(val);
    setPageIndex(0);
  };

  const handleTargetChange = (val: string) => {
    setTargetLocationId(val);
    setPageIndex(0);
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setDebouncedSearch("");
    setStatus("ALL");
    setSourceLocationId("ALL");
    setTargetLocationId("ALL");
    setPageIndex(0);
  };

  const { data: locationsData } = useSWR("/api/locations/lookup", fetcher);
  const locations = locationsData?.data || [];

  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [viewingOrder, setViewingOrder] = useState<TransferOrderRow | null>(null);
  const [activeAction, setActiveAction] = useState<ActionPayload | null>(null);

  const queryString = new URLSearchParams({
    search: encodeURIComponent(debouncedSearch),
    status,
    sourceLocationId,
    targetLocationId,
    page: String(pageIndex),
    limit: String(PAGE_SIZE),
  }).toString();

  const {
    data: payload,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR(
    `/api/admin/transfers/filtered?${queryString}`,
    fetcher,
    {
      keepPreviousData: true,
      revalidateOnFocus: false,
    }
  );

  // Directly use the server response (Server handles search & pagination)
  const transfers: TransferOrderRow[] = payload?.data || [];
  const totalRecords = payload?.totalRecords || 0;
  const pageCount = payload?.pageCount || 0;

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  const toggleRowExpand = (id: string) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const openStatusActionModal = (
    order: TransferOrderRow,
    targetStatus: TransferOrderRow["status"],
    title: string,
    description: string,
    toastSuccess: string
  ) => {
    setActiveAction({ order, targetStatus, title, description, toastSuccess });
  };

  const handleFormSubmit = async (values: UnifiedStatusUpdateValues) => {
    if (!activeAction) return;

    const bodyPayload = {
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
        body: JSON.stringify(bodyPayload),
      });

      if (r.ok) {
        if (values.status === "CANCELLED") {
          toast.warning(activeAction.toastSuccess);
        } else {
          toast.success(activeAction.toastSuccess);
        }
        await mutate();
        setActiveAction(null);
      } else {
        const err = await r.json();
        toast.error(err.error || "Execution pipeline failure.");
      }
    } catch {
      toast.error("Network communication failure.");
    }
  };

  if (error) {
    return (
      <div className="p-6 text-center text-xs text-red-500 bg-destructive/10 border border-destructive/20 rounded-xl font-medium">
        Hydration Failure: Failed resolving enterprise personnel authorization directory profiles.
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6 text-xs">
      <PageHeader
        title="Transfer Orders"
        description="Manage multi-location inventory dispatches, verify incoming stock, and reconcile receiving discrepancies."
        icon={FileSpreadsheet}
        className="border-b border-border pb-4"
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => mutate()}
            disabled={isLoading || isValidating}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 mr-1.5 ${
                isLoading || isValidating ? "animate-spin" : ""
              }`}
            />
            Sync
          </Button>
          <Button asChild size="sm">
            <Link href="/dashboard/transfers/create">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              New Transfer Order
            </Link>
          </Button>
        </div>
      </PageHeader>


      {/* Toolbar / Search Filter */}
      <div className="flex items-center justify-between gap-4">
        {/* <TransferFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        status={status}
        onStatusChange={handleStatusChange}
        sourceLocationId={sourceLocationId}
        onSourceLocationChange={handleSourceChange}
        targetLocationId={targetLocationId}
        onTargetLocationChange={handleTargetChange}
        locations={locations}
        onResetFilters={handleResetFilters}
      /> */}

        <div className="w-full flex gap-2 sm:max-w-lg">
          <SearchInput
            placeholder="Filter team members by name, email..."
            searchQuery={searchQuery}
            setSearchQuery={handleSearchChange}
            isLoading={isValidating && !isLoading}
          />
          <div className="w-full sm:w-44">
            <Select value={status} onValueChange={handleStatusChange}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="POSTED">Approved</SelectItem>
                <SelectItem value="VOIDED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="text-xs text-muted-foreground font-medium bg-muted/50 border px-3 py-1.5 rounded-lg flex items-center gap-1.5 self-start sm:self-auto">
          <ArrowRightLeft className="w-3.5 h-3.5 text-muted-foreground" />
          Active Manifest Lines:{" "}
          <span className="font-bold text-foreground">{totalRecords}</span>
        </div>
      </div>


      {/* Orders Table */}
      <div className="space-y-4">
        <div className="border rounded-xl bg-card shadow-2xs overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="border-b border-border hover:bg-transparent">
                <TableHead className="w-[40px] p-3 text-center" />
                <TableHead className="w-[140px] text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Transfer #
                </TableHead>
                <TableHead className="w-[180px] text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Source Location
                </TableHead>
                <TableHead className="w-[180px] text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Destination
                </TableHead>
                <TableHead className="w-[120px] text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </TableHead>
                <TableHead className="w-[100px] text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Lines
                </TableHead>
                <TableHead className="w-[120px] text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Created At
                </TableHead>
                <TableHead className="w-[110px] text-right pr-5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody className="text-xs font-medium divide-y divide-border/60">
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="p-20 text-center text-xs text-muted-foreground bg-card italic">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                    Synchronizing transfer manifests...
                  </TableCell>
                </TableRow>
              ) : transfers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <div className="border border-dashed rounded-xl p-6 text-center bg-muted/20">
                      <Truck className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                      <p className="text-xs font-medium text-muted-foreground">
                        No transfer orders match the given criteria.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                transfers.map((order) => {
                  const isExpanded = !!expandedRows[order.id];
                  const totalShipped = order.lines.reduce((acc, l) => acc + l.quantity, 0);
                  const totalReceived = order.lines.reduce((acc, l) => acc + (l.quantityReceived ?? 0), 0);
                  const isClosedRecord = order.status === "RECEIVED" || order.status === "CANCELLED";
                  const canEdit = order.status === "DRAFT" || order.status === "PENDING";

                  return (
                    <React.Fragment key={order.id}>
                      <TableRow className={`hover:bg-muted/40 transition-colors group align-middle ${isClosedRecord ? "bg-muted/5 opacity-80" : ""}`}>
                        {/* Expand Toggle Button */}
                        <TableCell className="p-3 text-center align-middle">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() => toggleRowExpand(order.id)}
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>

                        {/* Transfer # */}
                        <TableCell className="p-3.5 align-middle">
                          <div className="font-semibold font-mono text-foreground text-sm leading-tight group-hover:text-primary transition-colors">
                            {order.transferNumber}
                          </div>
                        </TableCell>

                        {/* Source Location */}
                        <TableCell className="p-3.5 align-middle">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Building2 className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                            <span className="truncate">{order.sourceLocationName}</span>
                          </div>
                        </TableCell>

                        {/* Destination Location */}
                        <TableCell className="p-3.5 align-middle">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Building2 className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                            <span className="truncate">{order.targetLocationName}</span>
                          </div>
                        </TableCell>

                        {/* Status Badge */}
                        <TableCell className="p-3.5 align-middle text-center">
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 h-5 font-semibold border ${getStatusBadgeVariant(order.status)}`}
                          >
                            {order.status.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>

                        {/* Line Item Count */}
                        <TableCell className="p-3.5 align-middle text-center font-mono text-muted-foreground">
                          {order.lines.length} items
                        </TableCell>

                        {/* Created At Date */}
                        <TableCell className="p-3.5 align-middle text-right font-mono text-[11px] text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString()}
<<<<<<< HEAD
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
=======
                        </TableCell>
>>>>>>> fba1f3a8f1cd8a24a0a45fcdfa13eedebab9d025

                        {/* Unified Action Dropdown Menu */}
                        <TableCell className="p-3.5 pr-5 align-middle text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8">
                                <MoreHorizontalIcon className="w-4 h-4" />
                                <span className="sr-only">Open menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setViewingOrder(order)}>
                                <Eye className="w-3.5 h-3.5 mr-2" /> Inspect 
                              </DropdownMenuItem>

                              {order.status === "DRAFT" && (
                                <DropdownMenuItem asChild>
                                  <Link href={`/dashboard/transfers/${order.id}/edit`}>
                                    <Edit3 className="w-3.5 h-3.5 mr-2" /> Edit 
                                  </Link>
                                </DropdownMenuItem>
                              )}

                              {order.status === "PENDING" && (
                                <DropdownMenuItem
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
                                  <Truck className="w-3.5 h-3.5 mr-2" /> Dispatch
                                </DropdownMenuItem>
                              )}

                              {order.status === "IN_TRANSIT" && (
                                <DropdownMenuItem
                                  className="text-emerald-600 focus:text-emerald-700"
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
                                  <PackageCheck className="w-3.5 h-3.5 mr-2" /> Receive
                                </DropdownMenuItem>
                              )}

                              {order.status !== "IN_TRANSIT" &&
                                order.status !== "RECEIVED" &&
                                order.status !== "PARTIALLY_RECEIVED" &&
                                order.status !== "RECEIVED_DISCREPANCY" &&
                                order.status !== "CANCELLED" && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      variant="destructive"
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
                                      <Ban className="w-3.5 h-3.5 mr-2" /> Cancel Order
                                    </DropdownMenuItem>
                                  </>
                                )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>

                      {/* Expanded Accordion Line Breakdown */}
                      {isExpanded && (
                        <TableRow className="bg-muted/15 border-b hover:bg-muted/15">
                          <TableCell colSpan={8} className="p-4">
                            <div className="space-y-3 pl-8">
                              <div className="flex flex-col sm:flex-row justify-between sm:items-center text-[11px] text-muted-foreground border-b pb-2 gap-2">
                                <div className="flex flex-wrap gap-4 font-mono">
                                  <div>Issued Date: <strong className="text-foreground">{new Date(order.createdAt).toLocaleDateString()}</strong></div>
                                  {order.transferredAt && <div>Dispatched: <strong className="text-foreground">{new Date(order.transferredAt).toLocaleDateString()}</strong></div>}
                                  {order.receivedAt && <div>Arrived: <strong className="text-foreground">{new Date(order.receivedAt).toLocaleDateString()}</strong></div>}
                                </div>
                                {canEdit && (
                                  <Button asChild variant="outline" size="sm" className="h-6 text-[10px] gap-1 shrink-0">
                                    <Link href={`/dashboard/transfers/${order.id}/edit`}>
                                      <Edit3 className="w-3 h-3" /> Edit Manifest
                                    </Link>
                                  </Button>
                                )}
                              </div>

                              <div className="flex items-center justify-between">
                                <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
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

                              {/* Sub-table for Items */}
                              <div className="border rounded-lg bg-card overflow-hidden shadow-2xs">
                                <Table>
                                  <TableHeader className="bg-muted/40">
                                    <TableRow className="border-b text-[10px] uppercase font-semibold">
                                      <TableHead className="p-2 h-8">Item SKU</TableHead>
                                      <TableHead className="p-2 h-8">Product</TableHead>
                                      <TableHead className="p-2 h-8 text-center">Shipped</TableHead>
                                      <TableHead className="p-2 h-8 text-center">Received</TableHead>
                                      <TableHead className="p-2 h-8 text-center">Variance</TableHead>
                                      <TableHead className="p-2 h-8">Reason / Tag</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody className="divide-y text-xs font-medium">
                                    {order.lines.map((line) => {
                                      const variance = line.discrepancyQuantity ?? 0;
                                      return (
                                        <TableRow key={line.id} className="hover:bg-muted/30 transition-colors">
                                          <TableCell className="p-2 font-mono text-muted-foreground">
                                            {line.productSku}
                                          </TableCell>
                                          <TableCell className="p-2 font-medium text-foreground">
                                            {line.productName}
                                          </TableCell>
                                          <TableCell className="p-2 text-center font-mono font-semibold">
                                            {line.quantity}
                                          </TableCell>
                                          <TableCell className="p-2 text-center font-mono">
                                            {line.quantityReceived ?? "—"}
                                          </TableCell>
                                          <TableCell className="p-2 text-center font-mono">
                                            {line.quantityReceived === undefined || line.quantityReceived === null ? (
                                              "—"
                                            ) : variance === 0 ? (
                                              <span className="text-muted-foreground">0</span>
                                            ) : variance < 0 ? (
                                              <span className="text-amber-600 font-semibold">{variance}</span>
                                            ) : (
                                              <span className="text-blue-600 font-semibold">+{variance}</span>
                                            )}
                                          </TableCell>
                                          <TableCell className="p-2">
                                            {line.discrepancyReason ? (
                                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4">
                                                {formatReasonLabel(line.discrepancyReason)}
                                              </Badge>
                                            ) : (
                                              <span className="text-muted-foreground italic text-[10px]">
                                                None
                                              </span>
                                            )}
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                </Table>
                              </div>

                              {order.remarks && (
                                <p className="text-[11px] text-muted-foreground italic pt-1">
                                  <span className="font-semibold text-foreground not-italic">Remarks:</span>{" "}
                                  {order.remarks}
                                </p>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <DataTablePagination
          pageIndex={pageIndex}
          pageSize={PAGE_SIZE}
          pageCount={pageCount}
          totalRecords={totalRecords}
          loading={isLoading}
          onPageChange={(nextIndex: number) => setPageIndex(nextIndex)}
        />
      </div>

      {/* INSPECTION VIEW MODAL */}

      <Dialog open={!!viewingOrder} onOpenChange={(open) => !open && setViewingOrder(null)}>
        <DialogContent className="w-full max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b">
            <div className="flex items-center justify-between gap-2 pr-6">
              <DialogTitle className="text-lg font-mono flex items-center gap-2 flex-wrap">
                <span>{viewingOrder?.transferNumber}</span>
                {viewingOrder?.status && (
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-semibold border ${getStatusBadgeVariant(
                      viewingOrder.status
                    )}`}
                  >
                    {viewingOrder.status.replace(/_/g, " ")}
                  </Badge>
                )}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              Manifest Audit & Route Details
            </DialogDescription>
          </DialogHeader>

          {viewingOrder && (
            <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
              {/* Route Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border rounded-lg p-3 bg-muted/20">
                <div className="space-y-1 min-w-0">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                    Origin (Source)
                  </span>
                  <div className="font-semibold text-sm flex items-center gap-1.5 truncate">
                    <Building2 className="h-4 w-4 text-primary shrink-0" />
                    <span className="truncate">{viewingOrder.sourceLocationName}</span>
                  </div>
                </div>
                <div className="space-y-1 min-w-0">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                    Destination (Target)
                  </span>
                  <div className="font-semibold text-sm flex items-center gap-1.5 truncate">
                    <Building2 className="h-4 w-4 text-primary shrink-0" />
                    <span className="truncate">{viewingOrder.targetLocationName}</span>
                  </div>
                </div>
              </div>

              {/* Line Items Detail */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Manifest Line Breakdown
                </h4>

                {/* Table Container with Horizontal Scroll */}
                <div className="border rounded-xl bg-card shadow-2xs overflow-hidden">
                  <div className="w-full overflow-x-auto">
                    <Table className="min-w-[550px] w-full">
                      <TableHeader className="bg-muted/40">
                        <TableRow className="border-b text-[10px] uppercase font-semibold">
                          <TableHead className="p-2 h-8">Item SKU</TableHead>
                          <TableHead className="p-2 h-8">Product</TableHead>
                          <TableHead className="p-2 h-8 text-center">Shipped</TableHead>
                          <TableHead className="p-2 h-8 text-center">Received</TableHead>
                          <TableHead className="p-2 h-8 text-center">Variance</TableHead>
                          <TableHead className="p-2 h-8">Discrepancy Tag</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y text-xs font-medium">
                        {viewingOrder.lines.map((line) => {
                          const variance = line.discrepancyQuantity ?? 0;
                          return (
                            <TableRow
                              key={line.id}
                              className="hover:bg-muted/30 transition-colors"
                            >
                              <TableCell className="p-2 font-mono text-muted-foreground whitespace-nowrap">
                                {line.productSku}
                              </TableCell>
                              <TableCell className="p-2 font-medium text-foreground max-w-[180px] truncate">
                                {line.productName}
                              </TableCell>
                              <TableCell className="p-2 text-center font-mono font-semibold">
                                {line.quantity}
                              </TableCell>
                              <TableCell className="p-2 text-center font-mono">
                                {line.quantityReceived ?? "—"}
                              </TableCell>
                              <TableCell className="p-2 text-center font-mono">
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
                              </TableCell>
                              <TableCell className="p-2 whitespace-nowrap">
                                {line.discrepancyReason ? (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] py-0 px-1.5 h-4 inline-flex"
                                  >
                                    {formatReasonLabel(line.discrepancyReason)}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground italic text-[10px]">
                                    None
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>

              {/* Remarks */}
              {viewingOrder.remarks && (
                <div className="border rounded-md p-3 bg-muted/10 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" /> Audit Remarks & Inspection Findings
                  </span>
                  <p className="text-xs text-foreground whitespace-pre-wrap break-words">
                    {viewingOrder.remarks}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="p-4 border-t bg-muted/10 flex justify-end gap-2 sm:gap-2 ">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setViewingOrder(null)}
            >
              Close Audit View
            </Button>
            {(viewingOrder?.status === "DRAFT" || viewingOrder?.status === "PENDING") && (
              <Button asChild size="sm">
                <Link href={`/dashboard/transfers/${viewingOrder.id}/edit`}>
                  <Edit3 className="w-3.5 h-3.5 mr-1" /> Edit Manifest
                </Link>
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* UPDATE STATUS & REMARKS/RECEIVE MODAL */}
      <Dialog open={!!activeAction} onOpenChange={(open) => !open && setActiveAction(null)}>
        <DialogContent className=" sm:max-w-xl">
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
