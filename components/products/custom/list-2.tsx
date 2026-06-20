// app/admin/products/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { 
  Plus, Search, ImageIcon, Barcode, CalendarClock, ShieldCheck, 
  Kanban, Power, PowerOff, Edit3, Loader2, ArrowUpDown, ChevronLeft, ChevronRight 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { DeleteButton } from "@/components/shared/delete-button";

interface ProductCatalogRow {
  id: string;
  inflowId: string;
  sku: string;
  name: string;
  slug: string;
  itemType: string;
  isActive: boolean;
  trackExpiry: boolean;
  trackLots: boolean;
  trackSerials: boolean;
  brandName: string;
  categoryName: string; 
  groupName: string | null;
  thumbnail: string | null;
  barcodesCount: number;
  primaryBarcode: string | null;
  purchasingUomText: string;
  salesUomText: string;
  createdAt: string
}

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function ProductsListPage() {
  const [products, setProducts] = useState<ProductCatalogRow[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  // Sorting control definitions
  const [sortBy, setSortBy] = useState("updatedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Simple client-side debounce logic
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setMeta(prev => ({ ...prev, page: 1 })); // Reset to page 1 on fresh search parameters
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        search: debouncedSearch,
        page: meta.page.toString(),
        limit: meta.limit.toString(),
        sortBy,
        sortOrder,
      });

      const res = await fetch(`/api/admin/products/filter?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products);
        setMeta(data.meta);
      }
    } catch (err) {
      toast.error("Pipeline Failure", { description: "Failed loading product matrix indices data state." });
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, meta.page, meta.limit, sortBy, sortOrder]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    setMeta(prev => ({ ...prev, page: 1 }));
  };

  const handleToggleActiveState = async (inflowId: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    setActionId(inflowId);

    const toggleActionPromise = fetch("/api/admin/products/toggle", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inflowId, isActive: nextStatus }),
    }).then(async (response) => {
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update status.");
      }
      setProducts((prev) =>
        prev.map((p) => (p.inflowId === inflowId ? { ...p, isActive: nextStatus } : p))
      );
      return nextStatus;
    });

    toast.promise(toggleActionPromise, {
      loading: "Synchronizing system status changes...",
      success: (status) => `Product status is now ${status ? "Active" : "Archived"}.`,
      error: (err) => err.message || "State mutation exception occurred.",
      finally: () => setActionId(null),
    });
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      
      {/* Header Segments */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Product Catalog Matrix</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage global trade line SKUs, nested barcode structures, multi-tier transactional UOM variables, and active tracking variables.
          </p>
        </div>
        <Button asChild size="sm" className="gap-1.5 shrink-0">
          <Link href="/dashboard/products/create">
            <Plus className="w-4 h-4" /> Register New Product
          </Link>
        </Button>
      </div>

      {/* Query Search Toolbar Block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/70" />
          <Input
            placeholder="Search SKU, name, brand, or barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        <div className="text-xs text-muted-foreground font-medium bg-muted/40 border px-3 py-1.5 rounded-lg flex items-center gap-2">
          <Kanban className="w-3.5 h-3.5 text-primary" />
          Matches Found: <span className="font-bold text-foreground">{meta.total}</span>
        </div>
      </div>

      {/* Table Views Grid Block Component */}
      {isLoading && products.length === 0 ? (
        <div className="p-16 text-center text-xs text-muted-foreground bg-card border rounded-xl flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" /> Loading master product catalog items...
        </div>
      ) : products.length === 0 ? (
        <div className="p-16 text-center text-xs text-muted-foreground border-dashed border-2 rounded-xl bg-card">
          No catalog items located matching the parameters.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="border rounded-xl bg-card shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted/40 border-b text-[10px] font-bold uppercase tracking-wider text-muted-foreground select-none">
                    <th className="p-4 w-[50px] text-center">Status</th>
                    <th className="p-4 cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort("name")}>
                      <span className="flex items-center gap-1">SKU Product Variant Spec <ArrowUpDown className="h-3 w-3" /></span>
                    </th>
                    <th className="p-4 w-[140px] cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort("categoryName")}>
                      <span className="flex items-center gap-1">Department <ArrowUpDown className="h-3 w-3" /></span>
                    </th>
                    <th className="p-4 cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort("brandName")}>
                      <span className="flex items-center gap-1">Brand / Group <ArrowUpDown className="h-3 w-3" /></span>
                    </th>
                    <th className="p-4">Primary Code Reference</th>
                    <th className="p-4">Purchasing UOM</th>
                    <th className="p-4">Sales UOM</th>
                    <th className="p-4">Traceability Rules</th>
                    <th className="p-4 text-right w-[100px]">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y text-xs transition-opacity duration-200 ${isLoading ? "opacity-50 pointer-events-none" : ""}`}>
                  {products.map((product) => {
                    const isThisRowLoading = actionId === product.inflowId;
                    return (
                      <tr key={product.id} className={`hover:bg-muted/10 transition-colors ${!product.isActive ? "opacity-65 bg-muted/5" : ""}`}>
                        
                        <td className="p-4 text-center">
                          <button
                            type="button"
                            disabled={isThisRowLoading}
                            onClick={() => handleToggleActiveState(product.inflowId, product.isActive)}
                            className={`p-1.5 rounded-md border transition-all disabled:opacity-50 ${
                              product.isActive
                                ? "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400"
                                : "bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/20 dark:text-amber-400"
                            }`}
                          >
                            {isThisRowLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : product.isActive ? <Power className="w-3.5 h-3.5" /> : <PowerOff className="w-3.5 h-3.5" />}
                          </button>
                        </td>

                        <td className="p-4 max-w-[280px]">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-muted border rounded-lg overflow-hidden flex items-center justify-center shrink-0 relative">
                              {product.thumbnail ? (
                                <img src={product.thumbnail} alt={product.name} className="w-full h-full object-cover" />
                              ) : (
                                <ImageIcon className="w-4 h-4 text-muted-foreground/50" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-foreground block truncate" title={product.name}>{product.name}</span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded-sm font-semibold text-muted-foreground tracking-tight">{product.sku}</span>
                                <Badge variant="outline" className="text-[9px] h-4 px-1 py-0 uppercase font-normal">{product.itemType}</Badge>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="p-4 text-muted-foreground">
                          <Badge variant="outline" className="bg-background text-xs font-normal max-w-[140px] truncate shadow-2xs">{product.categoryName}</Badge>
                        </td>

                        <td className="p-4">
                          <span className="block font-medium text-foreground truncate max-w-[150px]">{product.brandName}</span>
                          {product.groupName && <span className="block text-[10px] text-muted-foreground truncate max-w-[150px]">Col: {product.groupName}</span>}
                        </td>

                        <td className="p-4 font-mono text-muted-foreground">
                          {product.primaryBarcode ? (
                            <div className="flex items-center gap-1">
                              <Barcode className="w-3.5 h-3.5 text-muted-foreground/60" />
                              <span className="text-[11px] font-medium text-foreground">{product.primaryBarcode}</span>
                              {product.barcodesCount > 1 && (
                                <span className="text-[9px] bg-blue-50 text-blue-600 border border-blue-100 px-1 rounded-sm">+{product.barcodesCount - 1}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground/40 italic text-[11px]">No GTIN mapped</span>
                          )}
                        </td>

                        <td className="p-4 text-muted-foreground font-mono text-[11px]">{product.purchasingUomText}</td>
                        <td className="p-4 text-muted-foreground font-mono text-[11px]">{product.salesUomText}</td>

                        <td className="p-4">
                          <div className="flex flex-wrap gap-1 max-w-[150px]">
                            {product.trackLots && <Badge className="bg-purple-50 text-purple-600 border-purple-200 text-[9px] h-4 px-1">LOTS</Badge>}
                            {product.trackSerials && <Badge className="bg-indigo-50 text-indigo-600 border-indigo-200 text-[9px] h-4 px-1">SERIALS</Badge>}
                            {product.trackExpiry && <Badge className="bg-amber-50 text-amber-600 border-amber-200 text-[9px] h-4 px-1 gap-0.5"><CalendarClock className="w-2.5 h-2.5" /> EXPIRY</Badge>}
                            {!product.trackLots && !product.trackSerials && !product.trackExpiry && (
                              <span className="text-[10px] text-muted-foreground/50 flex items-center gap-1 italic"><ShieldCheck className="w-3 h-3 text-emerald-500" /> Standard</span>
                            )}
                          </div>
                        </td>

                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted" title={`Modify ${product.name}`}>
                              <Link href={`/dashboard/products/${product.id}/edit`}><Edit3 className="w-3.5 h-3.5" /></Link>
                            </Button>
                            <DeleteButton itemId={product.id} itemName={product.name} endpointUrl={`/api/admin/products/${product.id}`} onSuccess={fetchProducts} variant="icon" />
                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Navigation Footer Panel Controls */}
          <div className="flex items-center justify-between border px-4 py-3 bg-card rounded-xl shadow-xs text-xs">
            <span className="text-muted-foreground font-medium">
              Showing page <strong className="text-foreground">{meta.page}</strong> of <strong className="text-foreground">{meta.totalPages}</strong> ({meta.total} cataloged entries)
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setMeta(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={meta.page <= 1 || isLoading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setMeta(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={meta.page >= meta.totalPages || isLoading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}