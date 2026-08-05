"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Edit3, CheckCircle2, XCircle, Users2, Landmark, ShieldCheck, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TooltipTrigger, Tooltip, TooltipContent } from "@/components/ui/tooltip";
import { DeleteButton } from "@/components/shared/delete-button";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import useSWR from "swr";
import PageHeader from "@/components/layout/dashboard/PageHeader";
import SearchInput from "@/components/shared/search-input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface PricingSchemeRow {
  id: string;
  inflowId: string;
  name: string;
  isActive: boolean;
  isDefault: boolean;
  isTaxInclusive: boolean;
  currencyIso: string;
  currencySymbol: string;
  skuPricePointsCount: number;
  customerBindingsCount: number;
}

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error("Failed to resolve organizational catalogs.");
  return res.json();
});

export default function PricingSchemesListPage() {
  // 1. Double-state setup for instantaneous typing vs debounced network execution
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  const [pageIndex, setPageIndex] = useState(0);
  const PAGE_SIZE = 10;

  // 2. Automatically sync typing input to debounced state with a 300ms window delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPageIndex(0); // Safely reset page baseline whenever search boundaries finish mutating
    }, 300);

    return () => clearTimeout(timer); // Clean up timeout frame if the user types again before 300ms
  }, [searchQuery]);

  // 3. SWR list key hook binds directly onto debounced search value variable
  const {
    data: payload,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR(
    `/api/admin/pricing-scheme/filtered?search=${encodeURIComponent(
      debouncedSearch
    )}&page=${pageIndex}&limit=${PAGE_SIZE}`,
    fetcher,
    {
      keepPreviousData: true,
      revalidateOnFocus: false,
    }
  );

  const schemes: PricingSchemeRow[] = payload?.data || [];
  const totalRecords = payload?.totalRecords || 0;
  const pageCount = payload?.pageCount || 0;

  // Handle Search input adjustments
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  if (error) {
    return (
      <div className="p-6 text-center text-xs text-red-500 bg-destructive/10 border border-destructive/20 rounded-xl font-medium">
        Hydration Failure: Failed resolving organizational catalog structural matrix schemas.
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6 text-xs">
      <PageHeader 
        title="Pricing Strategies Directory" 
        description="Structure unique customer catalogs matrices tier channels, regulate tax pricing calculations thresholds rules variables, and map international trade settlement indices currencies fields." 
        icon={Tags}
        className="border-b border-border pb-4"
        >
        <Button asChild size="sm" className="gap-1.5 shrink-0 text-xs">
          <Link href="/dashboard/settings/financial/pricing/new">
            <Plus className="w-4 h-4" /> Provision Strategy Tier
          </Link>
        </Button>
      </PageHeader>
     
      {/* Lookup search component utility filter toolbar segment */}
      <div className="w-full sm:max-w-md">
        <SearchInput
          placeholder="Filter schemes by system name, ID token..."
          searchQuery={searchQuery}
          setSearchQuery={handleSearchChange}
          isLoading={isValidating && !isLoading}
        />
      </div>

      {/* Central data layout directory board canvas */}
      {isLoading && !payload ? (
        <div className="p-20 text-center text-xs text-muted-foreground bg-card border rounded-xl shadow-3xs italic animate-pulse">
          Reindexing catalog layout maps and assembling live pricing tier matrices vectors data strings...
        </div>
      ) : schemes.length === 0 ? (
        <div className="p-20 text-center text-xs text-muted-foreground border-dashed border-2 rounded-xl bg-card">
          No pricing scheme matrices configurations logged matching specified search filters conditions.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="border rounded-xl bg-card shadow-xs overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="pl-5 w-[250px] text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Pricing Scheme
                  </TableHead>
                  <TableHead className="w-[140px] text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Currency
                  </TableHead>
                  <TableHead className="w-[160px] text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Tax Type
                  </TableHead>
                  <TableHead className="w-[150px] text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    SKUs
                  </TableHead>
                  <TableHead className="w-[150px] text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Customers
                  </TableHead>
                  <TableHead className="w-[90px] text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Status
                  </TableHead>
                  <TableHead className="pr-5 w-[100px] text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs font-medium">
                {schemes.map((scheme) => (
                  <TableRow key={scheme.id} className="hover:bg-muted/5 transition-colors">
                    
                    {/* Scheme Name & Badge */}
                    <TableCell className="pl-5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-foreground text-[13px]">
                          {scheme.name}
                        </span>
                        {scheme.isDefault && (
                          <Badge className="text-[9px] bg-primary/10 text-primary hover:bg-primary/10 font-bold border-primary/20 px-1.5 py-0 rounded">
                            Default Baseline
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    {/* Settlement Currency */}
                    <TableCell className="font-mono font-bold text-foreground">
                      <div className="flex items-center gap-1.5">
                        <span className="bg-muted px-2 py-0.5 border rounded text-[11px]">
                          {scheme.currencyIso}
                        </span>
                        <span className="text-muted-foreground font-normal">
                          ({scheme.currencySymbol})
                        </span>
                      </div>
                    </TableCell>

                    {/* Tax Strategy */}
                    <TableCell>
                      {scheme.isTaxInclusive ? (
                        <div className="text-amber-600 font-bold flex items-center gap-1 tracking-tight">
                          <Landmark className="w-3.5 h-3.5 shrink-0" /> Tax-Inclusive
                        </div>
                      ) : (
                        <div className="text-slate-500 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" /> Tax-Exclusive
                        </div>
                      )}
                    </TableCell>

                    {/* SKUs */}
                    <TableCell className="text-right font-mono text-foreground font-semibold text-sm pr-6">
                      {scheme.skuPricePointsCount.toLocaleString()}
                    </TableCell>

                    {/* Assigned Customers */}
                    <TableCell className="text-right pr-6">
                      <div className="inline-flex items-center gap-1 justify-end font-mono text-foreground font-bold">
                        <Users2 className="w-3.5 h-3.5 text-muted-foreground/70" />
                        <span>{scheme.customerBindingsCount}</span>
                      </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              {scheme.isActive ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              ) : (
                                <XCircle className="w-4 h-4 text-slate-300" />
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              {scheme.isActive ? "Active pricing scheme" : "Disabled pricing scheme"}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="pr-5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          asChild 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          title="Edit Scheme"
                        >
                          <Link href={`/dashboard/settings/financial/pricing/${scheme.id}/edit`}>
                            <Edit3 className="w-3.5 h-3.5" />
                          </Link>
                        </Button>
                        <DeleteButton
                          itemId={scheme.id} 
                          itemName={scheme.name} 
                          endpointUrl={`/api/admin/settings/financial/pricing/${scheme.id}`}
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