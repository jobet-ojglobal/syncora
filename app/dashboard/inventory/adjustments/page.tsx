// app/admin/inventory/adjustments/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Plus, 
  SlidersHorizontal, 
  Eye, 
  Pencil, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RotateCcw, 
  Clock, 
  MoreHorizontalIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import PageHeader from "@/components/layout/dashboard/PageHeader";
import SearchInput from "@/components/shared/search-input";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import useSWR from "swr";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export interface InventoryAdjustmentRow {
  id: string;
  referenceNo: string;
  reason: string;
  status: "Draft" | "Approved" | "Cancelled";
  rawStatus: "DRAFT" | "POSTED" | "VOIDED";
  adjustedBy: {
    name: string;
    email: string;
  };
  warehouseName: string;
  totalItemsAdjusted: number;
  netQuantityDelta: number;
  createdAt: string;
}

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch inventory adjustments");
    return res.json();
  });

export default function InventoryAdjustmentsListPage() {
  // 1. Dual-state setup for instantaneous typing vs debounced API querying
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [pageIndex, setPageIndex] = useState(0);
  const PAGE_SIZE = 10;

  // 2. Debounce search query changes with a 300ms delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPageIndex(0); // Reset page baseline on search mutation
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 3. Assemble query parameters using debounced query state
  const queryParams = new URLSearchParams({
    search: debouncedSearch,
    page: pageIndex.toString(),
    limit: PAGE_SIZE.toString(),
  });

  if (statusFilter !== "ALL") {
    queryParams.append("status", statusFilter);
  }

  // 4. SWR data fetching
  const {
    data: payload,
    error,
    isLoading,
    isValidating,
  } = useSWR(
    `/api/admin/inventory/adjustments?${queryParams.toString()}`,
    fetcher,
    { keepPreviousData: true }
  );

  const adjustments: InventoryAdjustmentRow[] = payload?.data || [];
  const totalRecords = payload?.totalRecords || 0;
  const pageCount = payload?.pageCount || 0;

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setPageIndex(0);
  };

  const renderStatusBadge = (status: InventoryAdjustmentRow["status"]) => {
    switch (status) {
      case "Approved":
        return (
          <Badge
            variant="outline"
            className="text-[9px] font-bold uppercase tracking-tight bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-950/40 dark:text-emerald-400"
          >
            Approved
          </Badge>
        );
      case "Draft":
        return (
          <Badge
            variant="outline"
            className="text-[9px] font-bold uppercase tracking-tight bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-950/40 dark:text-amber-400"
          >
            Draft
          </Badge>
        );
      case "Cancelled":
        return (
          <Badge
            variant="outline"
            className="text-[9px] font-bold uppercase tracking-tight bg-rose-500/10 text-rose-600 border-rose-500/20 dark:bg-rose-950/40 dark:text-rose-400"
          >
            Cancelled
          </Badge>
        );
    }
  };

  if (error) {
    return (
      <div className="p-6 text-center text-xs text-red-500 bg-destructive/10 border border-destructive/20 rounded-xl font-medium">
        Inventory Subsystem Interrupted: Unable to retrieve inventory adjustment logs.
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6 text-xs">
      <PageHeader
        title="Stock Adjustments"
        description="Log stock level modifications, reconcile discrepancies from damaged or lost goods, and review historical inventory movement audits."
        icon={SlidersHorizontal}
        className="border-b border-border pb-4"
      >
        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1.5"
          >
            <Link href="/dashboard/inventory/adjustments/reasons">
              <Clock className="h-3.5 w-3.5" />
              Adjustment Reasons
            </Link>
          </Button>
          <Button asChild size="sm" className="h-8 text-xs gap-1.5 shrink-0">
            <Link href="/dashboard/inventory/adjustments/new">
              <Plus className="h-4 w-4" />
              Create Adjustment
            </Link>
          </Button>
        </div>
      </PageHeader>

      {/* Toolbar Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="w-full sm:max-w-md">
          <SearchInput
            placeholder="Search reference #, warehouse, reason, user..."
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            isLoading={isValidating && !isLoading}
          />
        </div>

        <div className="w-full sm:w-44">
          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="POSTED">Approved</SelectItem>
              <SelectItem value="VOIDED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content Table Container */}
      {isLoading && !payload ? (
        <div className="p-20 text-center text-xs text-muted-foreground bg-card border rounded-xl shadow-3xs italic animate-pulse">
          Retrieving inventory adjustment records and stock discrepancy ledgers...
        </div>
      ) : adjustments.length === 0 ? (
        <div className="p-20 text-center text-xs text-muted-foreground border-dashed border-2 rounded-xl bg-card">
          No inventory adjustment entries matched your search criteria.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="border rounded-xl bg-card shadow-xs overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="pl-5 w-[140px] text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Ref Number
                  </TableHead>
                  <TableHead className="w-[160px] text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Warehouse
                  </TableHead>
                  <TableHead className="w-[120px] text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Reason
                  </TableHead>
                  <TableHead className="w-[110px] text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Status
                  </TableHead>
                  <TableHead className="w-[120px] text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Items Changed
                  </TableHead>
                  <TableHead className="w-[130px] text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Net Qty Shift
                  </TableHead>
                  <TableHead className="pl-6 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Adjusted By
                  </TableHead>
                  <TableHead className="pl-6 w-[160px] text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Timestamp
                  </TableHead>
                  <TableHead className="pr-5 w-[100px] text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs font-medium">
                {adjustments.map((row) => (
                  <TableRow key={row.id} className="hover:bg-muted/5 transition-colors">
                    {/* Ref Number */}
                    <TableCell className="pl-5 font-mono font-bold text-xs tracking-wide text-foreground select-all">
                      <span className="bg-muted px-1.5 py-0.5 border rounded-md shadow-3xs">
                        {row.referenceNo}
                      </span>
                    </TableCell>

                    {/* Warehouse */}
                    <TableCell className="text-foreground text-[13px] font-medium">
                      {row.warehouseName}
                    </TableCell>

                    {/* Reason */}
                    <TableCell className="text-muted-foreground">
                      <Badge variant="secondary" className="text-[10px] font-semibold">
                        {row.reason}
                      </Badge>
                    </TableCell>

                    {/* Status */}
                    <TableCell className="text-center">
                      {renderStatusBadge(row.status)}
                    </TableCell>

                    {/* Items Changed */}
                    <TableCell className="text-right font-mono font-semibold text-foreground">
                      {row.totalItemsAdjusted} {row.totalItemsAdjusted === 1 ? "SKU" : "SKUs"}
                    </TableCell>

                    {/* Net Qty Shift */}
                    <TableCell className="text-right font-mono font-bold">
                      <div className="flex items-center justify-end gap-1">
                        {row.netQuantityDelta > 0 ? (
                          <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                            <ArrowUpRight className="w-3.5 h-3.5" />+{row.netQuantityDelta}
                          </span>
                        ) : row.netQuantityDelta < 0 ? (
                          <span className="text-rose-600 dark:text-rose-400 flex items-center gap-0.5">
                            <ArrowDownLeft className="w-3.5 h-3.5" />{row.netQuantityDelta}
                          </span>
                        ) : (
                          <span className="text-muted-foreground flex items-center gap-0.5">
                            <RotateCcw className="w-3 h-3" />0
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Adjusted By */}
                    <TableCell className="pl-6">
                      <div className="flex flex-col">
                        <span className="text-foreground text-[12px] font-medium">
                          {row.adjustedBy.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground/80">
                          {row.adjustedBy.email}
                        </span>
                      </div>
                    </TableCell>

                    {/* Timestamp */}
                    <TableCell className="pl-6 font-mono text-muted-foreground/80 text-[11px]">
                      {new Date(row.createdAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>

                    {/* Actions */}
                    {/* <TableCell className="pr-5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {row.rawStatus === "DRAFT" && (
                          <Button
                            asChild
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            title="Edit Adjustment Draft"
                          >
                            <Link href={`/dashboard/inventory/adjustments/${row.id}/edit`}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Link>
                          </Button>
                        )}

                        <Button
                          asChild
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          title="View Details"
                        >
                          <Link href={`/dashboard/inventory/adjustments/${row.id}`}>
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                        </Button>
                      </div>
                    </TableCell> */}

                    <TableCell className="p-3.5 pr-5 align-top text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8">
                            <MoreHorizontalIcon />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/inventory/adjustments/${row.id}`}>
                              <Eye className="w-3.5 h-3.5" /> View
                            </Link>
                          </DropdownMenuItem>
                          {row.rawStatus === "DRAFT" && (
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/inventory/adjustments/${row.id}/edit`}>
                                <Pencil className="w-3.5 h-3.5" /> Edit
                              </Link>
                            </DropdownMenuItem>
                          )}
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

// "use client";

// import { useState } from "react";
// import Link from "next/link";
// import { 
//   Plus, 
//   Search, 
//   SlidersHorizontal, 
//   Eye, 
//   Pencil, 
//   ArrowUpRight, 
//   ArrowDownLeft, 
//   RotateCcw, 
//   Clock
// } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Badge } from "@/components/ui/badge";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import PageHeader from "@/components/layout/dashboard/PageHeader";
// import { DataTablePagination } from "@/components/shared/data-table-pagination";
// import useSWR from "swr";

// export interface InventoryAdjustmentRow {
//   id: string;
//   referenceNo: string;
//   reason: string;
//   status: "Draft" | "Approved" | "Cancelled";
//   rawStatus: "DRAFT" | "POSTED" | "VOIDED";
//   adjustedBy: {
//     name: string;
//     email: string;
//   };
//   warehouseName: string;
//   totalItemsAdjusted: number;
//   netQuantityDelta: number;
//   createdAt: string;
// }

// const fetcher = (url: string) =>
//   fetch(url).then((res) => {
//     if (!res.ok) throw new Error("Failed to fetch inventory adjustments");
//     return res.json();
//   });

// export default function InventoryAdjustmentsListPage() {
//   const [searchQuery, setSearchQuery] = useState("");
//   const [statusFilter, setStatusFilter] = useState<string>("ALL");
//   const [pageIndex, setPageIndex] = useState(0);
//   const PAGE_SIZE = 10;

//   const queryParams = new URLSearchParams({
//     search: searchQuery,
//     page: pageIndex.toString(),
//     limit: PAGE_SIZE.toString(),
//   });

//   if (statusFilter !== "ALL") {
//     queryParams.append("status", statusFilter);
//   }

//   const { data: payload, error, isLoading } = useSWR(
//     `/api/admin/inventory/adjustments?${queryParams.toString()}`,
//     fetcher,
//     { keepPreviousData: true }
//   );

//   const adjustments: InventoryAdjustmentRow[] = payload?.data || [];
//   const totalRecords = payload?.totalRecords || 0;
//   const pageCount = payload?.pageCount || 0;

//   const handleSearchChange = (value: string) => {
//     setSearchQuery(value);
//     setPageIndex(0);
//   };

//   const handleStatusChange = (value: string) => {
//     setStatusFilter(value);
//   };

//   const renderStatusBadge = (status: InventoryAdjustmentRow["status"]) => {
//     switch (status) {
//       case "Approved":
//         return (
//           <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-tight bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
//             Approved
//           </Badge>
//         );
//       case "Draft":
//         return (
//           <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-tight bg-amber-500/10 text-amber-600 border-amber-500/20">
//             Draft
//           </Badge>
//         );
//       case "Cancelled":
//         return (
//           <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-tight bg-rose-500/10 text-rose-600 border-rose-500/20">
//             Cancelled
//           </Badge>
//         );
//     }
//   };

//   if (error) {
//     return (
//       <div className="p-6 text-center text-xs text-red-500 bg-destructive/10 border border-destructive/20 rounded-xl font-medium">
//         Inventory Subsystem Interrupted: Unable to retrieve inventory adjustment logs.
//       </div>
//     );
//   }

//   return (
//     <div className="w-full max-w-7xl mx-auto p-6 space-y-6 text-xs">
//       <PageHeader
//         title="Stock Adjustments"
//         description="Log stock level modifications, reconcile discrepancies from damaged or lost goods, and review historical inventory movement audits."
//         icon={SlidersHorizontal}
//         className="border-b pb-5"
//       >
//         <div className="flex items-center gap-2">
//           <Button asChild variant="outline" size="sm" className="h-7 px-2 text-muted-foreground hover:text-foreground gap-1">
//             <Link href={`/dashboard/inventory/adjustments/reasons`}>
//               <Clock className="h-4 w-4 mr-2" />
//               Adjustment Reasons
//             </Link>
//           </Button>
//         </div>
//       </PageHeader>

//       {/* Toolbar Filters */}
//       <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
//         <div className="w-full sm:max-w-md relative">
//           <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/70" />
//           <Input
//             placeholder="Search reference #, warehouse, product, SKU, user..."
//             value={searchQuery}
//             onChange={(e) => handleSearchChange(e.target.value)}
//             className="pl-9 text-xs h-9"
//           />
//         </div>

//         <div className="w-full sm:w-44">
//           <Select value={statusFilter} onValueChange={handleStatusChange}>
//             <SelectTrigger className="h-9 text-xs">
//               <SelectValue placeholder="Filter by status" />
//             </SelectTrigger>
//             <SelectContent>
//               <SelectItem value="ALL">All Statuses</SelectItem>
//               <SelectItem value="DRAFT">Draft</SelectItem>
//               <SelectItem value="POSTED">Approved</SelectItem>
//               <SelectItem value="VOIDED">Cancelled</SelectItem>
//             </SelectContent>
//           </Select>
//         </div>
//       </div>

//       {isLoading && !payload ? (
//         <div className="p-20 text-center text-xs text-muted-foreground bg-card border rounded-xl shadow-2xs italic animate-pulse">
//           Retrieving inventory adjustment records and stock discrepancy ledgers...
//         </div>
//       ) : adjustments.length === 0 ? (
//         <div className="p-20 text-center text-xs text-muted-foreground border-dashed border-2 rounded-xl bg-card">
//           No inventory adjustment entries matched your search criteria.
//         </div>
//       ) : (
//         <div className="space-y-4">
//           <div className="border rounded-xl bg-card shadow-xs overflow-hidden">
//             <div className="overflow-x-auto">
//               <table className="w-full text-left border-collapse">
//                 <thead>
//                   <tr className="bg-muted/30 border-b text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
//                     <th className="p-4 pl-5 w-[140px]">Ref Number</th>
//                     <th className="p-4 w-[160px]">Warehouse</th>
//                     <th className="p-4 w-[120px]">Reason</th>
//                     <th className="p-4 w-[110px] text-center">Status</th>
//                     <th className="p-4 w-[120px] text-right">Items Changed</th>
//                     <th className="p-4 w-[130px] text-right">Net Qty Shift</th>
//                     <th className="p-4 pl-6">Adjusted By</th>
//                     <th className="p-4 pl-6 w-[160px]">Timestamp</th>
//                     <th className="p-4 text-right pr-5 w-[100px]">Actions</th>
//                   </tr>
//                 </thead>
//                 <tbody className="divide-y divide-border/60 text-xs font-medium">
//                   {adjustments.map((row) => (
//                     <tr key={row.id} className="hover:bg-muted/5 transition-colors">
//                       <td className="p-4 pl-5 font-mono font-bold text-xs tracking-wide text-foreground select-all">
//                         <span className="bg-muted px-1.5 py-0.5 border rounded-md shadow-3xs">
//                           {row.referenceNo}
//                         </span>
//                       </td>
//                       <td className="p-4 text-foreground text-[13px] font-medium">
//                         {row.warehouseName}
//                       </td>
//                       <td className="p-4 text-muted-foreground">
//                         <Badge variant="secondary" className="text-[10px] font-semibold">
//                           {row.reason}
//                         </Badge>
//                       </td>
//                       <td className="p-4 text-center">
//                         {renderStatusBadge(row.status)}
//                       </td>
//                       <td className="p-4 text-right font-mono font-semibold text-foreground">
//                         {row.totalItemsAdjusted} {row.totalItemsAdjusted === 1 ? "SKU" : "SKUs"}
//                       </td>
//                       <td className="p-4 text-right font-mono font-bold">
//                         <div className="flex items-center justify-end gap-1">
//                           {row.netQuantityDelta > 0 ? (
//                             <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
//                               <ArrowUpRight className="w-3.5 h-3.5" />+{row.netQuantityDelta}
//                             </span>
//                           ) : row.netQuantityDelta < 0 ? (
//                             <span className="text-rose-600 dark:text-rose-400 flex items-center gap-0.5">
//                               <ArrowDownLeft className="w-3.5 h-3.5" />{row.netQuantityDelta}
//                             </span>
//                           ) : (
//                             <span className="text-muted-foreground flex items-center gap-0.5">
//                               <RotateCcw className="w-3 h-3" />0
//                             </span>
//                           )}
//                         </div>
//                       </td>
//                       <td className="p-4 pl-6">
//                         <div className="flex flex-col">
//                           <span className="text-foreground text-[12px] font-medium">{row.adjustedBy.name}</span>
//                           <span className="text-[10px] text-muted-foreground/80">{row.adjustedBy.email}</span>
//                         </div>
//                       </td>
//                       <td className="p-4 font-mono text-muted-foreground/80 pl-6 text-[11px]">
//                         {new Date(row.createdAt).toLocaleString("en-US", {
//                           month: "short",
//                           day: "numeric",
//                           hour: "2-digit",
//                           minute: "2-digit",
//                         })}
//                       </td>
//                       <td className="p-4 pr-5 text-right">
//                         <div className="flex items-center justify-end gap-1">
//                           {/* Edit Action - Only show for DRAFT adjustments */}
//                           {row.rawStatus === "DRAFT" && (
//                             <Button
//                               asChild
//                               variant="ghost"
//                               size="icon"
//                               className="h-8 w-8 text-muted-foreground hover:text-foreground"
//                               title="Edit Adjustment Draft"
//                             >
//                               <Link href={`/dashboard/inventory/adjustments/${row.id}/edit`}>
//                                 <Pencil className="w-3.5 h-3.5" />
//                               </Link>
//                             </Button>
//                           )}
                          
//                           {/* View Action */}
//                           <Button
//                             asChild
//                             variant="ghost"
//                             size="icon"
//                             className="h-8 w-8 text-muted-foreground hover:text-foreground"
//                             title="View Details"
//                           >
//                             <Link href={`/dashboard/inventory/adjustments/${row.id}`}>
//                               <Eye className="w-3.5 h-3.5" />
//                             </Link>
//                           </Button>
//                         </div>
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           </div>

//           <DataTablePagination
//             pageIndex={pageIndex}
//             pageSize={PAGE_SIZE}
//             pageCount={pageCount}
//             totalRecords={totalRecords}
//             loading={isLoading}
//             onPageChange={(nextIndex: number) => setPageIndex(nextIndex)}
//           />
//         </div>
//       )}
//     </div>
//   );
// }