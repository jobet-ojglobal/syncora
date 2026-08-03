"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Coins, Edit3, Loader2, ShieldAlert, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "@/components/shared/delete-button";
import PageHeader from "@/components/layout/dashboard/PageHeader";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import useSWR from "swr";
import SearchInput from "@/components/shared/search-input";
import { StatusAction } from "@/components/shared/status-toggle";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ReasonRow {
  id: string;
  inflowId: string;
  name: string;
  isActive: boolean;
  isInternal: boolean;
  createdAt: string | Date;
}

// Global fetcher utility for SWR
const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch data");
    return res.json();
  });

export default function ListPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all"); // "all" | "active" | "inactive"

  // Server Pagination State Matrix
  const [pageIndex, setPageIndex] = useState(0);
  const PAGE_SIZE = 10;

  // Sync typing input to debounced state
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPageIndex(0);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle status filter adjustment
  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setPageIndex(0); // Reset to page 0 whenever filter boundary changes
  };

  // Build dynamic SWR key with search, status filter, and pagination
  const swrKey = `/api/admin/adjustment-reasons/filtered?search=${encodeURIComponent(
    debouncedSearch
  )}&status=${statusFilter}&page=${pageIndex}&limit=${PAGE_SIZE}`;

  const {
    data: payload,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR(swrKey, fetcher, {
    keepPreviousData: true,
    revalidateOnFocus: false,
  });

  const reasons: ReasonRow[] = payload?.data || [];
  const totalRecords = payload?.totalRecords || 0;
  const pageCount = payload?.pageCount || 0;

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  if (error) {
    return (
      <div className="p-6 text-center text-xs text-red-500 bg-destructive/10 border border-destructive/20 rounded-xl font-medium">
        Failed loading adjustment reasons. Please check your network connection or backend service.
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:py-12 space-y-6 text-xs">
      <PageHeader
        title="Adjustment Reasons Registries"
        description="Maintain inventory adjustment reasons schemas, monitor system classification flags, and control activation vectors."
        className="border-b border-border pb-4"
      >
        <Button asChild size="sm" className="gap-1.5 shrink-0 text-xs">
          <Link href="/dashboard/inventory/adjustments/reasons/new">
            <Plus className="w-4 h-4" /> New Reason
          </Link>
        </Button>
      </PageHeader>

      {/* Control Bar: Search Input + Status Filter Select */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="w-full sm:max-w-md flex items-center gap-2">
          <SearchInput
            placeholder="Search reasons by name..."
            searchQuery={searchQuery}
            setSearchQuery={handleSearchChange}
          />

          {isValidating && !isLoading && (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />
          )}
        </div>

        {/* Status Filter Dropdown */}
        <div className="w-full sm:w-[180px] shrink-0">
          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className="h-9 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Filter className="w-3.5 h-3.5" />
                <SelectValue placeholder="Filter Status" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                All Statuses
              </SelectItem>
              <SelectItem value="active" className="text-xs">
                Active Only
              </SelectItem>
              <SelectItem value="inactive" className="text-xs">
                Inactive Only
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content State Engine */}
      {isLoading && !payload ? (
        <div className="p-20 text-center text-xs text-muted-foreground bg-card border rounded-xl shadow-2xs italic animate-pulse">
          Querying adjustment reasons matrix databases...
        </div>
      ) : reasons.length === 0 ? (
        <div className="p-20 text-center text-xs text-muted-foreground border-dashed border-2 rounded-xl bg-card">
          No adjustment reasons match your search or filter criteria.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="border rounded-xl bg-card shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted/30 border-b text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="p-4">Reason Name</th>
                    <th className="p-4 text-center">Scope</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-right pr-5 w-[120px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-xs font-medium">
                  {reasons.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/5 transition-colors">
                      <td className="px-4 py-2 text-foreground text-[13px]">{row.name}</td>

                      <td className="px-4 py-2 text-center">
                        {row.isInternal ? (
                          <Badge
                            variant="outline"
                            className="gap-1 border-amber-500/30 text-amber-600 bg-amber-50/50 dark:bg-amber-950/20"
                          >
                            <ShieldAlert className="h-3 w-3" /> Internal
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Global</Badge>
                        )}
                      </td>

                      <td className="px-4 py-2 text-center">
                        <StatusAction
                          id={row.id}
                          name={row.name}
                          isActive={row.isActive}
                          endpointUrl="/api/admin/adjustment-reasons/status"
                          onSuccess={() => mutate()}
                        />
                      </td>

                      <td className="px-4 py-2 pr-5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            asChild
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          >
                            <Link href={`/dashboard/inventory/adjustments/reasons/${row.id}/edit`}>
                              <Edit3 className="w-3.5 h-3.5" />
                            </Link>
                          </Button>
                          <DeleteButton
                            itemId={row.id}
                            itemName={row.name}
                            endpointUrl={`/api/admin/adjustment-reasons/${row.id}`}
                            onSuccess={() => mutate()}
                            variant="icon"
                            isSoftDelete
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