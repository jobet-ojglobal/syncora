// app/admin/inventory/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { 
  Plus, 
  Warehouse, 
  Package, 
  Layers, 
  AlertTriangle, 
  Edit, 
  Info, 
  Truck, 
  Eye, 
  MoreHorizontalIcon,
  Edit3,
  SlidersHorizontal,
  RotateCcw,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import useSWR from "swr";
import PageHeader from "@/components/layout/dashboard/PageHeader";
import SearchInput from "@/components/shared/search-input";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InspectionItem, StorageInspectionModalEnhance } from "@/components/inventory/storage-inspection-modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { TableMultiSelect } from "@/components/shared/table-multiselect";

interface LocationOption {
  inflowId: string;
  name: string;
}

interface BinDetail {
  id: string;
  sublocationName: string;
  quantity: number;
}

interface Product {
  inflowId: string;
  name: string;
  sku: string;
  slug: string;
  thumbnail: string | null;
  trackSerials: boolean;
  isActive: boolean;
}

interface InventoryStockRow {
  id: string;
  product: Product;
  locationId: string;
  locationName: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  quantityInTransit: number;
  reorderThreshold: number;
  bins: BinDetail[];
}

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to resolve inventory ledger entries.");
    return res.json();
  });

export default function InventoryList() {
  // 1. Double-state setup for instantaneous typing vs debounced network execution
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [minQty, setMinQty] = useState("");
  const [maxQty, setMaxQty] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const [activeInspectionItem, setActiveInspectionItem] = useState<InspectionItem | null>(null);

  // 2. Automatically sync typing input to debounced state with a 300ms window delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPageIndex(0); // Reset pagination baseline when search input mutates
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 3. SWR list key hook binds directly onto debounced search parameter
  const queryParams = new URLSearchParams({
    search: debouncedSearch,
    status: statusFilter,
    page: String(pageIndex),
    limit: String(pageSize),
  });

  // Pass array of location IDs as comma-separated values
  if (selectedLocations.length > 0) {
    queryParams.append("locationIds", selectedLocations.join(","));
  }

  if (minQty !== "") queryParams.append("minQty", minQty);
  if (maxQty !== "") queryParams.append("maxQty", maxQty);

  const {
    data: payload,
    error,
    isLoading,
    isValidating,
  } = useSWR(`/api/admin/inventory/filtered?${queryParams.toString()}`, fetcher, {
    keepPreviousData: true,
    revalidateOnFocus: false,
  });

  const locations: LocationOption[] = payload?.locations || [];

  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setSelectedLocations([]);
    setMinQty("");
    setMaxQty("");
    setPageIndex(0);
  };

  // Fallback support for either paginated object payload or flat array responses
  const inventory: InventoryStockRow[] = Array.isArray(payload)
    ? payload
    : payload?.data || [];
  const totalRecords = payload?.totalRecords || inventory.length;
  const pageCount = payload?.pageCount || Math.ceil(totalRecords / pageSize) || 1;

  // Calculate total units held in Bulk Floor / Unassigned storage across active dataset
  const totalBulkStockOverall = inventory.reduce((acc, item) => {
    const binSum = item.bins?.reduce((bAcc, b) => bAcc + b.quantity, 0) || 0;
    return acc + Math.max(0, item.quantityOnHand - binSum);
  }, 0);

  const locationOptions = locations.map((loc) => ({
    label: loc.name,
    value: loc.inflowId,
  }));

  if (error) {
    return (
      <div className="p-6 text-center text-xs text-red-500 bg-destructive/10 border border-destructive/20 rounded-xl font-medium">
        Hydration Failure: Failed resolving cross-terminal inventory ledger matrix schemas.
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6 text-xs">
      <PageHeader
        title="Master Stock Ledger"
        description="Multi-warehouse balance records, dynamic picker bin configurations, and reserve allocations."
        icon={Layers}
        className="border-b border-border pb-4"
      >
        <Button asChild size="sm" className="gap-1.5 shrink-0 text-xs">
          <Link href="/dashboard/inventory/stocks/new">
            <Plus className="w-4 h-4" /> Post Stock Adjustment
          </Link>
        </Button>
      </PageHeader>

      {/* Filter Options & Quick Metrics Bar Segment */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:max-w-2xl">
          <div className="w-full sm:w-72">
            <SearchInput
              placeholder="Filter by name, SKU, facility..."
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              isLoading={isValidating && !isLoading}
            />
          </div>

          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value);
              setPageIndex(0);
            }}
          >
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="inactive">Archived Only</SelectItem>
            </SelectContent>
          </Select>

          {/* Multi-Select Location Filter */}
          <TableMultiSelect
            title="Locations"
            options={locationOptions}
            value={selectedLocations}
            onValueChange={(values) => {
              setSelectedLocations(values);
              setPageIndex(0);
            }}
            size="sm"
          />

          <div className="flex items-center gap-1.5 border rounded-md px-2 py-0.5 bg-background h-9">
            <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-[11px] text-muted-foreground font-medium">Qty:</span>
            <Input
              type="number"
              placeholder="Min"
              value={minQty}
              onChange={(e) => {
                setMinQty(e.target.value);
                setPageIndex(0);
              }}
              className="w-14 h-6 p-1 text-xs border-0 focus-visible:ring-0 text-center"
            />
            <span className="text-muted-foreground">-</span>
            <Input
              type="number"
              placeholder="Max"
              value={maxQty}
              onChange={(e) => {
                setMaxQty(e.target.value);
                setPageIndex(0);
              }}
              className="w-14 h-6 p-1 text-xs border-0 focus-visible:ring-0 text-center"
            />
          </div>

          <Select
            value={String(pageSize)}
            onValueChange={(value) => {
              setPageSize(Number(value));
              setPageIndex(0);
            }}
          >
            <SelectTrigger className="w-[110px] h-9">
              <SelectValue placeholder="10 per page" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 / page</SelectItem>
              <SelectItem value="25">25 / page</SelectItem>
              <SelectItem value="50">50 / page</SelectItem>
              <SelectItem value="100">100 / page</SelectItem>
              <SelectItem value="500">500 / page</SelectItem>
            </SelectContent>
          </Select>

          {(statusFilter !== "all" ||
            selectedLocations.length > 0 ||
            minQty !== "" ||
            maxQty !== "" ||
            searchQuery !== "") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Clear
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <div className="text-xs text-muted-foreground font-medium bg-muted/50 border px-3 py-1.5 rounded-lg flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-blue-500" />
            Monitored Lines: <span className="font-bold text-foreground">{totalRecords}</span>
          </div>

          <div className="text-xs text-muted-foreground font-medium bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 px-3 py-1.5 rounded-lg flex items-center gap-2">
            <Warehouse className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            Total Bulk Area:{" "}
            <span className="font-bold font-mono text-foreground">
              {totalBulkStockOverall.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Central Data Layout Directory Canvas */}
      {isLoading && !payload ? (
        <div className="p-20 text-center text-xs text-muted-foreground bg-card border rounded-xl shadow-3xs italic animate-pulse">
          Fetching cross-terminal ledger matrices and assembling live stock balances...
        </div>
      ) : inventory.length === 0 ? (
        <div className="p-20 text-center text-xs text-muted-foreground border-dashed border-2 rounded-xl bg-card">
          No active inventory allocations or matching configurations found.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="border rounded-xl bg-card shadow-xs overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="pl-5 w-[240px] text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    SKU Product Assignment
                  </TableHead>
                  <TableHead className="w-[160px] text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Logistics Depot
                  </TableHead>
                  <TableHead className="w-[110px] text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    On Hand
                  </TableHead>
                  <TableHead className="w-[110px] text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Committed
                  </TableHead>
                  <TableHead className="w-[110px] text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    In Transit
                  </TableHead>
                  <TableHead className="w-[130px] text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Available for Sale
                  </TableHead>
                  <TableHead className="w-[170px] text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Sub-bins & Bulk
                  </TableHead>
                  <TableHead className="pr-5 w-[110px] text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs font-medium">
                {inventory.map((item) => {
                  const isOutOfStock = item.quantityAvailable <= 0;
                  const isStrained = item.quantityReserved > item.quantityOnHand * 0.5;

                  const totalBinQty = item.bins?.reduce((sum, b) => sum + b.quantity, 0) || 0;
                  const bulkAreaQty = Math.max(0, item.quantityOnHand - totalBinQty);

                  return (
                    <TableRow key={item.id} className="hover:bg-muted/5 transition-colors">
                      {/* Product */}
                      <TableCell className="pl-5">
                        <div className="flex items-center gap-2.5 max-w-[220px]">
                          <div className="w-9 h-9 bg-muted border rounded-lg overflow-hidden flex items-center justify-center shrink-0 relative">
                            {item.product.thumbnail ? (
                              <Image
                                src={item.product.thumbnail}
                                alt={item.product.name}
                                className="w-full h-full object-cover"
                                width={36}
                                height={36}
                              />
                            ) : (
                              <Package className="w-4 h-4 text-muted-foreground/50" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-foreground text-[13px] block truncate">
                              {item.product.name}
                            </span>
                            <span className="font-mono text-[10px] text-muted-foreground block truncate">
                              {item.product.slug}
                            </span>
                          </div>
                          <div className="flex justify-center">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div>
                                  {item.product.isActive ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                  ) : (
                                    <XCircle className="w-4 h-4 text-amber-500" />
                                  )}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  {item.product.isActive ? "Active product" : "Disabled product"}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      </TableCell>
                 
                      {/* Location */}
                      <TableCell className="text-muted-foreground font-medium">
                        <div className="flex items-center gap-1.5 truncate max-w-[150px]">
                          <Warehouse className="w-3.5 h-3.5 opacity-60 shrink-0" />
                          <span className="truncate">{item.locationName}</span>
                        </div>
                      </TableCell>

                      {/* On Hand */}
                      <TableCell className="text-right font-mono font-medium text-foreground">
                        {item.quantityOnHand.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 4,
                        })}
                      </TableCell>

                      {/* Reserved */}
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {item.quantityReserved > 0 ? (
                          <span
                            className={`inline-flex items-center gap-1 ${
                              isStrained ? "text-amber-600 font-bold" : ""
                            }`}
                          >
                            {item.quantityReserved.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 4,
                            })}
                          </span>
                        ) : (
                          <span className="opacity-40">-</span>
                        )}
                      </TableCell>

                      {/* In Transit */}
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {item.quantityInTransit > 0 ? (
                          <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 font-bold px-1.5 py-0.5 rounded-sm text-[11px]">
                            <Truck className="w-3 h-3 shrink-0" />
                            {item.quantityInTransit.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 4,
                            })}
                          </span>
                        ) : (
                          <span className="opacity-30">-</span>
                        )}
                      </TableCell>

                      {/* Available Balance */}
                      <TableCell className="text-right font-mono">
                        {isOutOfStock ? (
                          <span className="text-destructive font-bold inline-flex items-center gap-1 bg-destructive/10 px-1.5 py-0.5 rounded-sm">
                            <AlertTriangle className="w-3 h-3" /> 0.00
                          </span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            {item.quantityAvailable.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 4,
                            })}
                          </span>
                        )}
                      </TableCell>

                      {/* Bins & Bulk Inspector Trigger */}
                      <TableCell className="text-center">
                        <button
                          type="button"
                          onClick={() => setActiveInspectionItem(item)}
                          className="inline-flex items-center gap-1.5 bg-muted/60 hover:bg-muted border px-2.5 py-1 rounded-md transition-colors text-[11px] cursor-pointer"
                        >
                          <Layers className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span className="font-semibold">
                            {item.bins?.length || 0} {item.bins?.length === 1 ? "bin" : "bins"}
                          </span>
                          <span className="text-muted-foreground font-mono text-[10px] pl-1 border-l border-muted-foreground/30">
                            Bulk:{" "}
                            <strong className="text-amber-600 dark:text-amber-400 font-medium">
                              {bulkAreaQty.toLocaleString(undefined, {
                                maximumFractionDigits: 2,
                              })}
                            </strong>
                          </span>
                        </button>
                      </TableCell>
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
                              <Link href={`/dashboard/inventory/stocks/${item.id}`}>
                                <Eye className="w-3.5 h-3.5" /> View
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/inventory/stocks/${item.id}/adjust`}>
                                <Edit3 className="w-3.5 h-3.5" /> Adjust
                              </Link>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Table Pagination */}
          <DataTablePagination
            pageIndex={pageIndex}
            pageSize={pageSize}
            pageCount={pageCount}
            totalRecords={totalRecords}
            loading={isLoading}
            onPageChange={(nextIndex: number) => setPageIndex(nextIndex)}
          />
        </div>
      )}

      <StorageInspectionModalEnhance
        item={activeInspectionItem}
        onClose={() => setActiveInspectionItem(null)}
      />
    </div>
  );
}


// // app/admin/inventory/page.tsx
// "use client";

// import { useEffect, useState } from "react";
// import Link from "next/link";
// import { Plus, Search, Warehouse, Package, Layers, AlertTriangle, Edit, Info, Truck, ImageIcon, View } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Badge } from "@/components/ui/badge";
// import Image from "next/image";
// import PageHeader from "@/components/layout/dashboard/PageHeader";

// interface BinDetail {
//   id: string;
//   sublocationName: string;
//   quantity: number;
// }

// interface Product {
//   inflowId: string;
//   name: string;
//   sku: string;
//   slug: string;
//   thumbnail: string | null;
//   trackSerials: boolean;
// }

// interface InventoryStockRow {
//   id: string;
//   product: Product;
//   locationId: string;
//   locationName: string;
//   quantityOnHand: number;
//   quantityReserved: number;
//   quantityAvailable: number;
//   quantityInTransit: number;
//   reorderThreshold: number;
//   bins: BinDetail[];
// }

// export default function InventoryList() {
//   const [inventory, setInventory] = useState<InventoryStockRow[]>([]);
//   const [searchQuery, setSearchQuery] = useState("");
//   const [isLoading, setIsLoading] = useState(true);
//   const [activeInspectionItem, setActiveInspectionItem] = useState<InventoryStockRow | null>(null);

//   const fetchInventory = async () => {
//     try {
//       const res = await fetch("/api/admin/inventory");
//       if (res.ok) {
//         const data = await res.json();
//         setInventory(data);
//       }
//     } catch (err) {
//       console.error("Error updating system inventory states:", err);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchInventory();
//   }, []);

//   const filteredItems = inventory.filter((item) => {
//     const normQuery = searchQuery.toLowerCase();
//     return (
//       item.product.name.toLowerCase().includes(normQuery) ||
//       item.product.slug.toLowerCase().includes(normQuery) ||
//       item.locationName.toLowerCase().includes(normQuery)
//     );
//   });

//   // Calculate total units currently held in Bulk Floor / Unassigned storage across filtered stock lines
//   const totalBulkStockOverall = filteredItems.reduce((acc, item) => {
//     const binSum = item.bins.reduce((bAcc, b) => bAcc + b.quantity, 0);
//     return acc + Math.max(0, item.quantityOnHand - binSum);
//   }, 0);

//   return (
//     <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
//       <PageHeader
//         title="Master Stock Ledger"
//         description="Multi-warehouse balance records, dynamic picker bin configurations, and reserve allocations."
//         icon={Layers}
//         className="border-b pb-5"
//       > 
//         <Button asChild size="sm" className="gap-1.5 shrink-0">
//           <Link href="/dashboard/inventory/stocks/new">
//             <Plus className="w-4 h-4" /> Post Stock Adjustment
//           </Link>
//         </Button>
//       </PageHeader>

//       {/* Filter Options Utility Block */}
//       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
//         <div className="relative w-full sm:max-w-sm">
//           <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/70" />
//           <Input
//             placeholder="Filter stock by name, SKU slug, or facility..."
//             value={searchQuery}
//             onChange={(e) => setSearchQuery(e.target.value)}
//             className="pl-9 text-xs"
//           />
//         </div>

//         <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
//           <div className="text-xs text-muted-foreground font-medium bg-muted/50 border px-3 py-1.5 rounded-lg flex items-center gap-2">
//             <Info className="w-3.5 h-3.5 text-blue-500" />
//             Monitored Lines: <span className="font-bold text-foreground">{inventory.length}</span>
//           </div>

//           {/* Bulk Total Counter Badge */}
//           <div className="text-xs text-muted-foreground font-medium bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 px-3 py-1.5 rounded-lg flex items-center gap-2">
//             <Warehouse className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
//             Total Bulk Area:{" "}
//             <span className="font-bold font-mono text-foreground">
//               {totalBulkStockOverall.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
//             </span>
//           </div>
//         </div>
//       </div>

//       {/* Main Datagrid Output */}
//       {isLoading ? (
//         <div className="p-16 text-center text-xs text-muted-foreground italic bg-card border rounded-xl shadow-sm">
//           Fetching cross-terminal ledger matrices...
//         </div>
//       ) : filteredItems.length === 0 ? (
//         <div className="p-16 text-center text-xs text-muted-foreground border-dashed border-2 rounded-xl bg-card">
//           No active inventory allocations or matching configurations found.
//         </div>
//       ) : (
//         <div className="border rounded-xl bg-card shadow-sm overflow-hidden">
//           <div className="overflow-x-auto">
//             <table className="w-full text-left border-collapse">
//               <thead>
//                 <tr className="bg-muted/40 border-b text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
//                   <th className="p-4">SKU Product Assignment</th>
//                   <th className="p-4">Logistics Depot</th>
//                   <th className="p-4 text-right">On Hand</th>
//                   <th className="p-4 text-right">Committed</th>
//                   <th className="p-4 text-right">In Transit</th> 
//                   <th className="p-4 text-right">Available for Sale</th>
//                   <th className="p-4 text-center">Sub-bins & Bulk</th>
//                   <th className="p-4 text-right">Actions</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y text-xs">
//                 {filteredItems.map((item) => {
//                   const isOutOfStock = item.quantityAvailable <= 0;
//                   const isStrained = item.quantityReserved > item.quantityOnHand * 0.5;
                  
//                   // Calculate bin sum and bulk floor area quantity
//                   const totalBinQty = item.bins.reduce((sum, b) => sum + b.quantity, 0);
//                   const bulkAreaQty = Math.max(0, item.quantityOnHand - totalBinQty);

//                   return (
//                     <tr key={item.id} className="hover:bg-muted/20 transition-colors">
//                       {/* Product Column */}
//                       <td className="p-4 max-w-[220px]">
//                         <div className="flex items-center gap-2.5">
//                           <div className="w-10 h-10 bg-muted border rounded-lg overflow-hidden flex items-center justify-center shrink-0 relative">
//                             {item.product.thumbnail ? (
//                               <Image src={item.product.thumbnail} alt={item.product.name} className="w-full h-full object-cover" width={10} height={10} />
//                             ) : (
//                               <Package className="w-4 h-4 text-muted-foreground/50" />
//                             )}
//                           </div>
//                           <div className="min-w-0">
//                             <span className="font-semibold text-foreground block truncate">{item.product.name}</span>
//                             <span className="font-mono text-[10px] text-muted-foreground block truncate">{item.product.slug}</span>
//                           </div>
//                         </div>

//                       </td>

//                       {/* Location Column */}
//                       <td className="p-4 text-muted-foreground font-medium">
//                         <div className="flex items-center gap-1.5 truncate max-w-[150px]">
//                           <Warehouse className="w-3.5 h-3.5 opacity-60 shrink-0" />
//                           <span className="truncate">{item.locationName}</span>
//                         </div>
//                       </td>

//                       {/* On Hand Numeric Value */}
//                       <td className="p-4 text-right font-mono font-medium text-foreground">
//                         {item.quantityOnHand.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
//                       </td>

//                       {/* Reserved Volume Value */}
//                       <td className="p-4 text-right font-mono text-muted-foreground">
//                         {item.quantityReserved > 0 ? (
//                           <span className={`inline-flex items-center gap-1 ${isStrained ? "text-amber-600 font-bold" : ""}`}>
//                             {item.quantityReserved.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
//                           </span>
//                         ) : (
//                           <span className="opacity-40">-</span>
//                         )}
//                       </td>

//                       {/* In Transit Numeric Column */}
//                       <td className="p-4 text-right font-mono text-muted-foreground">
//                         {item.quantityInTransit > 0 ? (
//                           <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 font-bold px-1.5 py-0.5 rounded-sm text-[11px]">
//                             <Truck className="w-3 h-3 shrink-0" />
//                             {item.quantityInTransit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
//                           </span>
//                         ) : (
//                           <span className="opacity-30">-</span>
//                         )}
//                       </td>

//                       {/* Available Balance Status String */}
//                       <td className="p-4 text-right font-mono">
//                         {isOutOfStock ? (
//                           <span className="text-destructive font-bold inline-flex items-center gap-1 bg-destructive/10 px-1.5 py-0.5 rounded-sm">
//                             <AlertTriangle className="w-3 h-3" /> 0.00
//                           </span>
//                         ) : (
//                           <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
//                             {item.quantityAvailable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
//                           </span>
//                         )}
//                       </td>

//                       {/* Internal Storage Sublocations Count & Bulk Area Display */}
//                       <td className="p-4 text-center">
//                         <button
//                           type="button"
//                           onClick={() => setActiveInspectionItem(item)}
//                           className="inline-flex items-center gap-1.5 bg-muted/60 hover:bg-muted border px-2.5 py-1 rounded-md transition-colors text-[11px] group"
//                         >
//                           <Layers className="w-3.5 h-3.5 text-blue-500 shrink-0" />
//                           <span className="font-semibold">
//                             {item.bins.length} {item.bins.length === 1 ? "bin" : "bins"}
//                           </span>
//                           <span className="text-muted-foreground font-mono text-[10px] pl-1 border-l border-muted-foreground/30">
//                             Bulk: <strong className="text-amber-600 dark:text-amber-400 font-medium">{bulkAreaQty.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
//                           </span>
//                         </button>
//                       </td>

//                       {/* Actions Controls */}
//                       <td className="p-4">
//                         <div className="flex items-center justify-end gap-1">
//                           <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground hover:text-foreground gap-1">
//                             <Link href={`/dashboard/inventory/stocks/${item.id}`} title="View">
//                               <View className="w-3 h-3" /> View
//                             </Link>
//                           </Button>
//                           <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground hover:text-foreground gap-1">
//                             <Link href={`/dashboard/inventory/stocks/${item.id}/adjust`}>
//                               <Edit className="w-3 h-3" /> Adjust
//                             </Link>
//                           </Button>
//                         </div>
//                       </td>
//                     </tr>
//                   );
//                 })}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       )}

//       {/* Slide-out Inspection Modal Panel */}
//       {activeInspectionItem && (() => {
//         const totalBinQty = activeInspectionItem.bins.reduce((sum, bin) => sum + bin.quantity, 0);
//         const bulkAreaQty = Math.max(0, activeInspectionItem.quantityOnHand - totalBinQty);

//         return (
//           <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
//             <div className="bg-card border w-full max-w-md rounded-xl p-5 shadow-lg space-y-4 animate-in fade-in zoom-in-95 duration-150">
//               <div className="flex items-start justify-between border-b pb-3">
//                 <div>
//                   <h3 className="text-sm font-bold text-foreground">Storage Layout Inspection</h3>
//                   <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{activeInspectionItem.product.slug}</p>
//                 </div>
//                 <Badge variant="outline" className="text-[10px] py-0 h-5 border-blue-200 text-blue-600 bg-blue-50">
//                   {activeInspectionItem.locationName}
//                 </Badge>
//               </div>

//               {/* Total Summary Matrix Cards */}
//               <div className="grid grid-cols-3 gap-2 bg-muted/40 p-2.5 rounded-lg border text-center">
//                 <div>
//                   <span className="text-[10px] text-muted-foreground font-medium block uppercase tracking-wide">Total On Hand</span>
//                   <span className="text-xs font-mono font-bold text-foreground">
//                     {activeInspectionItem.quantityOnHand.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
//                   </span>
//                 </div>
//                 <div>
//                   <span className="text-[10px] text-muted-foreground font-medium block uppercase tracking-wide">In Bins</span>
//                   <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
//                     {totalBinQty.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
//                   </span>
//                 </div>
//                 <div>
//                   <span className="text-[10px] text-muted-foreground font-medium block uppercase tracking-wide">Bulk Area</span>
//                   <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
//                     {bulkAreaQty.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
//                   </span>
//                 </div>
//               </div>

//               {/* Picking Slots & Bulk Area Detailed Breakdown */}
//               <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
//                 <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1">
//                   Storage Allocation Breakdown
//                 </div>

//                 {/* Bulk Floor Row */}
//                 <div className="flex items-center justify-between border p-2 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/60 font-medium">
//                   <span className="text-xs text-amber-900 dark:text-amber-300 flex items-center gap-2">
//                     <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
//                     Bulk Floor / Unassigned Area
//                   </span>
//                   <span className="font-mono text-xs text-amber-800 dark:text-amber-400">
//                     <strong className="text-amber-950 dark:text-amber-200">
//                       {bulkAreaQty.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
//                     </strong>{" "}
//                     units
//                   </span>
//                 </div>

//                 {/* Assigned Sub-bins Rows */}
//                 {activeInspectionItem.bins.map((bin) => (
//                   <div key={bin.id} className="flex items-center justify-between border p-2 rounded-lg bg-muted/30 font-medium">
//                     <span className="text-xs text-foreground flex items-center gap-2">
//                       <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
//                       {bin.sublocationName}
//                     </span>
//                     <span className="font-mono text-xs text-muted-foreground">
//                       <strong className="text-foreground">
//                         {bin.quantity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
//                       </strong>{" "}
//                       units
//                     </span>
//                   </div>
//                 ))}
//               </div>

//               <div className="flex justify-end pt-2 border-t">
//                 <Button
//                   type="button"
//                   variant="outline"
//                   size="sm"
//                   onClick={() => setActiveInspectionItem(null)}
//                   className="text-xs px-4"
//                 >
//                   Close View
//                 </Button>
//               </div>
//             </div>
//           </div>
//         );
//       })()}

//     </div>
//   );
// }