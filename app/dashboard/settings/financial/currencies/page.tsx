"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Coins, Edit3, Globe, RefreshCw, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { DeleteButton } from "@/components/shared/delete-button";
import PageHeader from "@/components/layout/dashboard/PageHeader";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import useSWR from "swr";
import SearchInput from "@/components/shared/search-input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface CurrencyRow {
  id: string;
  inflowId: string;
  name: string;
  isoCode: string;
  symbol: string;
  decimalPlaces: number;
  decimalSeparator: string;
  thousandsSeparator: string;
  isSymbolFirst: boolean;
  negativeType: "Leading" | "Trailing" | "Parentheses";
  exchangeRate: number;
  isManual: boolean;
  rateLastUpdated: string;
  dependencyCount: number;
}

// Global fetcher utility for SWR
const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error("Failed to fetch data");
  return res.json();
});

export default function CurrenciesListPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [updatingCode, setUpdatingCode] = useState<string | null>(null);

  // Server Pagination State Matrix
  const [pageIndex, setPageIndex] = useState(0);
  const PAGE_SIZE = 10;

  // Single-source debouncer for search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPageIndex(0); // Safely reset page baseline when search updates
    }, 300);

    return () => clearTimeout(timer); // Clean up timeout frame if user types again within 300ms
  }, [searchQuery]);

  // SWR dynamically fetches data based on debouncedSearch and pageIndex
  const {
    data: payload,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR(
    `/api/admin/currencies/filtered?search=${encodeURIComponent(
      debouncedSearch
    )}&page=${pageIndex}&limit=${PAGE_SIZE}`,
    fetcher,
    {
      keepPreviousData: true,
      revalidateOnFocus: false,
    }
  );

  // Extract payload records cleanly
  const currencies: CurrencyRow[] = payload?.data || [];
  const totalRecords = payload?.totalRecords || 0;
  const pageCount = payload?.pageCount || 0;

  // Clean Search Handler (Delegates page resetting entirely to the debounced effect)
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  const renderTypographicRuleSample = (row: CurrencyRow) => {
    let rawDigits = `1${row.thousandsSeparator}234${row.decimalSeparator}`;
    for (let i = 0; i < row.decimalPlaces; i++) rawDigits += "5";
    if (row.decimalPlaces === 0) rawDigits = `1${row.thousandsSeparator}235`;

    return row.isSymbolFirst
      ? `${row.symbol}${rawDigits}`
      : `${rawDigits}${row.symbol}`;
  };

  const handleRefreshMarketTicker = async (isoCode: string, inflowId: string) => {
    try {
      setUpdatingCode(isoCode);
      const feedRes = await fetch(`https://open.er-api.com/v6/latest/USD`);
      if (!feedRes.ok) throw new Error("Public telemetry connection dropped out.");

      const marketData = await feedRes.json();
      const freshRate = marketData.rates[isoCode.toUpperCase()];
      if (!freshRate)
        throw new Error(
          `Currency indicator "${isoCode}" not present within current market vectors.`
        );

      const parsedRateCoeff = Number((1 / freshRate).toFixed(8));

      const response = await fetch("/api/admin/currencies/rate-update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inflowId, exchangeRate: parsedRateCoeff }),
      });

      if (!response.ok) throw new Error("Internal pipeline write verification failed.");

      toast.success(`${isoCode} rate re-calibrated`, {
        description: `Value mapped to: ${parsedRateCoeff.toFixed(8)} against USD.`,
      });

      // Refresh data
      mutate();
    } catch (err: any) {
      toast.error("Market Ticker Sync Failed", {
        description:
          err.message || "Failed synchronizing current market exchange metrics.",
      });
    } finally {
      setUpdatingCode(null);
    }
  };

  if (error) {
    return (
      <div className="p-6 text-center text-xs text-red-500 bg-destructive/10 border border-destructive/20 rounded-xl font-medium">
        Forex Engine Interrupted: Failed loading global trading currency metadata records indices.
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6 text-xs">
      <PageHeader
        title="Forex Currency Registries"
        description="Maintain international localization formatting print rules schemas, evaluate multi-currency pricing scheme tiers, and manage live market conversion vectors updates operations."
        icon={Coins}
        className="border-b border-border pb-4"
      >
        <Button asChild size="sm" className="gap-1.5 shrink-0 text-xs">
          <Link href="/dashboard/settings/financial/currencies/new">
            <Plus className="w-4 h-4" /> Initialize Currency
          </Link>
        </Button>
      </PageHeader>

      <div className="w-full sm:max-w-md">
        <SearchInput
          placeholder="Filter schemes by system name, ID token..."
          searchQuery={searchQuery}
          setSearchQuery={handleSearchChange}
          isLoading={isValidating && !isLoading}
        />
      </div>

      {isLoading && !payload ? (
        <div className="p-20 text-center text-xs text-muted-foreground bg-card border rounded-xl shadow-2xs italic animate-pulse">
          Querying international financial monetary parameters databases and exchange maps matrices...
        </div>
      ) : currencies.length === 0 ? (
        <div className="p-20 text-center text-xs text-muted-foreground border-dashed border-2 rounded-xl bg-card">
          No currencies profiles entries matched within system ledgers files criteria.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="border rounded-xl bg-card shadow-xs overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="pl-5 w-[100px] text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Code
                  </TableHead>
                  <TableHead className="w-[200px] text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Currency
                  </TableHead>
                  <TableHead className="w-[140px] text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Symbol / Format
                  </TableHead>
                  <TableHead className="w-[160px] text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Exchange Rate
                  </TableHead>
                  <TableHead className="w-[130px] text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Rate Source
                  </TableHead>
                  <TableHead className="pl-6 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Last Synced
                  </TableHead>
                  <TableHead className="pr-5 w-[120px] text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs font-medium">
                {currencies.map((currency) => (
                  <TableRow key={currency.id} className="hover:bg-muted/5 transition-colors">
                    
                    {/* Code */}
                    <TableCell className="pl-5 font-mono font-bold text-sm tracking-widest text-foreground select-all">
                      <div className="flex items-center gap-1.5">
                        <span className="bg-muted px-1.5 py-0.5 border rounded-md shadow-3xs">
                          {currency.isoCode}
                        </span>
                      </div>
                    </TableCell>

                    {/* Currency Name */}
                    <TableCell className="text-foreground text-[13px]">
                      {currency.name}
                    </TableCell>

                    {/* Symbol / Format */}
                    <TableCell className="font-mono font-bold text-muted-foreground tracking-tight">
                      {renderTypographicRuleSample(currency)}
                    </TableCell>

                    {/* Exchange Rate */}
                    <TableCell className="text-right font-mono text-foreground text-sm font-bold tracking-tight bg-muted/5">
                      {currency.exchangeRate.toFixed(8)}
                    </TableCell>

                    {/* Rate Source */}
                    <TableCell className="text-center">
                      {currency.isManual ? (
                        <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-tight bg-slate-100 text-slate-600 border-slate-300/60 dark:bg-slate-900/40">
                          <Layers className="w-2.5 h-2.5 mr-1 text-slate-400 shrink-0" /> Local Locked
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-tight bg-indigo-500/5 text-indigo-600 border-indigo-500/20">
                          <Globe className="w-2.5 h-2.5 mr-1 text-indigo-500 shrink-0" /> Market API Feed
                        </Badge>
                      )}
                    </TableCell>

                    {/* Last Synced */}
                    <TableCell className="font-mono text-muted-foreground/80 pl-6 text-[11px]">
                      {new Date(currency.rateLastUpdated).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit"
                      })}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="pr-5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          disabled={updatingCode === currency.isoCode}
                          onClick={() => handleRefreshMarketTicker(currency.isoCode, currency.inflowId)}
                          className="h-8 w-8 text-muted-foreground hover:text-indigo-600 hover:bg-indigo-500/5"
                          title="Sync Latest Exchange Rate"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${updatingCode === currency.isoCode ? "animate-spin text-indigo-500" : ""}`} />
                        </Button>
                        <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Edit Currency">
                          <Link href={`/dashboard/settings/financial/currencies/${currency.id}/edit`}>
                            <Edit3 className="w-3.5 h-3.5" />
                          </Link>
                        </Button>
                        <DeleteButton
                          itemId={currency.id} 
                          itemName={currency.name} 
                          endpointUrl={`/api/admin/currencies/${currency.id}`}
                          onSuccess={() => mutate()} 
                          variant="icon"
                        />
                      </div>
                    </TableCell>

                  </TableRow>
                ))}
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
      )}
    </div>
  );
}