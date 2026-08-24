"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Plus, UserCheck, ShieldCheck, Landmark, Edit3, ShoppingBag, MapPin, Contact2, Truck, Eye, RefreshCw, MoreHorizontalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "@/components/shared/delete-button";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import SearchInput from "@/components/shared/search-input";
import PageHeader from "@/components/layout/dashboard/PageHeader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EmptyBPartnersButton } from "@/components/partner/empty-business-partner";

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

  // Handler for updating role filter & resetting pagination
  const handleRoleChange = (newRole: "ALL" | "CUSTOMER" | "VENDOR") => {
    setRoleFilter(newRole);
    setPageIndex(0);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  const { data: payload, error, isLoading, isValidating, mutate } = useSWR(
    `/api/admin/business-partners/filtered?search=${debouncedSearch}&role=${roleFilter}&page=${pageIndex}&limit=${PAGE_SIZE}`,
    fetcher,
    { keepPreviousData: true, revalidateOnFocus: true }
  );

  const directory: BusinessPartnerRow[] = payload?.data || [];
  const totalRecords = payload?.totalRecords || 0;
  const pageCount = payload?.pageCount || 0;

  const handleRefresh = async () => {
    await mutate();
  };

  if (error) {
    return (
      <div className="p-6 text-center text-xs text-red-500 bg-destructive/10 border border-destructive/20 rounded-xl font-medium">
        Sync Failure: Unable to retrieve matching Business Partner directories.
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6 text-xs">
      {/* Page Header */}
      <PageHeader 
        className="border-b pb-5" 
        title="Central Business Partner Registry" 
        description="Manage master corporate profiles, toggle structural roles, inspect integrated multi-currency balances, and direct transactional mappings." 
        icon={Contact2}
      >
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading || isValidating}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${(isLoading || isValidating) ? "animate-spin" : ""}`} />
            Sync
          </Button>
          <Button asChild size="sm" className="gap-1.5 shrink-0 text-xs">
            <Link href="/dashboard/business-partners/create">
              <Plus className="w-4 h-4" /> Onboard Business Partner
            </Link>
          </Button>
        </div>
      </PageHeader>

      {/* Filter and Search controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="w-full sm:max-w-md">
          <SearchInput
            placeholder="Filter team members by name, email..."
            searchQuery={searchQuery}
            setSearchQuery={handleSearchChange}
            isLoading={isValidating && !isLoading}
          />
        </div>

        <EmptyBPartnersButton
          role={roleFilter}
          onSuccess={handleRefresh}
        />

        {/* Dynamic Role Filter Tabs */}
        <div className="flex bg-muted p-1 rounded-lg text-xs font-semibold shrink-0">
          {(["ALL", "CUSTOMER", "VENDOR"] as const).map((role) => (
            <button
              key={role}
              onClick={() => handleRoleChange(role)}
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
        <div className="space-y-4">
          <div className="border rounded-xl bg-card shadow-2xs overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="border-b border-border hover:bg-transparent">
                  <TableHead className="w-[220px] pl-5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Partner Profile
                  </TableHead>
                  <TableHead className="w-[180px] text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Primary Contact
                  </TableHead>
                  <TableHead className="w-[160px] text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Regional HQ
                  </TableHead>
                  <TableHead className="w-[140px] text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Roles
                  </TableHead>
                  <TableHead className="w-[120px] text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Activity Flow
                  </TableHead>
                  <TableHead className="w-[190px] text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Outstanding Balance
                  </TableHead>
                  <TableHead className="w-[100px] text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </TableHead>
                  <TableHead className="w-[110px] text-right pr-5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody className="text-xs font-medium divide-y divide-border/60">
                {directory.map((partner) => (
                  <TableRow 
                    key={partner.id} 
                    className="hover:bg-muted/40 transition-colors group align-top"
                  >
                    {/* Partner Profile Name & ID */}
                    <TableCell className="p-3.5 pl-5 align-top">
                      <div className="font-semibold text-foreground text-sm leading-tight group-hover:text-primary transition-colors">
                        {partner.name}
                      </div>
                      <div className="font-mono text-[10px] text-muted-foreground/70 mt-1">
                        ID: {partner.id}
                      </div>
                    </TableCell>

                    {/* Primary Contact Details */}
                    <TableCell className="p-3.5 align-top space-y-0.5">
                      <div className="text-foreground font-medium flex items-center gap-1.5 text-xs">
                        <UserCheck className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate">{partner.contactName}</span>
                      </div>
                      <div 
                        className="font-mono text-[11px] text-muted-foreground/90 lowercase truncate max-w-[170px]" 
                        title={partner.email}
                      >
                        {partner.email}
                      </div>
                      <div className="text-[11px] text-muted-foreground font-sans">
                        {partner.phone}
                      </div>
                    </TableCell>

                    {/* Regional HQ Scope */}
                    <TableCell className="p-3.5 align-top">
                      <div className="flex items-start gap-1.5 text-xs text-muted-foreground leading-snug">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground/70 mt-0.5 shrink-0" />
                        <span>{partner.regionalScope}</span>
                      </div>
                    </TableCell>

                    {/* Roles */}
                    <TableCell className="p-3.5 align-top">
                      <div className="flex flex-wrap gap-1">
                        {partner.customer && (
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20 gap-1 font-semibold text-[10px] py-0 px-1.5 h-5">
                            <ShieldCheck className="w-3 h-3 text-blue-500" /> Customer
                          </Badge>
                        )}
                        {partner.vendor && (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 gap-1 font-semibold text-[10px] py-0 px-1.5 h-5">
                            <Truck className="w-3 h-3 text-amber-500" /> Vendor
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    {/* Activity Flow */}
                    <TableCell className="p-3.5 align-top text-center space-y-1">
                      {partner.customer && (
                        <div className="inline-flex items-center gap-1.5 font-mono text-[10px] font-medium text-muted-foreground bg-blue-500/5 border border-blue-200/50 dark:border-blue-900/30 rounded-md px-2 py-0.5 w-full justify-center">
                          <ShoppingBag className="w-3 h-3 text-blue-500" />
                          <span>{partner.customer.salesOrderCount} SO</span>
                        </div>
                      )}
                      {partner.vendor && (
                        <div className="inline-flex items-center gap-1.5 font-mono text-[10px] font-medium text-muted-foreground bg-amber-500/5 border border-amber-200/50 dark:border-amber-900/30 rounded-md px-2 py-0.5 w-full justify-center">
                          <Landmark className="w-3 h-3 text-amber-500" />
                          <span>{partner.vendor.purchaseOrdersCount} PO</span>
                        </div>
                      )}
                    </TableCell>

                    {/* Outstanding Balance */}
                    <TableCell className="p-3.5 align-top text-right space-y-1 font-mono text-[11px]">
                      {partner.customer && (
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="text-[10px] text-muted-foreground font-sans">Rec:</span>
                          <span className={`font-semibold ${partner.customer.netBalance > 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>
                            {partner.customer.netBalance > 0 ? "+" : ""}
                            {partner.customer.netBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {partner.customer.currencyIso}
                          </span>
                        </div>
                      )}
                      {partner.vendor && (
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="text-[10px] text-muted-foreground font-sans">Pay:</span>
                          <span className={`font-semibold ${partner.vendor.outstandingBalance > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
                            {partner.vendor.outstandingBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {partner.vendor.currencyCode}
                          </span>
                          {partner.vendor.hasCriticalPastDue && (
                            <Badge variant="destructive" className="text-[8px] h-3.5 px-1 uppercase tracking-tight font-bold">
                              Overdue
                            </Badge>
                          )}
                        </div>
                      )}
                    </TableCell>

                    {/* Status Indicator */}
                    <TableCell className="p-3.5 align-top text-center">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="inline-flex items-center justify-center">
                              {partner.isActive ? (
                                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[10px] px-1.5 py-0 h-5 gap-1">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  Active
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-[10px] px-1.5 py-0 h-5 gap-1">
                                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                                  Inactive
                                </Badge>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{partner.isActive ? "Active Commercial Profile" : "Inactive / On Hold Profile"}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>

                    {/* Controls */}
                    <TableCell className="p-3.5 pr-5 align-top text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8">
                            <MoreHorizontalIcon />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild >
                            <Link 
                              href={`/dashboard/business-partners/${partner.id}`} 
                              title="View Details"
                              >
                              <Eye className="w-3.5 h-3.5" /> View
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link 
                              href={`/dashboard/business-partners/${partner.id}/edit`} 
                              title="Edit Profile"
                              >
                              <Edit3 className="w-3.5 h-3.5" /> Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" asChild>
                            <DeleteButton
                              itemId={partner.id} 
                              itemName={partner.name} 
                              endpointUrl={`/api/admin/business-partners/${partner.id}`}
                              onSuccess={() => mutate()} 
                              variant="full"
                            />
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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