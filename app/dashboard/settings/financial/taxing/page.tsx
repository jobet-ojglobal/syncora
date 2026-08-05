// app/dashboard/taxing-schemes/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, CheckCircle2, XCircle, Percent, Edit3, Eye, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { StatusAction } from "@/components/shared/status-toggle";

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

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to resolve fiscal system records maps.");
    return res.json();
  });

export default function TaxingSchemesListPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [selectedScheme, setSelectedScheme] = useState<SchemeRow | null>(null);
  
  const PAGE_SIZE = 10;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPageIndex(0);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const {
    data: payload,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR(
    `/api/admin/taxing-scheme/filtered?search=${encodeURIComponent(
      debouncedSearch
    )}&page=${pageIndex}&limit=${PAGE_SIZE}`,
    fetcher,
    {
      keepPreviousData: true,
      revalidateOnFocus: false,
    }
  );

  const schemes: SchemeRow[] = payload?.data || [];
  const totalRecords = payload?.totalRecords || 0;
  const pageCount = payload?.pageCount || 0;

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  if (error) {
    return (
      <div className="p-6 text-center text-xs text-red-500 bg-destructive/10 border border-destructive/20 rounded-xl font-medium">
        Hydration Failure: Failed resolving fiscal system structural records maps.
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6 text-xs">
      {/* Upper Heading Action Block */}
      <PageHeader
        title="Taxing Schemes Matrix"
        description="Configure multi-tier regional tax calculation rules, handle cascading or compounding rates, and structure delivery freight tax criteria."
        icon={Percent}
        className="border-b border-border pb-4"
      >
        <Button asChild size="sm" className="gap-1.5 shrink-0 text-xs">
          <Link href="/dashboard/settings/financial/taxing/new">
            <Plus className="w-4 h-4" /> Register Tax Scheme
          </Link>
        </Button>
      </PageHeader>

      {/* Utilities bar */}
      <div className="w-full sm:max-w-md">
        <SearchInput
          placeholder="Filter schemes by system name, ID token..."
          searchQuery={searchQuery}
          setSearchQuery={handleSearchChange}
          isLoading={isValidating && !isLoading}
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
        <div className="space-y-4">
          <div className="border rounded-xl bg-card shadow-xs overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="pl-5 w-[220px] text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Tax Scheme
                  </TableHead>
                  <TableHead className="w-[180px] text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Tiers
                  </TableHead>
                  <TableHead className="w-[140px] text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Shipping Tax
                  </TableHead>
                  <TableHead className="w-[160px] text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Tax Codes
                  </TableHead>
                  <TableHead className="w-[90px] text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Status
                  </TableHead>
                  <TableHead className="pr-5 w-[100px] text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {schemes.map((scheme) => (
                  <TableRow key={scheme.id} className="hover:bg-muted/5 transition-colors">
                    
                    {/* Tax Scheme Name */}
                    <TableCell className="pl-5 align-middle">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-foreground text-[13px]">
                          {scheme.name}
                        </span>
                        {scheme.isDefault && (
                          <Badge className="text-[9px] bg-primary/10 text-primary hover:bg-primary/10 font-bold border-primary/20 px-1 py-0">
                            Default
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    {/* Tier Breakdown */}
                    <TableCell className="align-middle text-muted-foreground">
                      <div className="space-y-0.5">
                        <div>
                          Tier 1: <span className="font-semibold text-foreground">{scheme.tax1Name}</span>
                        </div>
                        {scheme.tax2Name ? (
                          <div className="text-[11px]">
                            Tier 2: <span className="font-semibold text-foreground">{scheme.tax2Name}</span>
                            {scheme.calculateTax2OnTax1 && (
                              <span className="text-[10px] block text-amber-600 font-medium tracking-tight mt-0.5">
                                ⚡ Compounding
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="text-[10px] text-muted-foreground/80 italic">Single Tier</div>
                        )}
                      </div>
                    </TableCell>

                    {/* Shipping Tax Policy */}
                    <TableCell className="align-middle font-medium text-slate-600">
                      <div className="space-y-1 text-[11px]">
                        <div className="flex items-center gap-1">
                          <div className={`w-1.5 h-1.5 rounded-full ${scheme.tax1OnShipping ? "bg-emerald-500" : "bg-slate-300"}`} />
                          <span>{scheme.tax1Name}: {scheme.tax1OnShipping ? "Taxed" : "Exempt"}</span>
                        </div>
                        {scheme.tax2Name && (
                          <div className="flex items-center gap-1">
                            <div className={`w-1.5 h-1.5 rounded-full ${scheme.tax2OnShipping ? "bg-emerald-500" : "bg-slate-300"}`} />
                            <span>{scheme.tax2Name}: {scheme.tax2OnShipping ? "Taxed" : "Exempt"}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Tax Codes Modal Trigger */}
                    <TableCell className="align-middle">
                      {scheme.taxCodes.length === 0 ? (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70 italic">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500/60" />
                          No codes configured
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedScheme(scheme)}
                          className="h-8 gap-1.5 text-xs font-normal border-border/80 hover:bg-muted/50"
                        >
                          <Layers className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>{scheme.taxCodes.length} {scheme.taxCodes.length === 1 ? "Code" : "Codes"}</span>
                          <Eye className="w-3 h-3 text-muted-foreground ml-0.5" />
                        </Button>
                      )}
                    </TableCell>

                    {/* Status */}
                    <TableCell className="align-middle text-center">
                      <StatusAction
                        id={scheme.id}
                        name={scheme.name}
                        isActive={scheme.isActive}
                        endpointUrl="/api/admin/taxing-scheme/status"
                        onSuccess={() => mutate()}
                      />
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="pr-5 align-middle text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          asChild
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          title="Edit Tax Scheme"
                        >
                          <Link href={`/dashboard/settings/financial/taxing/${scheme.id}/edit`}>
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

      {/* Tax Codes Dialog */}
      <Dialog open={!!selectedScheme} onOpenChange={(open) => !open && setSelectedScheme(null)}>
        <DialogContent className="max-w-2xl text-xs">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <span>Tax Codes & Rates</span>
              {selectedScheme && (
                <Badge variant="secondary" className="font-normal text-xs">
                  {selectedScheme.name}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configured tax codes and corresponding regional rates assigned to this scheme.
            </DialogDescription>
          </DialogHeader>

          {selectedScheme && (
            <div className="py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[60vh] overflow-y-auto p-1">
                {selectedScheme.taxCodes.map((code) => {
                  const isDefault = selectedScheme.defaultTaxCodeId === code.inflowId;

                  return (
                    <div
                      key={code.inflowId}
                      className={`flex flex-col justify-between rounded-lg p-3 transition-all ${
                        isDefault
                          ? "bg-primary/[0.03] border border-primary/30 shadow-2xs"
                          : "bg-muted/30 border border-border/60"
                      }`}
                    >
                      {/* Header: Name + Badge */}
                      <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/40">
                        <span className="font-semibold text-foreground text-xs truncate" title={code.name}>
                          {code.name}
                        </span>
                        {isDefault && (
                          <Badge
                            variant="outline"
                            className="text-[9px] font-medium leading-none px-1 py-0.5 bg-primary/10 text-primary border-primary/20 rounded-xs uppercase tracking-wider shrink-0"
                          >
                            Default
                          </Badge>
                        )}
                      </div>

                      {/* Rates Grid */}
                      <div className="mt-2.5 space-y-1 font-mono text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-sans text-muted-foreground truncate">
                            {selectedScheme.tax1Name}
                          </span>
                          <span className="font-medium text-foreground">
                            {code.tax1Rate.toFixed(2)}%
                          </span>
                        </div>

                        {selectedScheme.tax2Name && (
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-sans text-muted-foreground truncate">
                              {selectedScheme.tax2Name}
                            </span>
                            <span className="font-medium text-foreground">
                              {code.tax2Rate.toFixed(2)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}