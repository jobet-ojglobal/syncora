"use client";

import React from "react";
import { Search, X, RotateCcw, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface LocationOption {
  inflowId: string;
  name: string;
}

interface TransferFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  sourceLocationId: string;
  onSourceLocationChange: (value: string) => void;
  targetLocationId: string;
  onTargetLocationChange: (value: string) => void;
  locations: LocationOption[];
  onResetFilters: () => void;
}

const STATUS_OPTIONS = [
  { value: "ALL", label: "All Statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "PENDING", label: "Pending" },
  { value: "IN_TRANSIT", label: "In Transit" },
  { value: "RECEIVED", label: "Received" },
  { value: "PARTIALLY_RECEIVED", label: "Partially Received" },
  { value: "CANCELLED", label: "Cancelled" },
];

export function TransferFilters({
  searchQuery,
  onSearchChange,
  status,
  onStatusChange,
  sourceLocationId,
  onSourceLocationChange,
  targetLocationId,
  onTargetLocationChange,
  locations,
  onResetFilters,
}: TransferFiltersProps) {
  // Check if any filter differs from default state
  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    status !== "ALL" ||
    sourceLocationId !== "ALL" ||
    targetLocationId !== "ALL";

  const activeFilterCount = [
    searchQuery.trim() !== "",
    status !== "ALL",
    sourceLocationId !== "ALL",
    targetLocationId !== "ALL",
  ].filter(Boolean).length;

  const getLocationName = (id: string) =>
    locations.find((loc) => loc.inflowId === id)?.name || id;

  return (
    <div className="space-y-3 bg-card border rounded-xl p-3.5 shadow-2xs">
      {/* Top Filter Controls Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search transfer # or notes..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 pr-8 h-9 text-xs"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        

        {/* Status Dropdown */}
        <Select value={status} onValueChange={onStatusChange}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="Select Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((item) => (
              <SelectItem key={item.value} value={item.value} className="text-xs">
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Source Location Dropdown */}
        <Select value={sourceLocationId} onValueChange={onSourceLocationChange}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="Source Location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL" className="text-xs">
              All Source Locations
            </SelectItem>
            {locations.map((loc) => (
              <SelectItem key={loc.inflowId} value={loc.inflowId} className="text-xs">
                {loc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Target Location Dropdown */}
        <Select value={targetLocationId} onValueChange={onTargetLocationChange}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="Target Location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL" className="text-xs">
              All Target Locations
            </SelectItem>
            {locations.map((loc) => (
              <SelectItem key={loc.inflowId} value={loc.inflowId} className="text-xs">
                {loc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Active Filter Pills Bar (Shows only when filters are applied) */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-muted-foreground text-[11px] font-medium flex items-center gap-1 mr-1">
              <SlidersHorizontal className="w-3 h-3" />
              Active ({activeFilterCount}):
            </span>

            {searchQuery && (
              <Badge variant="secondary" className="gap-1 text-[11px] font-normal h-6">
                Query: &quot;{searchQuery}&quot;
                <X
                  className="w-3 h-3 cursor-pointer text-muted-foreground hover:text-foreground"
                  onClick={() => onSearchChange("")}
                />
              </Badge>
            )}

            {status !== "ALL" && (
              <Badge variant="secondary" className="gap-1 text-[11px] font-normal h-6">
                Status: {status.replace(/_/g, " ")}
                <X
                  className="w-3 h-3 cursor-pointer text-muted-foreground hover:text-foreground"
                  onClick={() => onStatusChange("ALL")}
                />
              </Badge>
            )}

            {sourceLocationId !== "ALL" && (
              <Badge variant="secondary" className="gap-1 text-[11px] font-normal h-6">
                From: {getLocationName(sourceLocationId)}
                <X
                  className="w-3 h-3 cursor-pointer text-muted-foreground hover:text-foreground"
                  onClick={() => onSourceLocationChange("ALL")}
                />
              </Badge>
            )}

            {targetLocationId !== "ALL" && (
              <Badge variant="secondary" className="gap-1 text-[11px] font-normal h-6">
                To: {getLocationName(targetLocationId)}
                <X
                  className="w-3 h-3 cursor-pointer text-muted-foreground hover:text-foreground"
                  onClick={() => onTargetLocationChange("ALL")}
                />
              </Badge>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onResetFilters}
            className="h-6 text-[11px] text-muted-foreground hover:text-foreground gap-1 px-2"
          >
            <RotateCcw className="w-3 h-3" /> Reset all
          </Button>
        </div>
      )}
    </div>
  );
}