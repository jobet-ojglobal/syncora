"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search, Coins, Edit3, Globe, RefreshCw, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { DeleteButton } from "@/components/shared/delete-button";
import PageHeader from "@/components/layout/dashboard/PageHeader";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import useSWR from "swr";

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
  const [updatingCode, setUpdatingCode] = useState<string | null>(null);

  // Server Pagination State Matrix
  const [pageIndex, setPageIndex] = useState(0);
  const PAGE_SIZE = 10;

  // 1. SWR reads search and page parameters dynamically.
  // Whenever pageIndex or searchQuery shifts, SWR fires an isolated fetch auto-magically.
  const { data: payload, error, isLoading, mutate } = useSWR(
    `/api/admin/currencies/filtered?search=${searchQuery}&page=${pageIndex}&limit=${PAGE_SIZE}`,
    fetcher,
    { keepPreviousData: true } // Keeps the table populated with old records during search transitions
  );

  // Safely extract payload records map structures matching your layout fields
  const currencies: CurrencyRow[] = payload?.data || [];
  const totalRecords = payload?.totalRecords || 0;
  const pageCount = payload?.pageCount || 0;

  // Handle Search input adjustments
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPageIndex(0); // Reset page indices to 0 on searching to avoid index overflow gaps
  };

  const renderTypographicRuleSample = (row: CurrencyRow) => {
    let rawDigits = `1${row.thousandsSeparator}234${row.decimalSeparator}`;
    for (let i = 0; i < row.decimalPlaces; i++) rawDigits += "5";
    if (row.decimalPlaces === 0) rawDigits = `1${row.thousandsSeparator}235`;
    
    return row.isSymbolFirst ? `${row.symbol}${rawDigits}` : `${rawDigits}${row.symbol}`;
  };

  const handleRefreshMarketTicker = async (isoCode: string, inflowId: string) => {
    try {
      setUpdatingCode(isoCode);
      const feedRes = await fetch(`https://open.er-api.com/v6/latest/USD`);
      if (!feedRes.ok) throw new Error("Public telemetry connection dropped out.");
      
      const marketData = await feedRes.json();
      const freshRate = marketData.rates[isoCode.toUpperCase()];
      if (!freshRate) throw new Error(`Currency indicator "${isoCode}" not present within current market vectors.`);

      const parsedRateCoeff = Number((1 / freshRate).toFixed(8));

      const response = await fetch("/api/admin/currencies/rate-update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inflowId, exchangeRate: parsedRateCoeff })
      });

      if (!response.ok) throw new Error("Internal pipeline write verification failed.");

      toast.success(`${isoCode} rate re-calibrated`, { description: `Value mapped to: ${parsedRateCoeff.toFixed(8)} against USD.` });
      
      // 2. Tell SWR to fetch the latest values from your data source
      mutate();
    } catch (err: any) {
      toast.error("Market Ticker Sync Failed", { description: err.message || "Failed synchronizing current market exchange metrics." });
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
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6 text-xs">
      <PageHeader
        title="Forex Currency Registries"
        description="Maintain international localization formatting print rules schemas, evaluate multi-currency pricing scheme tiers, and manage live market conversion vectors updates operations."
        icon={Coins}
        className="border-b pb-5"
      >
        <Button asChild size="sm" className="gap-1.5 shrink-0 text-xs">
          <Link href="/dashboard/currencies/create">
            <Plus className="w-4 h-4" /> Initialize Currency
          </Link>
        </Button>
      </PageHeader>

      <div className="w-full sm:max-w-md relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/70" />
        <Input
          placeholder="Search currencies by ISO code, display label..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9 text-xs h-9"
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
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted/30 border-b text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="p-4 pl-5 w-[100px]">ISO Token</th>
                    <th className="p-4 w-[200px]">Monetary Standard Label Name</th>
                    <th className="p-4 w-[140px]">Typographic Sample</th>
                    <th className="p-4 w-[160px] text-right">Base Multiplier Conversion Factor</th>
                    <th className="p-4 w-[130px] text-center">Rate Feed Rule Source</th>
                    <th className="p-4 pl-6">Exchange Last Synced Date</th>
                    <th className="p-4 text-right pr-5 w-[120px]">Core Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-xs font-medium">
                  {currencies.map((currency) => (
                    <tr key={currency.id} className="hover:bg-muted/5 transition-colors">
                      <td className="p-4 pl-5 font-mono font-bold text-sm tracking-widest text-foreground select-all">
                        <div className="flex items-center gap-1.5">
                          <span className="bg-muted px-1.5 py-0.5 border rounded-md shadow-3xs">{currency.isoCode}</span>
                        </div>
                      </td>
                      <td className="p-4 text-foreground text-[13px]">{currency.name}</td>
                      <td className="p-4 font-mono font-bold text-muted-foreground tracking-tight">
                        {renderTypographicRuleSample(currency)}
                      </td>
                      <td className="p-4 text-right font-mono text-foreground text-sm font-bold tracking-tight bg-muted/5">
                        {currency.exchangeRate.toFixed(8)}
                      </td>
                      <td className="p-4 text-center">
                        {currency.isManual ? (
                          <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-tight bg-slate-100 text-slate-600 border-slate-300/60 dark:bg-slate-900/40">
                            <Layers className="w-2.5 h-2.5 mr-1 text-slate-400 shrink-0" /> Local Locked
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-tight bg-indigo-500/5 text-indigo-600 border-indigo-500/20">
                            <Globe className="w-2.5 h-2.5 mr-1 text-indigo-500 shrink-0" /> Market API Feed
                          </Badge>
                        )}
                      </td>
                      <td className="p-4 font-mono text-muted-foreground/80 pl-6 text-[11px]">
                        {new Date(currency.rateLastUpdated).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit"
                        })}
                      </td>
                      <td className="p-4 pr-5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            disabled={updatingCode === currency.isoCode}
                            onClick={() => handleRefreshMarketTicker(currency.isoCode, currency.inflowId)}
                            className="h-8 w-8 text-muted-foreground hover:text-indigo-600 hover:bg-indigo-500/5"
                            title="Fetch Latest Public Forex Market Rates Parameters Values"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${updatingCode === currency.isoCode ? "animate-spin text-indigo-500" : ""}`} />
                          </Button>
                          <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                            <Link href={`/dashboard/currencies/${currency.id}/edit`}>
                              <Edit3 className="w-3.5 h-3.5" />
                            </Link>
                          </Button>
                          <DeleteButton
                            itemId={currency.id} 
                            itemName={currency.name} 
                            endpointUrl={`/api/admin/currencies/${currency.id}`}
                            onSuccess={() => {
                              // 3. Since data was changed on the server, trigger SWR mutate to pull down fresh list items
                              mutate();
                            }} 
                            variant="icon"
                          />
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