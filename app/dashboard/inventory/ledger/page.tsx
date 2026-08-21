// app/admin/inventory/ledger/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  History,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  ExternalLink,
  Layers,
  Calendar,
  User,
  Boxes,
  Info,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import useSWR from "swr";
import PageHeader from "@/components/layout/dashboard/PageHeader";
import SearchInput from "@/components/shared/search-input";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { FormSelect } from "@/components/shared/form-select";

interface LedgerEntry {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  productSku: string;
  locationName: string;
  sublocationName: string | null;
  transactionType: string;
  referenceType: string | null;
  referenceId: string | null;
  quantityChange: number;
  quantityBefore: number;
  quantityAfter: number;
  unitCost: number | null;
  totalCost: number | null;
  batchNumber: string | null;
  serialNumber: string | null;
  uomName: string | null;
  remarks: string | null;
  performedByName: string;
  createdAt: string;
}

interface LedgerResponse {
  data: LedgerEntry[];
  totalRecords: number;
  pageCount: number;
}

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to resolve inventory audit ledger entries.");
    return res.json();
  });

export default function MasterLedgerPage() {
  // 1. Double-state setup for typing vs debounced execution
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [transactionType, setTransactionType] = useState<string>("ALL");
  const [referenceType, setReferenceType] = useState<string>("ALL");

  const [pageIndex, setPageIndex] = useState(0);
  const PAGE_SIZE = 500;

  // 2. Sync typing input to debounced state with a 300ms delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPageIndex(0); // Reset page baseline on new search
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset pagination when filters change
  const handleTransactionTypeChange = (val: string) => {
    setTransactionType(val);
    setPageIndex(0);
  };

  const handleReferenceTypeChange = (val: string) => {
    setReferenceType(val);
    setPageIndex(0);
  };

  // 3. Dynamic query params for SWR
  const queryParams = new URLSearchParams({
    page: pageIndex.toString(), // 0-based indexing matching route refactor
    limit: PAGE_SIZE.toString(),
  });

  if (debouncedSearch) queryParams.set("search", debouncedSearch);
  if (transactionType !== "ALL") queryParams.set("transactionType", transactionType);
  if (referenceType !== "ALL") queryParams.set("referenceType", referenceType);

  const {
    data: payload,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<LedgerResponse>(
    `/api/admin/inventory/ledger?${queryParams.toString()}`,
    fetcher,
    {
      keepPreviousData: true,
      revalidateOnFocus: false,
    }
  );

  const entries = payload?.data || [];
  const totalRecords = payload?.totalRecords || 0;
  const pageCount = payload?.pageCount || 1;

  // Helper to resolve reference URL dynamically
  const getReferenceLink = (type: string | null, id: string | null) => {
    if (!type || !id) return null;
    switch (type) {
      case "SALES_ORDER":
        return `/dashboard/orders/${id}`;
      case "PURCHASE_ORDER":
        return `/dashboard/purchase-orders/${id}`;
      case "TRANSFER_ORDER":
        return `/dashboard/transfers/${id}`;
      case "ADJUSTMENT":
        return `/dashboard/inventory/adjustments/${id}`;
      default:
        return null;
    }
  };

  if (error) {
    return (
      <div className="p-6 text-center text-xs text-red-500 bg-destructive/10 border border-destructive/20 rounded-xl font-medium">
        Hydration Failure: Failed resolving cross-terminal audit ledger entries.
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6 text-xs">
      <PageHeader
        title="Inventory Ledger"
        description="Immutable transaction record tracking historical velocity, stock adjustments, and reference allocations."
        icon={History}
        className="border-b border-border pb-4"
      >
        <div className="flex items-center gap-1.5 bg-muted/50 p-1 rounded-lg border shrink-0">
          <Button asChild variant="ghost" size="sm" className="h-7 text-xs font-medium">
            <Link href="/dashboard/inventory/stocks">
              <Boxes className="w-3.5 h-3.5 mr-1" /> Stock Levels
            </Link>
          </Button>
          <Button variant="secondary" size="sm" className="h-7 text-xs font-semibold shadow-xs">
            <History className="w-3.5 h-3.5 mr-1" /> Audit Ledger
          </Button>
        </div>
      </PageHeader>

      {/* Filter Options & Quick Metrics Bar Segment */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-11 gap-3 w-full sm:max-w-3xl">
          {/* Debounced Search */}
          <div className="sm:col-span-5 ">
            <SearchInput
              placeholder="Search product, SKU, batch, serial, or remarks..."
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              isLoading={isValidating && !isLoading}
            />
          </div>

          {/* Transaction Type Filter */}
          <div className="sm:col-span-3">
            <Select value={transactionType} onValueChange={handleTransactionTypeChange}>
              <SelectTrigger className="text-xs h-9">
                <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground shrink-0" />
                <SelectValue placeholder="Transaction Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Transactions</SelectItem>
                <SelectItem value="PURCHASE">Purchase</SelectItem>
                <SelectItem value="SALE">Sale</SelectItem>
                <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
                <SelectItem value="TRANSFER_IN">Transfer In</SelectItem>
                <SelectItem value="TRANSFER_OUT">Transfer Out</SelectItem>
                <SelectItem value="STOCK_COUNT">Stock Count</SelectItem>
                <SelectItem value="OPENING_BALANCE">Opening Balance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reference Source Filter */}
          <div className="sm:col-span-3">
            <Select value={referenceType} onValueChange={handleReferenceTypeChange}>
              <SelectTrigger className="text-xs h-9">
                <SelectValue placeholder="Reference Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All References</SelectItem>
                <SelectItem value="SALES_ORDER">Sales Order</SelectItem>
                <SelectItem value="PURCHASE_ORDER">Purchase Order</SelectItem>
                <SelectItem value="TRANSFER_ORDER">Transfer Order</SelectItem>
                <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
                <SelectItem value="STOCK_COUNT">Stock Count</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Info Metric Badge & Manual Revalidate Action */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <div className="text-xs text-muted-foreground font-medium bg-muted/50 border px-3 py-1.5 rounded-lg flex items-center gap-2 h-9">
            <Info className="w-3.5 h-3.5 text-blue-500" />
            Audit Logs: <span className="font-bold text-foreground">{totalRecords}</span>
          </div>

          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => mutate()}
            title="Refresh stream"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isValidating ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Datagrid Audit Output */}
      {isLoading && !payload ? (
        <div className="p-20 text-center text-xs text-muted-foreground bg-card border rounded-xl shadow-3xs italic animate-pulse">
          Fetching transactional audit streams and constructing ledger balances...
        </div>
      ) : entries.length === 0 ? (
        <div className="p-20 text-center text-xs text-muted-foreground border-dashed border-2 rounded-xl bg-card">
          No ledger entries match the selected audit criteria.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="border rounded-xl bg-card shadow-xs overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="pl-5 w-[140px] text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Timestamp
                  </TableHead>
                  <TableHead className="w-[220px] text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Product Allocation
                  </TableHead>
                  <TableHead className="w-[150px] text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Type & Reference
                  </TableHead>
                  <TableHead className="w-[100px] text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Delta
                  </TableHead>
                  <TableHead className="w-[130px] text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Balance Movement
                  </TableHead>
                  <TableHead className="w-[160px] text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Facility / Bin
                  </TableHead>
                  <TableHead className="pr-5 w-[200px] text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    User / Remarks
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs font-medium">
                {entries.map((item) => {
                  const isPositive = item.quantityChange > 0;
                  const isZero = item.quantityChange === 0;
                  const refLink = getReferenceLink(item.referenceType, item.referenceId);

                  return (
                    <TableRow key={item.id} className="hover:bg-muted/5 transition-colors">
                      {/* Timestamp */}
                      <TableCell className="pl-5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Calendar className="w-3 h-3 shrink-0 opacity-70" />
                          <span className="font-mono text-[11px]">
                            {new Date(item.createdAt).toLocaleString(undefined, {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </span>
                        </div>
                      </TableCell>

                      {/* Product */}
                      <TableCell>
                        <div className="max-w-[200px]">
                          <span className="font-semibold text-foreground text-[13px] block truncate">
                            {item.productName}
                          </span>
                          <span className="font-mono text-[10px] text-muted-foreground block truncate">
                            SKU: {item.productSku}
                          </span>
                        </div>
                      </TableCell>

                      {/* Transaction Type & Reference Link */}
                      <TableCell>
                        <div className="flex flex-col gap-1 items-start">
                          <Badge variant="outline" className="text-[10px] py-0 h-4 font-mono">
                            {item.transactionType}
                          </Badge>
                          {item.referenceType && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              {item.referenceType}
                              {refLink && (
                                <Link
                                  href={refLink}
                                  className="text-blue-500 hover:underline inline-flex items-center"
                                >
                                  <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                                </Link>
                              )}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Delta Quantity */}
                      <TableCell className="text-right font-mono font-bold whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded-sm text-[11px] ${
                            isZero
                              ? "bg-muted text-muted-foreground"
                              : isPositive
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                              : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                          }`}
                        >
                          {isPositive ? (
                            <ArrowUpRight className="w-3 h-3 mr-0.5" />
                          ) : isZero ? null : (
                            <ArrowDownRight className="w-3 h-3 mr-0.5" />
                          )}
                          {isPositive ? `+${item.quantityChange}` : item.quantityChange}
                          {item.uomName && <span className="ml-1 text-[9px] font-normal">{item.uomName}</span>}
                        </span>
                      </TableCell>

                      {/* Balance Before -> After */}
                      <TableCell className="text-right font-mono text-[11px] whitespace-nowrap">
                        <span className="text-muted-foreground">{item.quantityBefore}</span>
                        <span className="mx-1 text-muted-foreground/40">→</span>
                        <span className="font-bold text-foreground">{item.quantityAfter}</span>
                      </TableCell>

                      {/* Facility & Sublocation Bin */}
                      <TableCell>
                        <div className="font-medium text-foreground text-[11px]">
                          {item.locationName}
                        </div>
                        {item.sublocationName && (
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Layers className="w-2.5 h-2.5 text-blue-500" />
                            {item.sublocationName}
                          </div>
                        )}
                      </TableCell>

                      {/* Performed By & Remarks */}
                      <TableCell className="pr-5">
                        <div className="max-w-[200px]">
                          <div className="flex items-center gap-1 text-[11px] font-medium text-foreground">
                            <User className="w-3 h-3 text-muted-foreground shrink-0" />
                            <span className="truncate">{item.performedByName}</span>
                          </div>
                          {item.remarks && (
                            <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                              {item.remarks}
                            </p>
                          )}
                          {(item.batchNumber || item.serialNumber) && (
                            <div className="flex flex-wrap gap-1 mt-1 font-mono text-[9px]">
                              {item.batchNumber && (
                                <span className="bg-muted px-1 rounded">B: {item.batchNumber}</span>
                              )}
                              {item.serialNumber && (
                                <span className="bg-muted px-1 rounded">S: {item.serialNumber}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Toolbar */}
          <DataTablePagination
            pageIndex={pageIndex}
            pageSize={PAGE_SIZE}
            pageCount={pageCount}
            totalRecords={totalRecords}
            loading={isValidating || isLoading}
            onPageChange={(nextIndex: number) => setPageIndex(nextIndex)}
          />
        </div>
      )}
    </div>
  );
}