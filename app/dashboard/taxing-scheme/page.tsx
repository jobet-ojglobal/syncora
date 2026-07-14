// app/dashboard/taxing-schemes/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, Receipt, Edit3, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DeleteButton } from "@/components/shared/delete-button";
import PageHeader from "@/components/layout/dashboard/PageHeader";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import useSWR from "swr";

interface TaxCodeNode {
  inflowId: string;
  name: string;
  isActive: boolean;
  tax1Rate: number;
  tax2Rate: number;
}

interface SchemeRow {
  id: string;
  inflowId: string;
  name: string;
  isActive: boolean;
  isDefault: boolean;
  calculateTax2OnTax1: boolean;
  tax1Name: string;
  tax1OnShipping: boolean;
  tax2Name: string | null;
  tax2OnShipping: boolean;
  defaultTaxCodeId: string | null;
  dependencyCount: number;
  taxCodes: TaxCodeNode[];
}

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error("Failed to resolve fiscal system records maps.");
  return res.json();
});

export default function TaxingSchemesListPage() {
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
  // Adjusted endpoint pattern to support API-driven filtering and pagination
  const { data: payload, error, isLoading, mutate } = useSWR(
    `/api/admin/taxing-scheme/filtered?search=${debouncedSearch}&page=${pageIndex}&limit=${PAGE_SIZE}`,
    fetcher,
    { keepPreviousData: true }
  );

  const schemes: SchemeRow[] = payload?.data || [];
  const totalRecords = payload?.totalRecords || 0;
  const pageCount = payload?.pageCount || 0;

  if (error) {
    return (
      <div className="p-6 text-center text-xs text-red-500 bg-destructive/10 border border-destructive/20 rounded-xl font-medium">
        Hydration Failure: Failed resolving fiscal system structural records maps.
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6 text-xs">

      {/* Upper Heading Action Block */}
      <PageHeader 
        className=" border-b pb-5" 
        title="Taxing Schemes Matrix" 
        description="Configure multi-tier regional tax calculation rules, handle cascading or compounding rates ($Tax2 \times [Subtotal + Tax1]$), and structure delivery freight tax criteria." 
        >
        <Button asChild size="sm" className="gap-1.5 shrink-0 text-xs">
          <Link href="/dashboard/taxing-scheme/create">
            <Plus className="w-4 h-4" /> Register Tax Scheme
          </Link>
        </Button>
      </PageHeader>

      {/* Utilities bar */}
      <div className="w-full sm:max-w-xs relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/70" />
        <Input
          placeholder="Filter schemes by system name, ID token..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 text-xs h-9"
        />
      </div>

      {/* Main Data Layout */}
      {isLoading ? (
        <div className="p-20 text-center text-xs text-muted-foreground bg-card border rounded-xl italic animate-pulse">
          Parsing systemic fiscal matrices structures and taxation calculation parameters...
        </div>
      ) : schemes.length === 0 ? (
        <div className="p-20 text-center text-xs text-muted-foreground border-dashed border-2 rounded-xl bg-card">
          No taxing schemes tracked matching specified criteria parameters.
        </div>
      ) : (
        <div className="border rounded-xl bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/30 border-b text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="p-4 pl-5 w-[200px]">Taxing Scheme Profile</th>
                  <th className="p-4 w-[160px]">Tier Properties</th>
                  <th className="p-4 w-[130px]">Freight Policy</th>
                  <th className="p-4">Jurisdiction Tax Codes & Active Rates Matrix</th>
                  <th className="p-4 text-center w-[90px]">Status</th>
                  <th className="p-4 text-right pr-5 w-[100px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-xs">
                {schemes.map((scheme) => (
                  <tr key={scheme.id} className="hover:bg-muted/5 transition-colors items-start">
                    
                    {/* Identity Profile Name */}
                    <td className="p-4 pl-5 vertical-align-top">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-foreground text-[13px]">{scheme.name}</span>
                        {scheme.isDefault && (
                          <Badge className="text-[9px] bg-primary/10 text-primary hover:bg-primary/10 font-bold border-primary/20 px-1 py-0">
                            System Default
                          </Badge>
                        )}
                      </div>
                    </td>

                    {/* Tier Calculations Breakdown */}
                    <td className="p-4 text-muted-foreground">
                      <div className="space-y-0.5">
                        <div>Tier 1: <span className="font-semibold text-foreground">{scheme.tax1Name}</span></div>
                        {scheme.tax2Name ? (
                          <div className="text-[11px]">
                            Tier 2: <span className="font-semibold text-foreground">{scheme.tax2Name}</span>
                            {scheme.calculateTax2OnTax1 && (
                              <span className="text-[10px] block text-amber-600 font-medium tracking-tight mt-0.5">
                                ⚡ Compounding Active
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="text-[10px] text-muted-foreground/50 italic">Single Tier Setup</div>
                        )}
                      </div>
                    </td>

                    {/* Shipping Assessment Fields */}
                    <td className="p-4 font-medium text-slate-600">
                      <div className="space-y-1 text-[11px]">
                        <div className="flex items-center gap-1">
                          <div className={`w-1.5 h-1.5 rounded-full ${scheme.tax1OnShipping ? "bg-emerald-500" : "bg-slate-300"}`} />
                          <span>{scheme.tax1Name}: {scheme.tax1OnShipping ? "Taxes Freight" : "Exempt"}</span>
                        </div>
                        {scheme.tax2Name && (
                          <div className="flex items-center gap-1">
                            <div className={`w-1.5 h-1.5 rounded-full ${scheme.tax2OnShipping ? "bg-emerald-500" : "bg-slate-300"}`} />
                            <span>{scheme.tax2Name}: {scheme.tax2OnShipping ? "Taxes Freight" : "Exempt"}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Sub Tax Codes Loop Matrix rendering */}
                    <td className="p-4">
                      {scheme.taxCodes.length === 0 ? (
                        <span className="text-[10px] text-destructive font-medium italic">No rates mapped. Tax cannot calculate.</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 max-w-xl">
                          {scheme.taxCodes.map((code) => (
                            <div
                              key={code.inflowId}
                              className={`inline-flex flex-col border rounded-md p-1.5 min-w-[100px] bg-background text-[11px] ${
                                scheme.defaultTaxCodeId === code.inflowId ? "border-primary/50 ring-1 ring-primary/10 shadow-3xs" : "border-border/80"
                              }`}
                            >
                              <div className="font-mono font-bold text-foreground flex items-center justify-between gap-2">
                                <span className="truncate">{code.name}</span>
                                {scheme.defaultTaxCodeId === code.inflowId && <span className="text-[8px] uppercase tracking-tight text-primary font-bold">Fallback</span>}
                              </div>
                              <div className="text-[10px] text-muted-foreground mt-1 space-y-0.5 font-mono">
                                <div>{scheme.tax1Name}: {code.tax1Rate.toFixed(2)}%</div>
                                {scheme.tax2Name && <div>{scheme.tax2Name}: {code.tax2Rate.toFixed(2)}%</div>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Status Toggle Box */}
                    <td className="p-4 text-center">
                      <div className="flex justify-center">
                        <Tooltip>
                            <TooltipTrigger asChild>
                            {scheme.isActive ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            ) : (
                                <XCircle className="w-4 h-4 text-slate-300" />
                            )}
                            </TooltipTrigger>
                            <TooltipContent>
                            <p>{scheme.isActive ? "Active baseline fiscal rules config" : "Suspended / Disabled scheme"}</p>
                            </TooltipContent>
                        </Tooltip>
                      </div>
                    </td>

                    {/* Actions Panel */}
                    <td className="p-4 pr-5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                          <Link href={`/dashboard/taxing-scheme/${scheme.id}/edit`}>
                            <Edit3 className="w-3.5 h-3.5" />
                          </Link>
                        </Button>
                        <DeleteButton
                          itemId={scheme.id} 
                          itemName={scheme.name} 
                          endpointUrl={`/api/admin/taxing-scheme/${scheme.id}/`}
                          onSuccess={() => mutate()} 
                          variant="icon"
                        />
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
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