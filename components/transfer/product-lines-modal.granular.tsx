import React, { useState, useEffect, useMemo } from "react";
import { ArrowRightLeft, Search, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LookupItem {
  inflowId: string;
  name: string;
}

interface SublocationLookup {
  id: string;
  name: string;
  locationId: string;
}

interface StockState {
  locations: Array<{ locationId: string; quantityAvailable: number }>;
  bins: Array<{ sublocationId: string; locationId: string; quantity: number }>;
}

interface InlineConfig {
  productId: string;
  sourceSublocationId: string;
  targetSublocationId: string;
  quantity: number;
}

interface ProductLineModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: LookupItem[];
  sublocations: SublocationLookup[];
  sourceLocationId: string;
  targetLocationId: string;
  existingLines: any[]; 
  editingLineIndex: number | null;
  onSave: (data: any | any[]) => void;
}

export function ProductLineModal({
  isOpen,
  onClose,
  products,
  sublocations,
  sourceLocationId,
  targetLocationId,
  existingLines,
  editingLineIndex,
  onSave,
}: ProductLineModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [validationError, setValidationError] = useState("");
  const [rowConfigs, setRowConfigs] = useState<Record<string, InlineConfig>>({});

  const [stocksCache, setStocksCache] = useState<Record<string, StockState>>({});
  const [loadingStocks, setLoadingStocks] = useState<Record<string, boolean>>({});

  const departureSublocations = sublocations.filter(s => s.locationId === sourceLocationId);
  const arrivalSublocations = sublocations.filter(s => s.locationId === targetLocationId);

  // 1. Filter out existing items based on view mode context
  const filteredProducts = useMemo(() => {
    let result = products;

    if (editingLineIndex !== null && existingLines[editingLineIndex]) {
      // Edit Mode: Isolation strategy -> Only show the active single line entry item
      const targetProductId = existingLines[editingLineIndex].productId;
      result = products.filter(p => p.inflowId === targetProductId);
    } else {
      // Create Mode: Deduplication strategy -> Remove items that have already been allocated to lines
      const activeLineProductIds = existingLines.map(line => line.productId);
      result = products.filter(p => !activeLineProductIds.includes(p.inflowId));
    }

    // Apply standard search keyword constraints
    if (!searchQuery.trim()) return result;
    const lowerQuery = searchQuery.toLowerCase();
    return result.filter(p => 
      p.name.toLowerCase().includes(lowerQuery) || p.inflowId.toLowerCase().includes(lowerQuery)
    );
  }, [products, existingLines, editingLineIndex, searchQuery]);

  // 2. Setup initial configuration states on trigger
  useEffect(() => {
    if (isOpen) {
      const initialConfigs: Record<string, InlineConfig> = {};
      
      products.forEach(p => {
        initialConfigs[p.inflowId] = {
          productId: p.inflowId,
          sourceSublocationId: "",
          targetSublocationId: "",
          quantity: 1,
        };
      });

      if (editingLineIndex !== null && existingLines[editingLineIndex]) {
        const currentLine = existingLines[editingLineIndex];
        setSelectedProductIds([currentLine.productId]);
        
        initialConfigs[currentLine.productId] = {
          productId: currentLine.productId,
          sourceSublocationId: currentLine.sourceSublocationId || "",
          targetSublocationId: currentLine.targetSublocationId || "",
          quantity: Number(currentLine.quantity) || 1,
        };
      } else {
        setSelectedProductIds([]);
        setSearchQuery("");
      }

      setRowConfigs(initialConfigs);
      setStocksCache({});
      setLoadingStocks({});
      setValidationError("");
    }
  }, [isOpen, editingLineIndex, existingLines, products]);

  // 3. Real-time metric lookup triggers
  useEffect(() => {
    const tracksToFetch = selectedProductIds.filter(id => !stocksCache[id] && !loadingStocks[id]);
    
    tracksToFetch.forEach(async (id) => {
      setLoadingStocks(prev => ({ ...prev, [id]: true }));
      try {
        const url = `/api/admin/stocks?productId=${id}&sourceLocationId=${sourceLocationId}&targetLocationId=${targetLocationId}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setStocksCache(prev => ({ ...prev, [id]: data }));
        }
      } catch (err) {
        console.error("Failed downloading metrics:", err);
      } finally {
        setLoadingStocks(prev => ({ ...prev, [id]: false }));
      }
    });
  }, [selectedProductIds, sourceLocationId, targetLocationId, stocksCache, loadingStocks]);

  const getSourceStockValue = (prodId: string, srcSubId: string) => {
    const cache = stocksCache[prodId];
    if (!cache) return 0;
    if (srcSubId) {
      return cache.bins?.find(b => b.sublocationId === srcSubId)?.quantity || 0;
    }
    return cache.locations?.find(l => l.locationId === sourceLocationId)?.quantityAvailable || 0;
  };

  const getTargetStockValue = (prodId: string, tgtSubId: string) => {
    const cache = stocksCache[prodId];
    if (!cache) return 0;
    if (tgtSubId) {
      return cache.bins?.find(b => b.sublocationId === tgtSubId)?.quantity || 0;
    }
    return cache.locations?.find(l => l.locationId === targetLocationId)?.quantityAvailable || 0;
  };

  const handleToggleProduct = (id: string) => {
    if (editingLineIndex !== null) return; // Lock selections when adjusting structural row indices
    setSelectedProductIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const updateInlineConfig = (prodId: string, updates: Partial<InlineConfig>) => {
    setRowConfigs(prev => ({
      ...prev,
      [prodId]: { ...prev[prodId], ...updates }
    }));
  };

  const handleValidateAndCommit = () => {
    if (selectedProductIds.length === 0) {
      return setValidationError("Please confirm allocation row adjustments before clicking save.");
    }

    const payload: any[] = [];

    for (const prodId of selectedProductIds) {
      const config = rowConfigs[prodId];

      if (!config || config.quantity <= 0) {
        return setValidationError(`Quantities allocated to "${products.find(p => p.inflowId === prodId)?.name}" must exceed zero.`);
      }

      payload.push({
        productId: prodId,
        sourceSublocationId: config.sourceSublocationId,
        targetSublocationId: config.targetSublocationId,
        quantity: Number(config.quantity),
      });
    }

    setValidationError("");
    onSave(editingLineIndex !== null ? payload[0] : payload);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-5xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
        
        <DialogHeader className="p-4 border-b bg-muted/20">
          <DialogTitle className="text-sm font-semibold flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-primary" />
            {editingLineIndex !== null ? "Edit Consignment Line Location & Value" : "Batch Multi-Line Consignment Catalog Matrix"}
          </DialogTitle>
        </DialogHeader>

        {validationError && (
          <div className="mx-4 mt-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg font-medium">
            {validationError}
          </div>
        )}

        <div className="p-4 space-y-4 flex-1 overflow-y-auto flex flex-col min-h-0">
          
          {/* Hide search bar in edit mode since only one product is displayed */}
          {editingLineIndex === null && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search remaining inventory components available for transfer allocations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>
          )}

          <div className="border rounded-xl flex flex-col flex-1 bg-card overflow-hidden min-h-[260px]">
            <div className="bg-muted/50 border-b text-[10px] font-bold uppercase tracking-wider text-muted-foreground p-3 grid grid-cols-12 gap-3 items-center shrink-0">
              <span className="col-span-3">Product Reference Info</span>
              <span className="col-span-4">Source Bin Layout & Stock</span>
              <span className="col-span-4">Target Bin Layout & Stock</span>
              <span className="col-span-1 text-right pr-1">Qty</span>
            </div>

            <ScrollArea className="flex-1 divide-y">
              {filteredProducts.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground font-medium">
                  {editingLineIndex !== null ? "Error tracking edit element target reference indices." : "All catalog elements are already assigned to tracking rows."}
                </div>
              ) : (
                filteredProducts.map(product => {
                  const isChecked = selectedProductIds.includes(product.inflowId);
                  const config = rowConfigs[product.inflowId] || { sourceSublocationId: "", targetSublocationId: "", quantity: 1 };
                  const isLoading = loadingStocks[product.inflowId];

                  return (
                    <div
                      key={product.inflowId}
                      className={`p-3 text-xs grid grid-cols-12 gap-3 items-start transition-colors border-b last:border-0 ${
                        isChecked ? "bg-primary/5" : "hover:bg-muted/30"
                      }`}
                    >
                      {/* Product Tracking Column Info */}
                      <div 
                        className={`col-span-3 flex items-start gap-2.5 min-w-0 pt-1 ${editingLineIndex === null ? "cursor-pointer select-none" : ""}`}
                        onClick={() => handleToggleProduct(product.inflowId)}
                      >
                        <div className="shrink-0 mt-0.5">
                          {isChecked ? (
                            <CheckCircle2 className="w-4 h-4 text-primary fill-primary/10" />
                          ) : (
                            <Circle className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium text-foreground truncate">{product.name}</span>
                          <span className="text-[10px] text-muted-foreground font-mono truncate mt-0.5">{product.inflowId}</span>
                        </div>
                      </div>

                      {/* Source Location Sub-Stock Trackers */}
                      <div className="col-span-4 space-y-1.5">
                        <select
                          disabled={!isChecked}
                          value={config.sourceSublocationId}
                          onChange={(e) => updateInlineConfig(product.inflowId, { sourceSublocationId: e.target.value })}
                          className="w-full text-xs h-8 rounded-md border border-input bg-background px-1 focus:outline-hidden disabled:opacity-40"
                        >
                          <option value="">Floor / Bulk Area</option>
                          {departureSublocations.map(sub => <option key={sub.id} value={sub.id}>{sub.name}</option>)}
                        </select>
                        
                        <div className="flex items-center gap-1.5 px-1 min-h-[14px]">
                          {isLoading ? (
                            <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                          ) : isChecked ? (
                            <span className="text-[10px] font-mono text-amber-600 font-medium">
                              On-Hand: <strong>{getSourceStockValue(product.inflowId, config.sourceSublocationId)}</strong> units
                            </span>
                          ) : (
                            <span className="text-[9px] text-muted-foreground/60 italic">Check row details</span>
                          )}
                        </div>
                      </div>

                      {/* Target Location Sub-Stock Trackers */}
                      <div className="col-span-4 space-y-1.5">
                        <select
                          disabled={!isChecked}
                          value={config.targetSublocationId}
                          onChange={(e) => updateInlineConfig(product.inflowId, { targetSublocationId: e.target.value })}
                          className="w-full text-xs h-8 rounded-md border border-input bg-background px-1 focus:outline-hidden disabled:opacity-40"
                        >
                          <option value="">Floor / Bulk Area</option>
                          {arrivalSublocations.map(sub => {
                            const selfCollision = sourceLocationId === targetLocationId && sub.id === config.sourceSublocationId;
                            return !selfCollision ? <option key={sub.id} value={sub.id}>{sub.name}</option> : null;
                          })}
                        </select>

                        <div className="flex items-center gap-1.5 px-1 min-h-[14px]">
                          {isLoading ? (
                            <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                          ) : isChecked ? (
                            <span className="text-[10px] font-mono text-blue-600 font-medium">
                              Current: <strong>{getTargetStockValue(product.inflowId, config.targetSublocationId)}</strong> units
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* Qty Value Counter */}
                      <div className="col-span-1">
                        <Input
                          type="number"
                          step="0.0001"
                          disabled={!isChecked}
                          value={config.quantity}
                          onChange={(e) => updateInlineConfig(product.inflowId, { quantity: Number(e.target.value) })}
                          className="text-xs h-8 font-mono text-right p-1"
                          placeholder="1"
                        />
                      </div>

                    </div>
                  );
                })
              )}
            </ScrollArea>
          </div>

        </div>

        <div className="p-3 border-t bg-muted/20 flex items-center justify-end gap-2 shrink-0">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs h-8">
            Cancel
          </Button>
          <Button 
            size="sm" 
            onClick={handleValidateAndCommit} 
            className="text-xs h-8 min-w-[140px]"
          >
            {editingLineIndex !== null ? "Save Changes" : `Commit ${selectedProductIds.length} Added Track(s)`}
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}