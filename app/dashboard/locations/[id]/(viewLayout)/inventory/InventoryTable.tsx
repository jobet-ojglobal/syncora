"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import useSWR from "swr";
import { RefreshCw, AlertCircle, Edit, Layers, 
  Sliders, AlertTriangle, Package, 
  SlidersHorizontal,
  Info,
  RotateCcw,
  Warehouse,
  CheckCircle2,
  XCircle,
  Eye,
  Edit3,
  MoreHorizontalIcon,
  Truck,
  Barcode,
  Tag
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Image from "next/image";
import SearchInput from "@/components/shared/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { InspectionItem, StorageInspectionModalEnhance } from "@/components/inventory/storage-inspection-modal";
import { Location, Sublocation } from "@/types/location.type";
import { TableMultiSelect } from "@/components/shared/table-multiselect";
import { ReplenishmentSettingsModal } from "@/components/inventory/replenishment-settings-modal";
import { ProductPriceType } from "@/generated/prisma/enums";
import { PricingSchemeInspectionModal } from "@/components/inventory/pricing-scheme-inspection-modal";

interface BinDetail {
  id: string;
  sublocationName: string;
  quantity: number;
}

export interface PricingSchemeCurrency {
  id: string;
  inflowId: string;
  name: string;
  isActive: boolean;
  isDefault: boolean;
  isTaxInclusive: boolean;
  currencySymbol: string;
  currencyCode: string;
}

export interface ProductPrice {
  id: string;
  priceType: ProductPriceType;
  unitPrice: number;
  fixedMarkup: number | null;
  pricingScheme: PricingSchemeCurrency;
}

interface Product {
  inflowId: string;
  name: string;
  sku: string;
  slug: string;
  thumbnail: string | null;
  trackSerials: boolean;
  isActive: boolean;
  prices: ProductPrice[];
  defaultPrice: ProductPrice;
}

export interface InventoryStockRow {
  id: string;
  product: Product;
  locationId: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  isAutoReorderEnabled: boolean;
  quantityInTransit: number;
  reorderThreshold: number;
  reorderQuantity: number;
  preferredSourceLocationId: string | null;
  bins: BinDetail[];
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// 1. Updated Props Interface
export interface InventoryTableProps {
  locationId: string;
  locationInflowId?: string;
  locations: Location[];
  sublocations: Sublocation[];
  onDataChanged?: () => Promise<void>;
}

export function InventoryTable({
  locationId,
  locationInflowId,
  locations,
  sublocations,
  onDataChanged,
}: InventoryTableProps) {
  const [syncingProductId, setSyncingProductId] = useState<string | null>(null);
  const [activeInspectionItem, setActiveInspectionItem] = useState<InspectionItem | null>(null);
  const [selectedReplenishItem, setSelectedReplenishItem] = useState<InventoryStockRow | null>(null);
  const [pricingInspectionItem, setPricingInspectionItem] = useState<InventoryStockRow | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedSubLocations, setSelectedSubLocations] = useState<string[]>([]);
  const [trackSerialsFilter, setTrackSerialsFilter] = useState("all");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [minQty, setMinQty] = useState("");
  const [maxQty, setMaxQty] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);


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

  if (selectedSubLocations.length > 0) {
    queryParams.append("sublocationIds", selectedSubLocations.join(","));
  }

  if (trackSerialsFilter !== "all") {
    queryParams.append("trackSerials", trackSerialsFilter);
  }

  if (lowStockOnly) {
    queryParams.append("lowStock", "true");
  }

  if (minQty !== "") queryParams.append("minQty", minQty);
  if (maxQty !== "") queryParams.append("maxQty", maxQty);

  const {
    data: payload,
    mutate,
    error,
    isLoading,
    isValidating,
  } = useSWR(`/api/admin/locations/${locationId}/inventory?${queryParams.toString()}`, fetcher, {
    keepPreviousData: true,
    revalidateOnFocus: false,
  });

  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setSelectedSubLocations([]);
    setTrackSerialsFilter("all");
    setLowStockOnly(false);
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

  // Sync single product with cloud / upstream
  const handleSyncSingleProduct = (item: InventoryStockRow) => {
    if (!locationInflowId) {
      toast.error("Location configuration missing for cloud sync.");
      return;
    }

    setSyncingProductId(item.product.inflowId);

    toast.promise(
      async () => {
        const res = await fetch(`/api/sync/cloud`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source: "single_inventory",
            locationIds: [locationInflowId],
            selectedRecords: [item.product.inflowId],
          }),
        });

        const resData = await res.json();
        if (!res.ok) {
          throw new Error(resData.error || `Failed to sync ${item.product.name}`);
        }

        if (onDataChanged) await onDataChanged();
        return resData;
      },
      {
        loading: `Syncing cloud inventory for "${item.product.name}"...`,
        success: `Inventory for ${item.product.name} updated!`,
        error: (err) => err.message || `Failed to sync ${item.product.name}`,
        finally: () => { 
          mutate()
          setSyncingProductId(null)
        },
      }
    );
  };

  const sublocationOptions = sublocations.map(sub => 
    ({
      label: sub.name,
      value: sub.id,
    })
  )

  const hasActiveFilters =
    statusFilter !== "all" ||
    selectedSubLocations.length > 0 ||
    trackSerialsFilter !== "all" ||
    lowStockOnly ||
    minQty !== "" ||
    maxQty !== "" ||
    searchQuery !== "";

  const formatPriceValue = (priceItem: ProductPrice | null) => {
    if (!priceItem) return "—";
    const symbol = priceItem.pricingScheme.currencySymbol;

    if (priceItem.priceType === "FixedPrice" && priceItem.unitPrice !== null) {
      return `${symbol}${priceItem.unitPrice.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }

    if (priceItem.priceType === "FixedMarkup" && priceItem.fixedMarkup !== null) {
      return `+${symbol}${priceItem.fixedMarkup.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }

    return "—";
  };

  if (error) {
    return (
      <div className="p-6 text-center text-xs text-red-500 bg-destructive/10 border border-destructive/20 rounded-xl font-medium">
        Hydration Failure: Failed resolving cross-terminal inventory ledger matrix schemas.
      </div>
    );
  }

  return (
    <div className="space-y-4">
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

          <TableMultiSelect
            title="SubLocations"
            options={sublocationOptions}
            value={selectedSubLocations}
            onValueChange={(values) => {
              setSelectedSubLocations(values);
              setPageIndex(0);
            }}
            size="sm"
          />

          {/* Serial Tracking Filter */}
          <Select
            value={trackSerialsFilter}
            onValueChange={(value) => {
              setTrackSerialsFilter(value);
              setPageIndex(0);
            }}
          >
            <SelectTrigger className="w-[145px] h-9">
              <SelectValue placeholder="All Tracking" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tracking</SelectItem>
              <SelectItem value="true">Serialized Only</SelectItem>
              <SelectItem value="false">Non-Serialized</SelectItem>
            </SelectContent>
          </Select>

          {/* Low Stock Toggle Button */}
          <Button
            type="button"
            variant={lowStockOnly ? "destructive" : "outline"}
            size="sm"
            onClick={() => {
              setLowStockOnly(!lowStockOnly);
              setPageIndex(0);
            }}
            className="h-9 px-3 text-xs gap-1.5"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            Low Stock
          </Button>

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

          {hasActiveFilters && (
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

      <div className="space-y-4">
        <div className="border rounded-xl bg-card shadow-xs overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="pl-5 w-[240px] text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  SKU Product Assignment
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
              { isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="p-20 text-center text-xs text-muted-foreground bg-card italic">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                    Loading inventory stock...
                  </TableCell>
                </TableRow>
              ) : inventory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <div className="border border-dashed rounded-xl p-6 text-center bg-muted/20">
                      <Truck className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                      <p className="text-xs font-medium text-muted-foreground">
                        No inventory stock items matching current parameters found.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                inventory.map((item) => {
                  const isOutOfStock = item.quantityAvailable <= 0;
                  const isStrained = item.quantityReserved > item.quantityOnHand * 0.5;

                  const totalBinQty = item.bins?.reduce((sum, b) => sum + b.quantity, 0) || 0;
                  const bulkAreaQty = Math.max(0, item.quantityOnHand - totalBinQty);

                  const isItemSyncing = syncingProductId === item.product.inflowId;
                  const isLowStock =
                    item.reorderThreshold > 0 &&
                    item.quantityAvailable <= item.reorderThreshold;

                  const defaultPrice = item.product.defaultPrice;
                  const pricesCount = item.product.prices?.length || 0;

                  return (
                    <TableRow key={item.id}  className={`hover:bg-muted/20 transition-colors ${
                        isLowStock ? "bg-amber-50/30 dark:bg-amber-950/15" : ""
                      }`}>
                      {/* Product */}
                      {/* <TableCell className="pl-5">
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
                          {isLowStock && (
                            <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shrink-0">
                              <AlertCircle className="w-2.5 h-2.5" /> LOW
                            </span>
                          )}
                        </div>
                      </TableCell> */}
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
                            
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="font-semibold text-foreground text-[13px] block truncate">
                                  {item.product.name}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{item.product.name}</p>
                              </TooltipContent>
                            </Tooltip>
                            <span className="font-mono text-[10px] text-muted-foreground block truncate">
                              {item.product.sku || item.product.slug}
                            </span>
                          </div>

                          {/* Tracking Badges */}
                          <div className="flex items-center gap-1 shrink-0">
                            {item.product.trackSerials && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 p-1 rounded">
                                    <Barcode className="w-3 h-3" />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Serial Tracking Enabled</p>
                                </TooltipContent>
                              </Tooltip>
                            )}

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
                                <p>{item.product.isActive ? "Active product" : "Disabled product"}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>

                          {isLowStock && (
                            <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shrink-0">
                              <AlertCircle className="w-2.5 h-2.5" /> LOW
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        <button
                          type="button"
                          onClick={() => setPricingInspectionItem(item)}
                          className="inline-flex flex-col items-end group hover:opacity-80 transition-opacity cursor-pointer text-right w-full"
                        >
                          <div className="font-mono font-bold text-foreground text-[13px] flex items-center gap-1">
                            <span>{formatPriceValue(defaultPrice)}</span>
                            {pricesCount > 1 && (
                              <span className="text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/50 rounded px-1 font-sans font-medium">
                                +{pricesCount - 1}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground truncate max-w-[120px] flex items-center gap-0.5">
                            <Tag className="w-2.5 h-2.5 text-emerald-500 inline" />
                            {defaultPrice?.pricingScheme.name || "Default Scheme"}
                          </span>
                        </button>
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
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={isItemSyncing}
                          onClick={() => handleSyncSingleProduct(item)}
                          className="h-8 w-8 text-muted-foreground hover:text-indigo-600 hover:bg-indigo-500/5"
                          title={`Fetch Latest Cloud Inventory for ${item.product.name}`}
                        >
                          <RefreshCw
                            className={`w-3.5 h-3.5 ${
                              isItemSyncing ? "animate-spin text-indigo-500" : ""
                            }`}
                          />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-blue-600"
                          title="Configure Auto-Replenishment Rules"
                          onClick={() => setSelectedReplenishItem(item)}
                        >
                          <Sliders className="w-3.5 h-3.5" />
                        </Button>
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
                })
              )}
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

      <StorageInspectionModalEnhance
        item={activeInspectionItem}
        onClose={() => setActiveInspectionItem(null)}
      />

      <PricingSchemeInspectionModal
        item={pricingInspectionItem}
        onClose={() => setPricingInspectionItem(null)}
      />

      {selectedReplenishItem && (
        <ReplenishmentSettingsModal
          onClose={() => setSelectedReplenishItem(null)}
          item={selectedReplenishItem}
          locations={locations}
          onSaveSuccess={() => mutate()}
        />
      )}
    </div>
  );
}



{/* Table Data States */}
      // {isLoading ? (
      //   <div className="p-12 text-center text-xs text-muted-foreground italic bg-card border rounded-xl shadow-sm">
      //     Loading inventory stock...
      //   </div>
      // ) : error ? (
      //   <div className="p-12 text-center text-xs text-destructive bg-card border border-destructive/20 rounded-xl shadow-sm">
      //     Failed to load inventory records.
      //   </div>
      // ) : inventory.length === 0 ? (
      //   <div className="p-12 text-center text-xs text-muted-foreground border-dashed border-2 rounded-xl bg-card">
      //     No inventory stock items matching current parameters found.
      //   </div>
      // ) : (
      //   <div className="border rounded-xl bg-card shadow-sm overflow-hidden">
      //     <div className="overflow-x-auto">
      //       <table className="w-full text-left border-collapse text-xs">
      //         <thead>
      //           <tr className="bg-muted/40 border-b text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
      //             <th className="p-4">SKU Product Line</th>
      //             <th className="p-4 text-right">On Hand</th>
      //             <th className="p-4 text-right">Committed</th>
      //             <th className="p-4 text-right">Outbound Transit</th>
      //             <th className="p-4 text-right">Available for Sale</th>
      //             <th className="p-4 text-center">Sub-bins & Bulk</th>
      //             <th className="p-4 text-right">Actions</th>
      //           </tr>
      //         </thead>
      //         <tbody className="divide-y">
      //           {inventory.map((item: InventoryStockRow) => {
      //             const isItemSyncing = syncingProductId === item.product.inflowId;
      //             const isOutOfStock = item.quantityAvailable <= 0;
      //             const isLowStock =
      //               item.reorderThreshold > 0 &&
      //               item.quantityAvailable <= item.reorderThreshold;

      //             const totalBinQty = item.bins.reduce(
      //               (sum: number, b: any) => sum + b.quantity,
      //               0
      //             );
      //             const bulkAreaQty = Math.max(0, item.quantityOnHand - totalBinQty);

      //             return (
      //               <tr
      //                 key={item.id}
      //                 className={`hover:bg-muted/20 transition-colors ${
      //                   isLowStock ? "bg-amber-50/30 dark:bg-amber-950/15" : ""
      //                 }`}
      //               >
      //                 <td className="p-4 max-w-[300px]">
                        
      //                   <div className="flex items-center gap-2.5 max-w-[220px]">
      //                     <div className="w-9 h-9 bg-muted border rounded-lg overflow-hidden flex items-center justify-center shrink-0 relative">
      //                       {item.product.thumbnail ? (
      //                         <Image
      //                           src={item.product.thumbnail}
      //                           alt={item.product.name}
      //                           className="w-full h-full object-cover"
      //                           width={36}
      //                           height={36}
      //                         />
      //                       ) : (
      //                         <Package className="w-4 h-4 text-muted-foreground/50" />
      //                       )}
      //                     </div>
      //                     <div className="min-w-0">
      //                       <span className="font-semibold text-foreground text-[13px] block truncate">
      //                         {item.product.name}
      //                       </span>
      //                       <span className="font-mono text-[10px] text-muted-foreground block truncate">
      //                         {item.product.slug}
      //                       </span>
      //                     </div>
      //                     {isLowStock && (
      //                       <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shrink-0">
      //                         <AlertCircle className="w-2.5 h-2.5" /> LOW
      //                       </span>
      //                     )}
      //                   </div>
      //                 </td>

      //                 <td className="p-4 text-right font-mono font-medium text-foreground">
      //                   {item.quantityOnHand.toLocaleString(undefined, { minimumFractionDigits: 2 })}
      //                 </td>

      //                 <td className="p-4 text-right font-mono text-muted-foreground">
      //                   {item.quantityReserved > 0 ? (
      //                     <span>
      //                       {item.quantityReserved.toLocaleString(undefined, { minimumFractionDigits: 2 })}
      //                     </span>
      //                   ) : (
      //                     <span className="opacity-30">-</span>
      //                   )}
      //                 </td>

      //                 <td className="p-4 text-right font-mono text-muted-foreground">
      //                   {item.quantityInTransit > 0 ? (
      //                     <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 font-bold px-1.5 py-0.5 rounded-sm text-[10px]">
      //                       {item.quantityInTransit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
      //                     </span>
      //                   ) : (
      //                     <span className="opacity-30">-</span>
      //                   )}
      //                 </td>

      //                 <td className="p-4 text-right font-mono">
      //                   {isOutOfStock ? (
      //                     <span className="text-destructive font-bold inline-flex items-center gap-1 bg-destructive/10 px-1.5 py-0.5 rounded-sm">
      //                       <AlertTriangle className="w-3 h-3" /> 0.00
      //                     </span>
      //                   ) : (
      //                     <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
      //                       {item.quantityAvailable.toLocaleString(undefined, {
      //                         minimumFractionDigits: 2,
      //                         maximumFractionDigits: 4,
      //                       })}
      //                     </span>
      //                   )}
      //                 </td>

      //                 <td className="p-4 text-center">
      //                   <button
      //                     type="button"
      //                     onClick={() => onInspectBins(item)}
      //                     className="inline-flex items-center gap-1.5 bg-muted/60 hover:bg-muted border px-2.5 py-1 rounded-md transition-colors text-[11px]"
      //                   >
      //                     <Layers className="w-3.5 h-3.5 text-blue-500 shrink-0" />
      //                     <span className="font-semibold">
      //                       {item.bins.length} {item.bins.length === 1 ? "bin" : "bins"}
      //                     </span>
      //                     <span className="text-muted-foreground font-mono text-[10px] pl-1 border-l border-muted-foreground/30">
      //                       Bulk:{" "}
      //                       <strong className="text-amber-600 dark:text-amber-400 font-medium">
      //                         {bulkAreaQty.toLocaleString(undefined, { maximumFractionDigits: 2 })}
      //                       </strong>
      //                     </span>
      //                   </button>
      //                 </td>

      //                 <td className="p-4 text-right">
      //                   <div className="flex items-center justify-end gap-1.5">
      //                     <Button
      //                       variant="ghost"
      //                       size="icon"
      //                       disabled={isItemSyncing}
      //                       onClick={() => handleSyncSingleProduct(item)}
      //                       className="h-8 w-8 text-muted-foreground hover:text-indigo-600 hover:bg-indigo-500/5"
      //                       title={`Fetch Latest Cloud Inventory for ${item.product.name}`}
      //                     >
      //                       <RefreshCw
      //                         className={`w-3.5 h-3.5 ${
      //                           isItemSyncing ? "animate-spin text-indigo-500" : ""
      //                         }`}
      //                       />
      //                     </Button>

      //                     <Button
      //                       variant="ghost"
      //                       size="sm"
      //                       className="h-7 w-7 p-0 text-muted-foreground hover:text-blue-600"
      //                       title="Configure Auto-Replenishment Rules"
      //                       onClick={() => onSelectItemForReplenishment(item)}
      //                     >
      //                       <Sliders className="w-3.5 h-3.5" />
      //                     </Button>

      //                     <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs font-semibold gap-1">
      //                       <Link href={`/dashboard/inventory/stocks/${item.id}/adjust`}>
      //                         <Edit className="w-3 h-3" /> Adjust
      //                       </Link>
      //                     </Button>
      //                   </div>
      //                 </td>
      //               </tr>
      //             );
      //           })}
      //         </tbody>
      //       </table>
      //     </div>
      //   </div>
      // )}

      {/* Pagination Controls */}
      {/* {pagination && pagination.pageCount > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>
            Page {pageIndex + 1} of {pagination.pageCount} ({pagination.totalRecords} records)
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pageIndex === 0}
              onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
              className="h-7 px-3 text-xs"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pageIndex + 1 >= pagination.pageCount}
              onClick={() => setPageIndex((p) => p + 1)}
              className="h-7 px-3 text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      )} */}