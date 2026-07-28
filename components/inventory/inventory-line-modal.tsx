"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Search, CheckCircle2, Circle, PackagePlus, CheckSquare, Square, ImageIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface LookupItem {
  inflowId: string;
  name: string;
  image: string | null;
  sku: string;
  trackSerials: boolean;
}

interface InventoryLineModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: LookupItem[];
  existingLines: Array<{ productId: string }>;
  onSave: (selectedProducts: Array<{ productId: string }>) => void;
}

export function InventoryLineModal({
  isOpen,
  onClose,
  products,
  existingLines,
  onSave,
}: InventoryLineModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  // Exclude products already added to the parent form
  const existingProductMap = useMemo(() => {
    const set = new Set<string>();
    existingLines.forEach((line) => {
      if (line.productId) set.add(line.productId);
    });
    return set;
  }, [existingLines]);

  // Filter products by search query
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase();

    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.inflowId.toLowerCase().includes(q)
    );
  }, [products, searchQuery]);

  // Products available for selection in the current filter
  const selectableFilteredProducts = useMemo(() => {
    return filteredProducts.filter((p) => !existingProductMap.has(p.inflowId));
  }, [filteredProducts, existingProductMap]);

  // Check if all available filtered products are currently selected
  const isAllSelectableSelected = useMemo(() => {
    if (selectableFilteredProducts.length === 0) return false;
    return selectableFilteredProducts.every((p) => selectedProductIds.includes(p.inflowId));
  }, [selectableFilteredProducts, selectedProductIds]);

  // Reset modal state on open
  useEffect(() => {
    if (isOpen) {
      setSelectedProductIds([]);
      setSearchQuery("");
    }
  }, [isOpen]);

  const handleToggleProduct = (id: string, isAlreadyAdded: boolean) => {
    if (isAlreadyAdded) return;
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (isAllSelectableSelected) {
      // Deselect all filtered products
      const idsToRemove = new Set(selectableFilteredProducts.map((p) => p.inflowId));
      setSelectedProductIds((prev) => prev.filter((id) => !idsToRemove.has(id)));
    } else {
      // Select all filtered products
      const idsToAdd = selectableFilteredProducts.map((p) => p.inflowId);
      setSelectedProductIds((prev) => Array.from(new Set([...prev, ...idsToAdd])));
    }
  };

  const handleCommit = () => {
    const payload = selectedProductIds.map((prodId) => ({
      productId: prodId,
    }));

    onSave(payload);
    onClose();
  };

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
            {selectedProductIds.length > 0 && (
              <Badge variant="default" className="text-[10px] h-5">
                {selectedProductIds.length} Selected
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Content Body */}
        <div className="p-4 space-y-3 flex-1 overflow-y-auto flex flex-col min-h-0">
          {/* Search Bar & Bulk Selection Controls */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search catalog by product name or SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>

            {selectableFilteredProducts.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleToggleSelectAll}
                className="h-9 text-xs gap-1.5 shrink-0"
              >
                {isAllSelectableSelected ? (
                  <>
                    <CheckSquare className="w-3.5 h-3.5 text-primary" />
                    Deselect All
                  </>
                ) : (
                  <>
                    <Square className="w-3.5 h-3.5 text-muted-foreground" />
                    Select All ({selectableFilteredProducts.length})
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Product Catalog List */}
          <div className="border rounded-xl flex flex-col flex-1 bg-card  max-h-300 overflow-y-auto ">
            <ScrollArea className="flex-1 divide-y">
              {filteredProducts.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground font-medium">
                  No products found matching your filter criteria.
                </div>
              ) : (
                filteredProducts.map((product) => {
                  const isAlreadyAdded = existingProductMap.has(product.inflowId);
                  const isChecked = selectedProductIds.includes(product.inflowId);

                  return (
                    <div
                      key={product.inflowId}
                      onClick={() => handleToggleProduct(product.inflowId, isAlreadyAdded)}
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
                          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
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
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t bg-muted/20 flex items-center justify-between shrink-0">
          <span className="text-xs text-muted-foreground pl-2">
            {selectedProductIds.length} product(s) marked
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} className="text-xs h-8">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCommit}
              disabled={selectedProductIds.length === 0}
              className="text-xs h-8 min-w-[140px]"
            >
              Add {selectedProductIds.length} Selected Item(s)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}