"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, UserCheck, ShieldCheck, Landmark, Edit3, CheckCircle2, XCircle, ShoppingBag, MapPin, Contact2, Truck, HelpCircle, Eye, View } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "@/components/shared/delete-button";
import PageHeader from "@/components/layout/dashboard/PageHeader";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import useSWR from "swr";

interface BusinessPartnerRow {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  isActive: boolean;
  regionalScope: string;
  customer: {
    inflowId: string;
    pricingTier: string;
    taxingSchemeName: string;
    salesOrderCount: number;
    netBalance: number;
    currencySymbol: string;
    currencyIso: string;
  } | null;
  vendor: {
    inflowId: string;
    catalogItemsCount: number;
    purchaseOrdersCount: number;
    outstandingBalance: number;
    currencyCode: string;
    hasCriticalPastDue: boolean;
  } | null;
}

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error("Unified Directory Sync Failure");
  return res.json();
});

export default function BusinessPartnerListPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | "CUSTOMER" | "VENDOR">("ALL");
  const [pageIndex, setPageIndex] = useState(0);
  const PAGE_SIZE = 10;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPageIndex(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: payload, error, isLoading, mutate } = useSWR(
    `/api/admin/business-partners/filtered?search=${debouncedSearch}&role=${roleFilter}&page=${pageIndex}&limit=${PAGE_SIZE}`,
    fetcher,
    { keepPreviousData: true, revalidateOnFocus: true  }
  );

  const directory: BusinessPartnerRow[] = payload?.data || [];
  const totalRecords = payload?.totalRecords || 0;
  const pageCount = payload?.pageCount || 0;

  if (error) {
    return (
      <div className="p-6 text-center text-xs text-red-500 bg-destructive/10 border border-destructive/20 rounded-xl font-medium">
        Sync Failure: Unable to retrieve matching Business Partner directories.
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="w-full max-w-7xl mx-auto p-6 space-y-6 text-xs">
        {/* Page Header */}
        <PageHeader 
          className="border-b pb-5" 
          title="Central Business Partner Registry" 
          description="Manage master corporate profiles, toggle structural roles, inspect integrated multi-currency balances, and direct transactional mappings." 
          icon={Contact2}
        >
          <Button asChild size="sm" className="gap-1.5 shrink-0 text-xs">
            <Link href="/dashboard/business-partners/create">
              <Plus className="w-4 h-4" /> Onboard Business Partner
            </Link>
          </Button>
        </PageHeader>

        {/* Filter and Search controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="w-full sm:max-w-md relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/70" />
            <Input
              placeholder="Filter by name, POC, email or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs h-9"
            />
          </div>

          {/* Dynamic Role Filter Tabs */}
          <div className="flex bg-muted p-1 rounded-lg text-xs font-semibold shrink-0">
            {(["ALL", "CUSTOMER", "VENDOR"] as const).map((role) => (
              <button
                key={role}
                onClick={() => {
                  setRoleFilter(role);
                  setPageIndex(0);
                }}
                className={`px-3 py-1.5 rounded-md capitalize transition-all ${
                  roleFilter === role ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {role.toLowerCase()}s
              </button>
            ))}
          </div>
        </div>

        {/* Main Grid Ledger */}
        {isLoading ? (
          <div className="p-20 text-center text-xs text-muted-foreground bg-card border rounded-xl shadow-3xs italic animate-pulse">
            Synchronizing joint corporate sub-ledgers and aggregating customer & vendor roles...
          </div>
        ) : directory.length === 0 ? (
          <div className="p-20 text-center text-xs text-muted-foreground border-dashed border-2 rounded-xl bg-card">
            No registered partners match your active filter settings.
          </div>
        ) : (
          <div className="border rounded-xl bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted/30 border-b text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="p-4 pl-5 w-[220px]">Partner Profile Name</th>
                    <th className="p-4 w-[180px]">Primary Contact Point</th>
                    <th className="p-4 w-[150px]">Regional HQ Scope</th>
                    <th className="p-4 w-[160px]">Assigned Roles</th>
                    <th className="p-4 text-center w-[120px]">Activity Flow</th>
                    <th className="p-4 text-right w-[180px]">Outstanding Balance (Net)</th>
                    <th className="p-4 text-center w-[80px]">Status</th>
                    <th className="p-4 text-right pr-5 w-[100px]">Controls Matrix</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-xs font-medium">
                  {directory.map((partner) => (
                    <tr key={partner.id} className="hover:bg-muted/5 transition-colors items-start">
                      
                      {/* Name */}
                      <td className="p-4 pl-5">
                        <div className="font-bold text-foreground text-[13px] leading-snug tracking-tight">
                          {partner.name}
                        </div>
                      </td>

                      {/* Contact Contact */}
                      <td className="p-4 text-muted-foreground">
                        <div className="text-foreground font-semibold flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-slate-400" /> {partner.contactName}
                        </div>
                        <div className="font-mono text-[10px] select-all mt-0.5 text-muted-foreground/80 lowercase truncate max-w-[170px]" title={partner.email}>
                          {partner.email}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 font-sans font-medium">{partner.phone}</div>
                      </td>

                      {/* Address Location */}
                      <td className="p-4 text-slate-600">
                        <div className="flex items-start gap-1 text-[11px] leading-tight">
                          <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                          <span>{partner.regionalScope}</span>
                        </div>
                      </td>

                      {/* Roles Visual Identifiers */}
                      <td className="p-4 space-y-1.5">
                        <div className="flex flex-wrap gap-1">
                          {partner.customer && (
                            <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-200/30 gap-1 font-bold text-[10px]">
                              <ShieldCheck className="w-3 h-3 text-blue-500" /> Customer
                            </Badge>
                          )}
                          {partner.vendor && (
                            <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-amber-200/30 gap-1 font-bold text-[10px]">
                              <Truck className="w-3 h-3 text-amber-500" /> Vendor
                            </Badge>
                          )}
                        </div>
                      </td>

                      {/* Activity Flow Counters */}
                      <td className="p-4 text-center space-y-1">
                        {partner.customer && (
                          <div className="flex justify-center items-center gap-1 font-mono text-[10px] text-slate-700 bg-blue-500/5 border border-blue-100 rounded-md px-1.5 py-0.5">
                            <ShoppingBag className="w-3 h-3 text-blue-400" />
                            <span>{partner.customer.salesOrderCount} SO</span>
                          </div>
                        )}
                        {partner.vendor && (
                          <div className="flex justify-center items-center gap-1 font-mono text-[10px] text-slate-700 bg-amber-500/5 border border-amber-100 rounded-md px-1.5 py-0.5">
                            <Landmark className="w-3 h-3 text-amber-500" />
                            <span>{partner.vendor.purchaseOrdersCount} PO</span>
                          </div>
                        )}
                      </td>

                      {/* Unified Ledger Balance calculations */}
                      <td className="p-4 text-right space-y-1 pr-6 font-mono font-bold text-[11px]">
                        {partner.customer && (
                          <div className="flex justify-end gap-1.5 items-center">
                            <span className="text-[9px] text-muted-foreground font-sans">Receivable:</span>
                            <span className={partner.customer.netBalance > 0 ? "text-rose-600" : "text-emerald-600"}>
                              {partner.customer.netBalance > 0 ? "+" : ""}
                              {partner.customer.netBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {partner.customer.currencyIso}
                            </span>
                          </div>
                        )}
                        {partner.vendor && (
                          <div className="flex justify-end gap-1.5 items-center">
                            <span className="text-[9px] text-muted-foreground font-sans">Payable:</span>
                            <span className={partner.vendor.outstandingBalance > 0 ? "text-amber-600" : "text-muted-foreground"}>
                              {partner.vendor.outstandingBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {partner.vendor.currencyCode}
                            </span>
                            {partner.vendor.hasCriticalPastDue && (
                              <Badge className="bg-destructive hover:bg-destructive text-destructive-foreground text-[8px] h-3 px-1">Past Due</Badge>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Status indicator */}
                      <td className="p-4 text-center">
                        <div className="flex justify-center">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              {partner.isActive ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              ) : (
                                <XCircle className="w-4 h-4 text-slate-300" />
                              )}
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{partner.isActive ? "Active Commercial Profile" : "Inactive / On Hold Profile"}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </td>

                      {/* Deleting targets the parent id (Cascades to child rules safely) */}
                      <td className="p-4 pr-5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                            <Link href={`/dashboard/business-partners/${partner.id}`}>
                              <View className="w-3.5 h-3.5" />
                            </Link>
                          </Button>
                          <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                            <Link href={`/dashboard/business-partners/${partner.id}/edit`}>
                              <Edit3 className="w-3.5 h-3.5" />
                            </Link>
                          </Button>
                          <DeleteButton
                            itemId={partner.id} 
                            itemName={partner.name} 
                            endpointUrl={`/api/admin/business-partners/${partner.id}`}
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
    </TooltipProvider>
  );
}