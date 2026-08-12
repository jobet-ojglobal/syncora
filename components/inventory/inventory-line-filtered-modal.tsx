"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  CheckCircle2,
  Circle,
  PackagePlus,
  ImageIcon,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";

export interface LookupItem {
  inflowId: string;
  name: string;
  image: string | null;
  sku: string;
  trackSerials: boolean;
}

interface InventoryLineModalProps {
  isOpen: boolean;
  onClose: () => void;
  locationId: string;
  existingLines: Array<{ productId: string }>;
  onSave: (selectedProducts: LookupItem[]) => void;
}

export function InventoryLineModal({
  isOpen,
  onClose,
  locationId,
  existingLines,
  onSave,
}: InventoryLineModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [products, setProducts] = useState<LookupItem[]>([]);
  const [selectedProductsMap, setSelectedProductsMap] = useState<Map<string, LookupItem>>(
    new Map()
  );
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const existingProductSet = React.useMemo(() => {
    return new Set(existingLines.map((l) => l.productId).filter(Boolean));
  }, [existingLines]);

  // Debounce search query changes
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch paginated products from API
  const fetchProducts = useCallback(async () => {
    if (!locationId || !isOpen) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search: debouncedSearch,
        page: page.toString(),
        limit: "15",
      });
      const res = await fetch(`/api/locations/${locationId}/filtered-products?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalCount(data.pagination?.total || 0);
      }
    } catch (err) {
      console.error("Failed to load products:", err);
    } finally {
      setLoading(false);
    }
  }, [locationId, isOpen, debouncedSearch, page]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setSelectedProductsMap(new Map());
      setSearchQuery("");
      setDebouncedSearch("");
      setPage(1);
    }
  }, [isOpen]);

  const handleToggleProduct = (product: LookupItem, isAlreadyAdded: boolean) => {
    if (isAlreadyAdded) return;
    setSelectedProductsMap((prev) => {
      const next = new Map(prev);
      if (next.has(product.inflowId)) {
        next.delete(product.inflowId);
      } else {
        next.set(product.inflowId, product);
      }
      return next;
    });
  };

  const handleCommit = () => {
    onSave(Array.from(selectedProductsMap.values()));
    onClose();
  };

  const selectedCount = selectedProductsMap.size;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-4 border-b bg-muted/20">
          <DialogTitle className="text-sm font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PackagePlus className="w-4 h-4 text-primary" />
              <span>Select Products for Inventory</span>
            </div>
            {selectedCount > 0 && (
              <Badge variant="default" className="text-[10px] h-5">
                {selectedCount} Selected
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Search & Controls */}
        <div className="p-4 space-y-3 flex-1 overflow-y-auto flex flex-col min-h-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search catalog by product name or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs h-9"
            />
          </div>

          {/* Product Catalog List */}
           <div className="border rounded-xl flex flex-col flex-1 bg-card  max-h-300 overflow-y-auto ">
            {loading && (
              <div className="absolute inset-0 bg-background/50 backdrop-blur-xs flex items-center justify-center z-10">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            )}

            <ScrollArea className="flex-1 divide-y">
              {products.length === 0 && !loading ? (
                <div className="p-8 text-center text-xs text-muted-foreground font-medium">
                  No products found matching your search.
                </div>
              ) : (
                products.map((product) => {
                  const isAlreadyAdded = existingProductSet.has(product.inflowId);
                  const isChecked = selectedProductsMap.has(product.inflowId);

                  return (
                    <div
                      key={product.inflowId}
                      onClick={() => handleToggleProduct(product, isAlreadyAdded)}
                      className={`p-3 text-xs flex items-center gap-3 transition-colors border-b last:border-0 ${
                        isAlreadyAdded
                          ? "bg-muted/40 opacity-60 cursor-not-allowed"
                          : isChecked
                          ? "bg-primary/5 cursor-pointer"
                          : "hover:bg-muted/30 cursor-pointer"
                      }`}
                    >
                      <div className="shrink-0">
                        {isChecked ? (
                          <CheckCircle2 className="w-4 h-4 text-primary fill-primary/10" />
                        ) : (
                          <Circle className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>

                      <div className="w-10 h-10 bg-muted border rounded-lg overflow-hidden flex items-center justify-center shrink-0 relative">
                        {product.image ? (
                          <Image
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover"
                            width={40}
                            height={40}
                          />
                        ) : (
                          <ImageIcon className="w-4 h-4 text-muted-foreground/50" />
                        )}
                      </div>

                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground truncate">
                            {product.name}
                          </span>
                          {isAlreadyAdded && (
                            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">
                              Already Added
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground font-mono">
                            SKU: {product.sku}
                          </span>
                          {product.trackSerials && (
                            <Badge className="bg-indigo-50 text-indigo-600 hover:bg-indigo-50 border border-indigo-200 text-[8px] py-0 h-4 px-1">
                              SERIALS
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </ScrollArea>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-2 border-t bg-muted/10 flex items-center justify-between text-xs">
                <span className="text-[11px] text-muted-foreground">
                  Showing page {page} of {totalPages} ({totalCount} total)
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={page <= 1 || loading}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={page >= totalPages || loading}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t bg-muted/20 flex items-center justify-between shrink-0">
          <span className="text-xs text-muted-foreground pl-2">
            {selectedCount} item(s) selected
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} className="text-xs h-8">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCommit}
              disabled={selectedCount === 0}
              className="text-xs h-8 min-w-[140px]"
            >
              Add {selectedCount} Selected
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}