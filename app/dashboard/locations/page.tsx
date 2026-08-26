"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Plus, 
  ChevronDown, 
  ChevronRight, 
  Edit3, 
  Eye, 
  RefreshCw, 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  User, 
  MoreHorizontal, 
  Package, 
  CheckCircle2, 
  XCircle, 
  Wrench,
  Trash2,
  Building,
  Layers,
  Users,
  Box
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import useSWR from "swr";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import PageHeader from "@/components/layout/dashboard/PageHeader";
import SearchInput from "@/components/shared/search-input";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LocationDeleteButton } from "@/components/location/location-delete-button";

// --- Types & Interfaces ---

export type LocationType = "WAREHOUSE" | "STORE" | "FULFILLMENT_CENTER" | "TRANSIT";
export type LocationStatus = "ACTIVE" | "INACTIVE" | "MAINTENANCE";

export interface SublocationSummary {
  id: string;
  name: string;
  binCount: number;
}

export interface LocationRow {
  id: string;
  inflowId: string;
  name: string;
  type: LocationType;
  isDefault: boolean;
  status: LocationStatus;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state?: string | null;
  postalCode?: string | null;
  country: string;
  phone?: string | null;
  email?: string | null;
  managerName?: string | null;
  totalStockUnits: number;
  sublocationCount: number;
  teams: number;
  activeOrdersCount: number;
  sublocations: SublocationSummary[];
  createdAt: string;
  updatedAt: string;
}

interface ActionPayload {
  location: LocationRow;
  targetStatus: LocationStatus;
  title: string;
  description: string;
  toastSuccess: string;
}

// Fetcher utility
const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to load inventory locations.");
    return res.json();
  });

// Helper badges formatting
const getStatusBadgeVariant = (status: LocationStatus) => {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60";
    case "INACTIVE":
      return "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700";
    case "MAINTENANCE":
      return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60";
    default:
      return "bg-zinc-100 text-zinc-600 border-zinc-200";
  }
};

const getTypeBadgeVariant = (type?: LocationType | null) => {
  if (!type) return "bg-slate-100 text-slate-700 border-slate-200";

  switch (type) {
    case "WAREHOUSE":
      return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/60";
    case "STORE":
      return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800/60";
    case "FULFILLMENT_CENTER":
      return "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800/60";
    case "TRANSIT":
      return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
};

export default function LocationListPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const PAGE_SIZE = 50;

  const [status, setStatus] = useState<string>("ALL");
  const [type, setType] = useState<string>("ALL");

  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [viewingLocation, setViewingLocation] = useState<LocationRow | null>(null);
  const [activeAction, setActiveAction] = useState<ActionPayload | null>(null);
  const [isDeleting, setIsDeleting] = useState<LocationRow | null>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPageIndex(0);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleStatusChange = (val: string) => {
    setStatus(val);
    setPageIndex(0);
  };

  const handleTypeChange = (val: string) => {
    setType(val);
    setPageIndex(0);
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setDebouncedSearch("");
    setStatus("ALL");
    setType("ALL");
    setPageIndex(0);
  };

  const queryString = new URLSearchParams({
    search: encodeURIComponent(debouncedSearch),
    status,
    type,
    page: String(pageIndex),
    limit: String(PAGE_SIZE),
  }).toString();

  const {
    data: payload,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR(`/api/admin/locations/filtered?${queryString}`, fetcher, {
    keepPreviousData: true,
    revalidateOnFocus: false,
  });

  const locations: LocationRow[] = payload?.data || [];
  const totalRecords = payload?.totalRecords || 0;
  const pageCount = payload?.pageCount || 0;

  const toggleRowExpand = (id: string) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Status Action Handler Modal
  const openStatusActionModal = (
    location: LocationRow,
    targetStatus: LocationStatus,
    title: string,
    description: string,
    toastSuccess: string
  ) => {
    setActiveAction({ location, targetStatus, title, description, toastSuccess });
  };

  const handleStatusUpdate = async () => {
    if (!activeAction) return;

    try {
      const res = await fetch(`/api/admin/locations/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inflowId: activeAction.location.inflowId, status: activeAction.targetStatus }),
      });

      if (res.ok) {
        toast.success(activeAction.toastSuccess);
        await mutate();
        setActiveAction(null);
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to update location status.");
      }
    } catch {
      toast.error("Network communication failure.");
    }
  };

  // Delete Handler
  const handleDeleteLocation = async () => {
    if (!isDeleting) return;

    try {
      const res = await fetch(`/api/admin/locations/${isDeleting.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success(`Location ${isDeleting.name} has been deleted.`);
        await mutate();
        setIsDeleting(null);
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to delete location.");
      }
    } catch {
      toast.error("Network communication failure.");
    }
  };

  if (error) {
    return (
      <div className="p-6 text-center text-xs text-red-500 bg-destructive/10 border border-destructive/20 rounded-xl font-medium">
        Hydration Failure: Failed resolving enterprise location directory records.
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6 text-xs">
      {/* Page Header */}
      <PageHeader
        title="Locations & Warehouses"
        description="Manage enterprise facilities, retail outlets, fulfillment nodes, and transit destinations."
        icon={Building2}
        className="border-b border-border pb-4"
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => mutate()}
            disabled={isLoading || isValidating}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 mr-1.5 ${
                isLoading || isValidating ? "animate-spin" : ""
              }`}
            />
            Sync
          </Button>
          <Button asChild size="sm">
            <Link href="/dashboard/locations/new">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              New Location
            </Link>
          </Button>
        </div>
      </PageHeader>

      {/* Toolbar / Search Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="w-full flex flex-col sm:flex-row gap-2 sm:max-w-2xl">
          <SearchInput
            placeholder="Search location name, code, city, manager..."
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            isLoading={isValidating && !isLoading}
          />

          <div className="flex gap-2">
            <div className="w-full ">
              <Select value={type} onValueChange={handleTypeChange}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Facility Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  <SelectItem value="WAREHOUSE">Warehouse</SelectItem>
                  <SelectItem value="STORE">Retail Store</SelectItem>
                  <SelectItem value="FULFILLMENT_CENTER">Fulfillment Center</SelectItem>
                  <SelectItem value="TRANSIT">Transit Hub</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select value={status} onValueChange={handleStatusChange}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                  <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground font-medium bg-muted/50 border px-3 py-1.5 rounded-lg flex items-center gap-1.5 self-start sm:self-auto shrink-0">
          <Building className="w-3.5 h-3.5 text-muted-foreground" />
          Configured Locations:{" "}
          <span className="font-bold text-foreground">{totalRecords}</span>
        </div>
      </div>

      {/* Locations Table */}
      <div className="space-y-4">
        <div className="border rounded-xl bg-card shadow-2xs overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="border-b border-border hover:bg-transparent">
                <TableHead className="w-[40px] p-3 text-center" />
                <TableHead className="w-[180px] text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Facility Name
                </TableHead>
                <TableHead className="w-[130px] text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Type
                </TableHead>
                <TableHead className="w-[150px] text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  City / Country
                </TableHead>
                <TableHead className="w-[100px] text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </TableHead>
                <TableHead className="w-[100px] text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Sublocations
                </TableHead>
                <TableHead className="w-[110px] text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Stock Units
                </TableHead>
                <TableHead className="w-[80px] text-right pr-5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody className="text-xs font-medium divide-y divide-border/60">
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="p-20 text-center text-xs text-muted-foreground bg-card italic">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                    Synchronizing enterprise facilities data...
                  </TableCell>
                </TableRow>
              ) : locations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9}>
                    <div className="border border-dashed rounded-xl p-8 text-center bg-muted/20">
                      <Building2 className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                      <p className="text-xs font-medium text-muted-foreground">
                        No location facilities match the specified search and filter criteria.
                      </p>
                      {(status !== "ALL" || type !== "ALL" || searchQuery !== "") && (
                        <Button variant="link" size="sm" onClick={handleResetFilters} className="mt-1 text-xs">
                          Clear Filters
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                locations.map((location) => {
                  const isExpanded = !!expandedRows[location.id];
                  const isInactive = location.status === "INACTIVE";

                  const locationOptions = locations.filter(loc => loc.id !== location.id);

                  return (
                    <React.Fragment key={location.id}>
                      <TableRow className={`hover:bg-muted/40 transition-colors group align-middle ${isInactive ? "bg-muted/5 opacity-75" : ""}`}>
                        {/* Expand Toggle Button */}
                        <TableCell className="p-3 text-center align-middle">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() => toggleRowExpand(location.id)}
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>

                        {/* Facility Name */}
                        <TableCell className="p-3.5 align-middle">
                          <div className="font-semibold text-foreground text-xs leading-tight  flex flex-wrap items-center gap-2">
                            <Link href={`/dashboard/locations/${location.id}`} className="hover" >
                              {location.name}
                            </Link>

                             {location.isDefault && (
                            <Badge variant="secondary" className="bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900 text-indigo-700 dark:text-indigo-400 text-[10px] font-semibold h-5">
                              Primary Hub
                            </Badge>
                          )}
                          </div>
                          {location.managerName && (
                            <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <User className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate">{location.managerName}</span>
                            </div>
                          )}
                         
                        </TableCell>

                        {/* Facility Type */}
                        <TableCell className="p-3.5 align-middle">
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 h-5 font-semibold border ${getTypeBadgeVariant(location.type)}`}
                          >
                            {location.type ? location.type.replace(/_/g, " ") : "UNSPECIFIED"}
                          </Badge>
                        </TableCell>

                        {/* City / Country */}
                        <TableCell className="p-3.5 align-middle">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <MapPin className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                            <span className="truncate">{location.city}, {location.country}</span>
                          </div>
                        </TableCell>

                        {/* Status Badge */}
                        <TableCell className="p-3.5 align-middle text-center">
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 h-5 font-semibold border ${getStatusBadgeVariant(location.status)}`}
                          >
                            {location.status}
                          </Badge>
                        </TableCell>

                        {/* Sublocation Count Badge */}
                        <TableCell className="p-3.5 align-middle text-center">
                          <Badge variant="secondary" className="text-[10px] font-mono px-2 py-0.5">
                            <Layers className="w-3 h-3 mr-1 inline-block" />
                            {location.sublocationCount}
                          </Badge>
                        </TableCell>

                        {/* Stock Units */}
                        <TableCell className="p-3.5 align-middle text-center font-mono text-muted-foreground">
                          {location.totalStockUnits.toLocaleString()} units
                        </TableCell>

                        {/* Actions Menu */}
                        <TableCell className="p-3.5 pr-5 align-middle text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8">
                                <MoreHorizontal className="w-4 h-4" />
                                <span className="sr-only">Open location menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link
                                  href={`/dashboard/locations/${location.id}`}
                                >
                                  <Eye className="w-3.5 h-3.5 mr-2" /> Overview
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/locations/${location.id}/edit`}>
                                  <Edit3 className="w-3.5 h-3.5 mr-2" /> Edit Details
                                </Link>
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              {location.status !== "ACTIVE" && (
                                <DropdownMenuItem
                                  className="text-emerald-600 focus:text-emerald-700"
                                  onClick={() =>
                                    openStatusActionModal(
                                      location,
                                      "ACTIVE",
                                      "Set Facility Active",
                                      "Are you sure you want to enable operations for this location?",
                                      "Location is now set to active."
                                    )
                                  }
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 mr-2" /> Set Active
                                </DropdownMenuItem>
                              )}

                              {location.status !== "MAINTENANCE" && (
                                <DropdownMenuItem
                                  className="text-amber-600 focus:text-amber-700"
                                  onClick={() =>
                                    openStatusActionModal(
                                      location,
                                      "MAINTENANCE",
                                      "Set Under Maintenance",
                                      "Flag location as under maintenance? Dispatches may be suspended.",
                                      "Location is now flagged under maintenance."
                                    )
                                  }
                                >
                                  <Wrench className="w-3.5 h-3.5 mr-2" /> Set Maintenance
                                </DropdownMenuItem>
                              )}

                              {location.status !== "INACTIVE" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    openStatusActionModal(
                                      location,
                                      "INACTIVE",
                                      "Deactivate Location",
                                      "Deactivating will restrict new transfers and order dispatches to this site.",
                                      "Location deactivated."
                                    )
                                  }
                                >
                                  <XCircle className="w-3.5 h-3.5 mr-2" /> Deactivate
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuSeparator />

                              <DropdownMenuItem variant="destructive" asChild>
                                <LocationDeleteButton
                                  locationId={location.inflowId} 
                                  locationName={location.name}
                                  availableLocations={locationOptions.map(item => ({
                                    id: item.inflowId,
                                    name: item.name
                                  }))} 
                                  endpointUrl={`/api/admin/locations`}
                                  onSuccess={() => mutate()} 
                                  variant="full"
                                />
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>

                      {/* Expanded Accordion Breakdown */}
                      {isExpanded && (
                        <TableRow className="bg-muted/15 border-b hover:bg-muted/15">
                          <TableCell colSpan={9} className="p-4">
                            <div className="space-y-4 pl-8">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 bg-card border rounded-lg shadow-2xs">
                                {/* Address Breakdown */}
                                <div className="space-y-1">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                    <MapPin className="w-3 h-3" /> Full Address
                                  </span>
                                  <p className="text-xs font-medium text-foreground">
                                    {location.addressLine1}
                                    {location.addressLine2 && `, ${location.addressLine2}`}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground">
                                    {location.city}{location.state ? `, ${location.state}` : ""} {location.postalCode || ""}
                                  </p>
                                  <p className="text-[11px] font-semibold text-foreground">{location.country}</p>
                                </div>

                                {/* Contact Person */}
                                <div className="space-y-1">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                    <User className="w-3 h-3" /> Contact & Teams
                                  </span>
                                  <p className="text-xs font-medium text-foreground">
                                    {location.managerName || "No Manager Assigned"}
                                  </p>
                                  {location.email && (
                                    <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                                      <Mail className="w-3 h-3" /> {location.email}
                                    </div>
                                  )}
                                  {location.phone && (
                                    <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                                      <Phone className="w-3 h-3" /> {location.phone}
                                    </div>
                                  )}
                                  <div className="text-[11px] text-muted-foreground flex items-center gap-1 pt-1">
                                    <Users className="w-3 h-3" /> Assigned Teams: <strong className="text-foreground">{location.teams}</strong>
                                  </div>
                                </div>

                                {/* Logistics Metrics */}
                                <div className="space-y-1">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                    <Package className="w-3 h-3" /> Operations Overview
                                  </span>
                                  <div className="text-xs text-muted-foreground font-mono">
                                    Total On-Hand Stock: <strong className="text-foreground">{location.totalStockUnits.toLocaleString()} units</strong>
                                  </div>
                                  <div className="text-xs text-muted-foreground font-mono">
                                    Active Dispatches: <strong className="text-foreground">{location.activeOrdersCount} orders</strong>
                                  </div>
                                  <div className="text-[10px] text-muted-foreground font-mono pt-1">
                                    Created: {new Date(location.createdAt).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>

                              {/* Sublocations List */}
                              {location.sublocations && location.sublocations.length > 0 && (
                                <div className="p-3 bg-card border rounded-lg shadow-2xs space-y-2">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                    <Layers className="w-3 h-3" /> Sublocations & Bins
                                  </span>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                    {location.sublocations.map((sub) => (
                                      <div key={sub.id} className="p-2 border rounded bg-muted/20 flex flex-col justify-between">
                                        <span className="font-semibold text-xs truncate">{sub.name}</span>
                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1 font-mono">
                                          <Box className="w-2.5 h-2.5" /> {sub.binCount} bins
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <DataTablePagination
          pageIndex={pageIndex}
          pageSize={PAGE_SIZE}
          pageCount={pageCount}
          totalRecords={totalRecords}
          loading={isLoading}
          onPageChange={(nextIndex: number) => setPageIndex(nextIndex)}
        />
      </div>

      {/* View Location Details Dialog */}

      {/* Status Update Confirmation Dialog */}
      <Dialog open={!!activeAction} onOpenChange={() => setActiveAction(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">{activeAction?.title}</DialogTitle>
            <DialogDescription className="text-xs">
              {activeAction?.description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setActiveAction(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleStatusUpdate}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}