"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Plus, Edit3, CheckCircle2, XCircle, CalendarClock, ShieldAlert, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { DeleteButton } from "@/components/shared/delete-button";
import PageHeader from "@/components/layout/dashboard/PageHeader";
import SearchInput from "@/components/shared/search-input";
import { DataTablePagination } from "@/components/shared/data-table-pagination";

interface PaymentTermRow {
  id: string;
  inflowId: string;
  name: string;
  daysDue: number | null;
  isActive: boolean;
  customerUsageCount: number;
  vendorUsageCount: number;
  salesOrderUsageCount: number;
  cumulativeDependencies: number;
}

export default function PaymentTermsListPage() {
  const [terms, setTerms] = useState<PaymentTermRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Pagination state
  const [pageIndex, setPageIndex] = useState(0);
  const PAGE_SIZE = 10;

  const fetchPaymentTerms = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/admin/payment-terms/list");
      if (res.ok) {
        const payload = await res.json();
        // Fallback to empty array if payload structure differs
        setTerms(Array.isArray(payload) ? payload : payload.data || []);
      }
    } catch (err) {
      toast.error("Hydration Interrupted", { 
        description: "Failed resolving organizational credit frameworks models." 
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentTerms();
  }, []);

  // Handle Search input adjustments and reset pagination to first page
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPageIndex(0);
  };

  // Filter terms by search query
  const filteredTerms = useMemo(() => {
    const term = searchQuery.toLowerCase().trim();
    if (!term) return terms;
    return terms.filter(
      (t) =>
        t.name.toLowerCase().includes(term) ||
        t.inflowId.toLowerCase().includes(term)
    );
  }, [terms, searchQuery]);

  // Derived Pagination metrics
  const totalRecords = filteredTerms.length;
  const pageCount = Math.ceil(totalRecords / PAGE_SIZE);

  // Slice list for the current active page view
  const paginatedTerms = useMemo(() => {
    const start = pageIndex * PAGE_SIZE;
    return filteredTerms.slice(start, start + PAGE_SIZE);
  }, [filteredTerms, pageIndex, PAGE_SIZE]);

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6 text-xs">
      <PageHeader 
        title="Corporate Payment Terms & Settlement Rules"
        description="Manage and configure credit maturity frameworks, adjust receivables aging thresholds, and evaluate active sub-ledger dependencies indexes."
        icon={FileText}
        className="border-b border-border pb-4"
      >
        <Button asChild size="sm" className="gap-1.5 shrink-0 text-xs">
          <Link href="/dashboard/settings/financial/payment-terms/new">
            <Plus className="w-4 h-4" /> Instantiate Payment Rule
          </Link>
        </Button>
      </PageHeader>

      {/* Search bar filter strip */}
      <div className="w-full sm:max-w-md">
        <SearchInput 
          placeholder="Filter settlement terms by title name, integration ID..."
          searchQuery={searchQuery} 
          setSearchQuery={handleSearchChange}
        />
      </div>

      {/* Main Framework Table Canvas Container Component */}
      {isLoading ? (
        <div className="p-20 text-center text-xs text-muted-foreground bg-card border rounded-xl shadow-3xs italic animate-pulse">
          Parsing corporate financial aging properties configurations and unpacking payment terms models lists tables...
        </div>
      ) : filteredTerms.length === 0 ? (
        <div className="p-20 text-center text-xs text-muted-foreground border-dashed border-2 rounded-xl bg-card">
          No registered payment credit parameters vectors matched target layout criteria.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="border rounded-xl bg-card shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted/30 border-b text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="p-4 pl-5 w-[240px]">Maturity Framework Profile</th>
                    <th className="p-4 w-[180px]">Receivables Aging Threshold Window</th>
                    <th className="p-4 text-right w-[130px]">Bound Debtors</th>
                    <th className="p-4 text-right w-[130px]">Trade Creditors</th>
                    <th className="p-4 text-right w-[130px]">Live Orders Logs</th>
                    <th className="p-4 text-center w-[90px]">Status</th>
                    <th className="p-4 text-right pr-5 w-[100px]">Controls Matrix</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-xs font-medium">
                  {paginatedTerms.map((term) => (
                    <tr key={term.id} className="hover:bg-muted/5 transition-colors">
                      
                      {/* Title Identity Cell */}
                      <td className="p-4 pl-5">
                        <div className="font-semibold text-foreground text-[13px] leading-snug">
                          {term.name}
                        </div>
                      </td>

                      {/* Receivables Aging Threshold Window */}
                      <td className="p-4">
                        {term.daysDue !== null ? (
                          <div className="text-foreground font-bold flex items-center gap-1 font-mono text-[13px]">
                            <CalendarClock className="w-4 h-4 text-primary shrink-0" />
                            <span>
                              {term.daysDue}{" "}
                              <span className="text-[10px] text-muted-foreground font-sans font-medium">
                                Calendar Days
                              </span>
                            </span>
                          </div>
                        ) : (
                          <div className="text-amber-600 font-bold flex items-center gap-1 tracking-tight">
                            <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0" /> Due On Receipt (COD)
                          </div>
                        )}
                      </td>

                      {/* Customer Count */}
                      <td className="p-4 text-right font-mono pr-6 text-slate-600">
                        {term.customerUsageCount.toLocaleString()}
                      </td>

                      {/* Vendor Count */}
                      <td className="p-4 text-right font-mono pr-6 text-slate-600">
                        {term.vendorUsageCount.toLocaleString()}
                      </td>

                      {/* Live Orders Logs */}
                      <td className="p-4 text-right pr-6">
                        <div className="inline-flex items-center gap-1 font-mono font-bold text-slate-700 bg-muted/60 border rounded-md px-2 py-0.5">
                          <span>{term.salesOrderUsageCount.toLocaleString()}</span>
                        </div>
                      </td>

                      {/* Status Toggle */}
                      <td className="p-4 text-center">
                        <div className="flex justify-center">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div>
                                {term.isActive ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-slate-300" />
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                {term.isActive 
                                  ? "Active billing routing standard enabled" 
                                  : "Suspended temporal matrix configuration"}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </td>

                      {/* Controls Action Cell */}
                      <td className="p-4 pr-5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            asChild 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          >
                            <Link href={`/dashboard/settings/financial/payment-terms/${term.id}/edit`}>
                              <Edit3 className="w-3.5 h-3.5" />
                            </Link>
                          </Button>
                          <DeleteButton
                            itemId={term.id} 
                            itemName={term.name} 
                            endpointUrl={`/api/admin/settings/financial/payment-terms/${term.id}`}
                            onSuccess={(id) => {
                              setTerms(prev => prev.filter(t => t.id !== id));
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

          {/* Pagination Controls Footer Component */}
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