"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  History,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  ExternalLink,
  Layers,
  Calendar,
  User,
  RefreshCw,
  Boxes,
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

interface LedgerEntry {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  locationName: string;
  sublocationName: string | null;
  transactionType: string;
  referenceType: string | null;
  referenceId: string | null;
  quantityChange: number;
  quantityBefore: number;
  quantityAfter: number;
  unitCost: number | null;
  batchNumber: string | null;
  serialNumber: string | null;
  remarks: string | null;
  performedByName: string;
  createdAt: string;
}

interface MetaPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function MasterLedgerPage() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [meta, setMeta] = useState<MetaPagination>({
    total: 0,
    page: 1,
    limit: 50,
    totalPages: 1,
  });

  const [search, setSearch] = useState("");
  const [transactionType, setTransactionType] = useState<string>("ALL");
  const [referenceType, setReferenceType] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState(true);

  const fetchLedger = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (transactionType !== "ALL") params.set("transactionType", transactionType);
      if (referenceType !== "ALL") params.set("referenceType", referenceType);
      params.set("page", meta.page.toString());

      const res = await fetch(`/api/admin/inventory/ledger?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries);
        setMeta(data.meta);
      }
    } catch (err) {
      console.error("Error fetching ledger stream:", err);
    } finally {
      setIsLoading(false);
    }
  }, [search, transactionType, referenceType, meta.page]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  // Helper to resolve reference URL dynamically
  const getReferenceLink = (type: string | null, id: string | null) => {
    if (!type || !id) return null;
    switch (type) {
      case "SALES_ORDER":
        return `/admin/orders/${id}`;
      case "PURCHASE_ORDER":
        return `/admin/purchase-orders/${id}`;
      case "TRANSFER_ORDER":
        return `/admin/transfers/${id}`;
      case "ADJUSTMENT":
        return `/admin/inventory/adjustments/${id}`;
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      {/* Upper Navigation & Title Segment */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">Master Stock Ledger</h1>
            <Badge variant="secondary" className="font-mono text-[10px]">
              AUDIT TRAIL
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Immutable transaction record tracking historical velocity, stock adjustments, and reference allocations.
          </p>
        </div>

        {/* View Switcher Sub-nav */}
        <div className="flex items-center gap-1.5 bg-muted/50 p-1 rounded-lg border shrink-0 self-start sm:self-auto">
          <Button asChild variant="ghost" size="sm" className="h-7 text-xs font-medium">
            <Link href="/admin/inventory">
              <Boxes className="w-3.5 h-3.5 mr-1" /> Stock Levels
            </Link>
          </Button>
          <Button variant="secondary" size="sm" className="h-7 text-xs font-semibold shadow-xs">
            <History className="w-3.5 h-3.5 mr-1" /> Stock Ledger
          </Button>
        </div>
      </div>

      {/* Filter Options Utility Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="relative sm:col-span-5">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/70" />
          <Input
            placeholder="Search by product, batch, serial, or remarks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        {/* Transaction Type Filter */}
        <div className="sm:col-span-3">
          <Select value={transactionType} onValueChange={setTransactionType}>
            <SelectTrigger className="text-xs">
              <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Transaction Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Transactions</SelectItem>
              <SelectItem value="PURCHASE">Purchase</SelectItem>
              <SelectItem value="SALE">Sale</SelectItem>
              <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
              <SelectItem value="TRANSFER_IN">Transfer In</SelectItem>
              <SelectItem value="TRANSFER_OUT">Transfer Out</SelectItem>

            </SelectContent>
          </Select>
        </div>

        {/* Reference Type Filter */}
        <div className="sm:col-span-3">
          <Select value={referenceType} onValueChange={setReferenceType}>
            <SelectTrigger className="text-xs">
              <SelectValue placeholder="Reference Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All References</SelectItem>
              <SelectItem value="SALES_ORDER">Sales Order</SelectItem>
              <SelectItem value="PURCHASE_ORDER">Purchase Order</SelectItem>
              <SelectItem value="TRANSFER_ORDER">Transfer Order</SelectItem>
              <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="sm:col-span-1 flex items-center justify-end">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={fetchLedger}
            title="Refresh stream"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Datagrid Audit Output */}
      {isLoading ? (
        <div className="p-16 text-center text-xs text-muted-foreground italic bg-card border rounded-xl shadow-sm">
          Fetching transactional audit streams...
        </div>
      ) : entries.length === 0 ? (
        <div className="p-16 text-center text-xs text-muted-foreground border-dashed border-2 rounded-xl bg-card">
          No ledger entries match the selected audit criteria.
        </div>
      ) : (
        <div className="border rounded-xl bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="p-3.5">Timestamp</th>
                  <th className="p-3.5">Product Allocation</th>
                  <th className="p-3.5">Type & Reference</th>
                  <th className="p-3.5 text-right">Delta</th>
                  <th className="p-3.5 text-right">Balance Movement</th>
                  <th className="p-3.5">Facility / Bin</th>
                  <th className="p-3.5">User / Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y text-xs">
                {entries.map((item) => {
                  const isPositive = item.quantityChange > 0;
                  const isZero = item.quantityChange === 0;
                  const refLink = getReferenceLink(item.referenceType, item.referenceId);

                  return (
                    <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                      {/* Timestamp */}
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Calendar className="w-3 h-3 shrink-0 opacity-70" />
                          <span className="font-mono text-[11px]">
                            {new Date(item.createdAt).toLocaleString(undefined, {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </span>
                        </div>
                      </td>

                      {/* Product */}
                      <td className="p-3.5 max-w-[200px]">
                        <span className="font-semibold text-foreground block truncate">
                          {item.productName}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground block truncate">
                          {item.productSlug}
                        </span>
                      </td>

                      {/* Transaction Type & Reference Link */}
                      <td className="p-3.5">
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
                      </td>

                      {/* Delta Quantity */}
                      <td className="p-3.5 text-right font-mono font-bold whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] ${
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
                        </span>
                      </td>

                      {/* Balance Before -> After */}
                      <td className="p-3.5 text-right font-mono text-[11px] whitespace-nowrap">
                        <span className="text-muted-foreground">{item.quantityBefore}</span>
                        <span className="mx-1 text-muted-foreground/40">→</span>
                        <span className="font-bold text-foreground">{item.quantityAfter}</span>
                      </td>

                      {/* Facility & Sublocation Bin */}
                      <td className="p-3.5">
                        <div className="font-medium text-foreground text-[11px]">
                          {item.locationName}
                        </div>
                        {item.sublocationName && (
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Layers className="w-2.5 h-2.5 text-blue-500" />
                            {item.sublocationName}
                          </div>
                        )}
                      </td>

                      {/* Performed By & Remarks */}
                      <td className="p-3.5 max-w-[220px]">
                        <div className="flex items-center gap-1 text-[11px] font-medium text-foreground">
                          <User className="w-3 h-3 text-muted-foreground" />
                          <span className="truncate">{item.performedByName}</span>
                        </div>
                        {item.remarks && (
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                            {item.remarks}
                          </p>
                        )}
                        {(item.batchNumber || item.serialNumber) && (
                          <div className="flex gap-1 mt-1 font-mono text-[9px]">
                            {item.batchNumber && (
                              <span className="bg-muted px-1 rounded">B: {item.batchNumber}</span>
                            )}
                            {item.serialNumber && (
                              <span className="bg-muted px-1 rounded">S: {item.serialNumber}</span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Toolbar */}
          <div className="p-3 border-t bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Showing {entries.length} of {meta.total} transaction events
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                disabled={meta.page <= 1}
                onClick={() => setMeta((m) => ({ ...m, page: m.page - 1 }))}
              >
                Previous
              </Button>
              <span className="font-mono text-[11px]">
                {meta.page} / {meta.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                disabled={meta.page >= meta.totalPages}
                onClick={() => setMeta((m) => ({ ...m, page: m.page + 1 }))}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}