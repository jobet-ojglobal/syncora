"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Plus, 
  Search, 
  SlidersHorizontal, 
  Eye, 
  Pencil, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RotateCcw 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PageHeader from "@/components/layout/dashboard/PageHeader";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import useSWR from "swr";

export interface InventoryAdjustmentRow {
  id: string;
  referenceNo: string;
  reason: string;
  status: "Draft" | "Approved" | "Cancelled";
  rawStatus: "DRAFT" | "POSTED" | "VOIDED";
  adjustedBy: {
    name: string;
    email: string;
  };
  warehouseName: string;
  totalItemsAdjusted: number;
  netQuantityDelta: number;
  createdAt: string;
}

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch inventory adjustments");
    return res.json();
  });

export default function InventoryAdjustmentsListPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [pageIndex, setPageIndex] = useState(0);
  const PAGE_SIZE = 10;

  const queryParams = new URLSearchParams({
    search: searchQuery,
    page: pageIndex.toString(),
    limit: PAGE_SIZE.toString(),
  });

  if (statusFilter !== "ALL") {
    queryParams.append("status", statusFilter);
  }

  const { data: payload, error, isLoading } = useSWR(
    `/api/admin/inventory/adjustments?${queryParams.toString()}`,
    fetcher,
    { keepPreviousData: true }
  );

  const adjustments: InventoryAdjustmentRow[] = payload?.data || [];
  const totalRecords = payload?.totalRecords || 0;
  const pageCount = payload?.pageCount || 0;

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPageIndex(0);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setPageIndex(0);
  };

  const renderStatusBadge = (status: InventoryAdjustmentRow["status"]) => {
    switch (status) {
      case "Approved":
        return (
          <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-tight bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
            Approved
          </Badge>
        );
      case "Draft":
        return (
          <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-tight bg-amber-500/10 text-amber-600 border-amber-500/20">
            Draft
          </Badge>
        );
      case "Cancelled":
        return (
          <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-tight bg-rose-500/10 text-rose-600 border-rose-500/20">
            Cancelled
          </Badge>
        );
    }
  };

  if (error) {
    return (
      <div className="p-6 text-center text-xs text-red-500 bg-destructive/10 border border-destructive/20 rounded-xl font-medium">
        Inventory Subsystem Interrupted: Unable to retrieve inventory adjustment logs.
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6 text-xs">
      <PageHeader
        title="Inventory Adjustments"
        description="Log stock level modifications, reconcile discrepancies from damaged or lost goods, and review historical inventory movement audits."
        icon={SlidersHorizontal}
        className="border-b pb-5"
      >
        <Button asChild size="sm" className="gap-1.5 shrink-0 text-xs">
          <Link href="/dashboard/inventory/adjustments/new">
            <Plus className="w-4 h-4" /> New Adjustment
          </Link>
        </Button>
      </PageHeader>

      {/* Toolbar Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="w-full sm:max-w-md relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/70" />
          <Input
            placeholder="Search reference #, warehouse, product, SKU, user..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 text-xs h-9"
          />
        </div>

        <div className="w-full sm:w-44">
          <Select value={statusFilter} onValueChange={handleStatusChange}>
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

      {isLoading && !payload ? (
        <div className="p-20 text-center text-xs text-muted-foreground bg-card border rounded-xl shadow-2xs italic animate-pulse">
          Retrieving inventory adjustment records and stock discrepancy ledgers...
        </div>
      ) : adjustments.length === 0 ? (
        <div className="p-20 text-center text-xs text-muted-foreground border-dashed border-2 rounded-xl bg-card">
          No inventory adjustment entries matched your search criteria.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="border rounded-xl bg-card shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted/30 border-b text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="p-4 pl-5 w-[140px]">Ref Number</th>
                    <th className="p-4 w-[160px]">Warehouse</th>
                    <th className="p-4 w-[120px]">Reason</th>
                    <th className="p-4 w-[110px] text-center">Status</th>
                    <th className="p-4 w-[120px] text-right">Items Changed</th>
                    <th className="p-4 w-[130px] text-right">Net Qty Shift</th>
                    <th className="p-4 pl-6">Adjusted By</th>
                    <th className="p-4 pl-6 w-[160px]">Timestamp</th>
                    <th className="p-4 text-right pr-5 w-[100px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-xs font-medium">
                  {adjustments.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/5 transition-colors">
                      <td className="p-4 pl-5 font-mono font-bold text-xs tracking-wide text-foreground select-all">
                        <span className="bg-muted px-1.5 py-0.5 border rounded-md shadow-3xs">
                          {row.referenceNo}
                        </span>
                      </td>
                      <td className="p-4 text-foreground text-[13px] font-medium">
                        {row.warehouseName}
                      </td>
                      <td className="p-4 text-muted-foreground">
                        <Badge variant="secondary" className="text-[10px] font-semibold">
                          {row.reason}
                        </Badge>
                      </td>
                      <td className="p-4 text-center">
                        {renderStatusBadge(row.status)}
                      </td>
                      <td className="p-4 text-right font-mono font-semibold text-foreground">
                        {row.totalItemsAdjusted} {row.totalItemsAdjusted === 1 ? "SKU" : "SKUs"}
                      </td>
                      <td className="p-4 text-right font-mono font-bold">
                        <div className="flex items-center justify-end gap-1">
                          {row.netQuantityDelta > 0 ? (
                            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                              <ArrowUpRight className="w-3.5 h-3.5" />+{row.netQuantityDelta}
                            </span>
                          ) : row.netQuantityDelta < 0 ? (
                            <span className="text-rose-600 dark:text-rose-400 flex items-center gap-0.5">
                              <ArrowDownLeft className="w-3.5 h-3.5" />{row.netQuantityDelta}
                            </span>
                          ) : (
                            <span className="text-muted-foreground flex items-center gap-0.5">
                              <RotateCcw className="w-3 h-3" />0
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 pl-6">
                        <div className="flex flex-col">
                          <span className="text-foreground text-[12px] font-medium">{row.adjustedBy.name}</span>
                          <span className="text-[10px] text-muted-foreground/80">{row.adjustedBy.email}</span>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-muted-foreground/80 pl-6 text-[11px]">
                        {new Date(row.createdAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="p-4 pr-5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Edit Action - Only show for DRAFT adjustments */}
                          {row.rawStatus === "DRAFT" && (
                            <Button
                              asChild
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              title="Edit Adjustment Draft"
                            >
                              <Link href={`/dashboard/inventory/adjustments/${row.id}/edit`}>
                                <Pencil className="w-3.5 h-3.5" />
                              </Link>
                            </Button>
                          )}
                          
                          {/* View Action */}
                          <Button
                            asChild
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            title="View Details"
                          >
                            <Link href={`/dashboard/inventory/adjustments/${row.id}`}>
                              <Eye className="w-3.5 h-3.5" />
                            </Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
      )}
    </div>
  );
}