"use client";

import React, { useState, useEffect } from "react";
import useSWR from "swr";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  Search, Trash2, RefreshCw, AlertTriangle, ChevronLeft, ChevronRight, Loader2 
} from "lucide-react";

interface MappedItemsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  locationId: string;
  mappingKey: string;
  title: string;
  category: string;
  totalCount: number;
  onMappingsUpdated?: () => void;
}

interface MappedRecord {
  id: string;
  mappedEntityId: string;
  name: string;
  codeOrSku?: string;
  localId: number | string;
  createdAt: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function MappedItemsDialog({
  isOpen,
  onClose,
  locationId,
  mappingKey,
  title,
  category,
  onMappingsUpdated,
}: MappedItemsDialogProps) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isUnmapping, setIsUnmapping] = useState(false);
  const [showConfirmUnmapAll, setShowConfirmUnmapAll] = useState(false);

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Construct API endpoint for server-side pagination & filtering
  const endpoint = `/api/admin/locations/${locationId}/mappings/${mappingKey}?search=${encodeURIComponent(
    debouncedSearch
  )}&page=${page}&limit=${pageSize}`;

  const { data, isLoading, mutate } = useSWR(isOpen ? endpoint : null, fetcher);

  const records: MappedRecord[] = data?.records || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 };

  const handleSelectAllOnPage = (checked: boolean) => {
    if (checked) {
      const pageIds = records.map((r) => r.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    } else {
      const pageIds = new Set(records.map((r) => r.id));
      setSelectedIds((prev) => prev.filter((id) => !pageIds.has(id)));
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  const handleUnmapSelected = async () => {
    if (selectedIds.length === 0) return;
    setIsUnmapping(true);
    try {
      const res = await fetch(`/api/admin/locations/${locationId}/mappings/${mappingKey}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });

      if (!res.ok) throw new Error("Failed to unmap selected items");

      setSelectedIds([]);
      await mutate();
      if (onMappingsUpdated) onMappingsUpdated();
    } catch (err) {
      console.error(err);
    } finally {
      setIsUnmapping(false);
    }
  };

  const handleUnmapAll = async () => {
    setIsUnmapping(true);
    try {
      const res = await fetch(`/api/admin/locations/${locationId}/mappings/${mappingKey}?all=true`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to unmap all items");

      setSelectedIds([]);
      setShowConfirmUnmapAll(false);
      await mutate();
      if (onMappingsUpdated) onMappingsUpdated();
    } catch (err) {
      console.error(err);
    } finally {
      setIsUnmapping(false);
    }
  };

  const isAllPageSelected = records.length > 0 && records.every((r) => selectedIds.includes(r.id));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-6 gap-4">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">
              {category}
            </Badge>
          </div>
          <DialogTitle className="text-lg font-bold tracking-tight mt-1">
            {title}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Manage mapped relationships bound to location <span className="font-semibold">{locationId}</span>.
          </DialogDescription>
        </DialogHeader>

        {/* Search & Actions Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, code, or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {selectedIds.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleUnmapSelected}
                disabled={isUnmapping}
                className="h-8 text-xs gap-1.5"
              >
                {isUnmapping ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Unmap Selected ({selectedIds.length})
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConfirmUnmapAll(true)}
              disabled={isUnmapping || pagination.total === 0}
              className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 gap-1.5"
            >
              Unmap All
            </Button>
          </div>
        </div>

        {/* Confirm Unmap All Alert */}
        {showConfirmUnmapAll && (
          <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 rounded-lg flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Are you sure you want to unmap <strong>all {pagination.total} records</strong>? This action cannot be undone.</span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="xs" variant="ghost" onClick={() => setShowConfirmUnmapAll(false)}>Cancel</Button>
              <Button size="xs" variant="destructive" onClick={handleUnmapAll} disabled={isUnmapping}>
                {isUnmapping ? <Loader2 className="h-3 w-3 animate-spin" /> : "Confirm Unmap All"}
              </Button>
            </div>
          </div>
        )}

        {/* Table Content */}
        <div className="border rounded-lg overflow-y-auto max-h-[380px] text-xs">
          <table className="w-full text-left border-collapse">
            <thead className="bg-muted/50 sticky top-0 border-b z-10">
              <tr>
                <th className="p-3 w-10 text-center">
                  <Checkbox
                    checked={isAllPageSelected}
                    onCheckedChange={(checked) => handleSelectAllOnPage(!!checked)}
                  />
                </th>
                <th className="p-3 font-semibold text-muted-foreground">Mapped Item</th>
                <th className="p-3 font-semibold text-muted-foreground">Entity / ID</th>
                <th className="p-3 font-semibold text-muted-foreground">Local Flat ID</th>
                <th className="p-3 font-semibold text-muted-foreground">Mapped On</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                    Fetching mapped records...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    No mapped records found for this criteria.
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id} className="hover:bg-muted/30">
                    <td className="p-3 text-center">
                      <Checkbox
                        checked={selectedIds.includes(record.id)}
                        onCheckedChange={(checked) => handleSelectOne(record.id, !!checked)}
                      />
                    </td>
                    <td className="p-3 font-medium text-foreground">{record.name || "N/A"}</td>
                    <td className="p-3 font-mono text-[11px] text-muted-foreground">
                      {record.mappedEntityId || record.codeOrSku || "-"}
                    </td>
                    <td className="p-3 font-mono text-[11px]">
                      <Badge variant="secondary" className="font-mono text-[10px]">
                        #{record.localId}
                      </Badge>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {record.createdAt ? new Date(record.createdAt).toLocaleDateString() : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination */}
        <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
          <span>
            Showing <strong>{records.length}</strong> of <strong>{pagination.total}</strong> records
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isLoading}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span>
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages || isLoading}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}