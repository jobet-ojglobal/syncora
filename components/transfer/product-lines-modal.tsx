import React, { useState, useEffect, useMemo } from "react";
import { ArrowRightLeft, Search, CheckCircle2, Circle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface ProductMatrixItem {
  product: {
    id: string;
    inflowId: string;
    sku: string;
    name: string;
    slug: string;
    thumbnail: string | null;
  };
  stocks: {
    source: {
      quantityAvailable: number;
      bins: Array<{ sublocationId: string; quantity: number }>;
    };
    target: {
      quantityAvailable: number;
      bins: Array<{ sublocationId: string; quantity: number }>;
    };
  };
}

export interface SublocationLookup {
  id: string;
  name: string;
  locationId: string;
}

export interface InlineConfig {
  productId: string;
  sourceSublocationId: string;
  targetSublocationId: string;
  quantity: number | "";
}

export interface ProductLineModalProps {
  isOpen: boolean;
  onClose: () => void;
  productMatrix: ProductMatrixItem[];
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
  productMatrix = [],
  sublocations = [],
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

  const departureSublocations = useMemo(
    () => sublocations.filter((s) => s.locationId === sourceLocationId),
    [sublocations, sourceLocationId]
  );

  const arrivalSublocations = useMemo(
    () => sublocations.filter((s) => s.locationId === targetLocationId),
    [sublocations, targetLocationId]
  );

  // Filter matrix based on mode (Edit vs Create) and search query
  const filteredMatrix = useMemo(() => {
    let result = productMatrix;

    if (editingLineIndex !== null && existingLines[editingLineIndex]) {
      const targetProductId = existingLines[editingLineIndex].productId;
      result = productMatrix.filter((item) => item.product.inflowId === targetProductId);
    } else {
      const activeLineProductIds = existingLines.map((line) => line.productId);
      result = productMatrix.filter((item) => !activeLineProductIds.includes(item.product.inflowId));
    }

    if (!searchQuery.trim()) return result;
    const lowerQuery = searchQuery.toLowerCase();
    return result.filter(
      (item) =>
        item.product.name.toLowerCase().includes(lowerQuery) ||
        item.product.inflowId.toLowerCase().includes(lowerQuery) ||
        item.product.sku?.toLowerCase().includes(lowerQuery)
    );
  }, [productMatrix, existingLines, editingLineIndex, searchQuery]);

  // Sync initial configs on modal open
  useEffect(() => {
    if (isOpen) {
      const initialConfigs: Record<string, InlineConfig> = {};

      productMatrix.forEach((item) => {
        initialConfigs[item.product.inflowId] = {
          productId: item.product.inflowId,
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
      setValidationError("");
    }
  }, [isOpen, editingLineIndex, existingLines, productMatrix]);

  const getSourceStockValue = (item: ProductMatrixItem, srcSubId: string) => {
    if (srcSubId) {
      return item.stocks.source.bins.find((b) => b.sublocationId === srcSubId)?.quantity || 0;
    }
    return item.stocks.source.quantityAvailable;
  };

  const getTargetStockValue = (item: ProductMatrixItem, tgtSubId: string) => {
    if (tgtSubId) {
      return item.stocks.target.bins.find((b) => b.sublocationId === tgtSubId)?.quantity || 0;
    }
    return item.stocks.target.quantityAvailable;
  };

  const handleToggleProduct = (id: string) => {
    if (editingLineIndex !== null) return;
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const updateInlineConfig = (prodId: string, updates: Partial<InlineConfig>) => {
    setRowConfigs((prev) => ({
      ...prev,
      [prodId]: { ...prev[prodId], ...updates },
    }));
  };

  const handleValidateAndCommit = () => {
    if (selectedProductIds.length === 0) {
      return setValidationError("Please select at least one product line.");
    }

    const payload: any[] = [];

    for (const prodId of selectedProductIds) {
      const config = rowConfigs[prodId];
      const qtyNum = Number(config?.quantity);

      if (!config || !qtyNum || qtyNum <= 0) {
        const prodName =
          productMatrix.find((item) => item.product.inflowId === prodId)?.product.name || prodId;
        return setValidationError(`Allocated quantity for "${prodName}" must be greater than zero.`);
      }

      payload.push({
        productId: prodId,
        sourceSublocationId: config.sourceSublocationId,
        targetSublocationId: config.targetSublocationId,
        quantity: qtyNum,
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
            {editingLineIndex !== null
              ? "Edit Line Location & Quantity"
              : "Batch Product Transfer Selection Matrix"}
          </DialogTitle>
        </DialogHeader>

        {validationError && (
          <div className="mx-4 mt-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg font-medium">
            {validationError}
          </div>
        )}

        <div className="p-4 space-y-4 flex-1 overflow-y-auto flex flex-col min-h-0">
          {editingLineIndex === null && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products by name, SKU, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>
          )}

          <div className="border rounded-xl flex flex-col flex-1 bg-card overflow-hidden min-h-[260px]">
            <div className="bg-muted/50 border-b text-[10px] font-bold uppercase tracking-wider text-muted-foreground p-3 grid grid-cols-12 gap-3 items-center shrink-0">
              <span className="col-span-3">Product Reference</span>
              <span className="col-span-4">Source Bin & Stock</span>
              <span className="col-span-4">Target Bin & Stock</span>
              <span className="col-span-1 text-right pr-1">Qty</span>
            </div>

            <ScrollArea className="flex-1 divide-y">
              {filteredMatrix.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground font-medium">
                  {editingLineIndex !== null
                    ? "Target item not found."
                    : "No available inventory items found at source site."}
                </div>
              ) : (
                filteredMatrix.map((item) => {
                  const { product } = item;
                  const isChecked = selectedProductIds.includes(product.inflowId);
                  const config = rowConfigs[product.inflowId] || {
                    sourceSublocationId: "",
                    targetSublocationId: "",
                    quantity: 1,
                  };

                  return (
                    <div
                      key={product.inflowId}
                      className={`p-3 text-xs grid grid-cols-12 gap-3 items-start transition-colors border-b last:border-0 ${
                        isChecked ? "bg-primary/5" : "hover:bg-muted/30"
                      }`}
                    >
                      {/* Product Track Info */}
                      <div
                        className={`col-span-3 flex items-start gap-2.5 min-w-0 pt-1 ${
                          editingLineIndex === null ? "cursor-pointer select-none" : ""
                        }`}
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
                          <span className="text-[10px] text-muted-foreground font-mono truncate mt-0.5">
                            {product.sku || product.inflowId}
                          </span>
                        </div>
                      </div>

                      {/* Source Area */}
                      <div className="col-span-4 space-y-1.5">
                        <select
                          disabled={!isChecked}
                          value={config.sourceSublocationId}
                          onChange={(e) =>
                            updateInlineConfig(product.inflowId, {
                              sourceSublocationId: e.target.value,
                            })
                          }
                          className="w-full text-xs h-8 rounded-md border border-input bg-background px-1 focus:outline-hidden disabled:opacity-40"
                        >
                          <option value="">Floor / Bulk Area</option>
                          {departureSublocations.map((sub) => (
                            <option key={sub.id} value={sub.id}>
                              {sub.name}
                            </option>
                          ))}
                        </select>

                        <div className="flex items-center gap-1.5 px-1 min-h-[14px]">
                          {isChecked ? (
                            <span className="text-[10px] font-mono text-amber-600 font-medium">
                              On-Hand:{" "}
                              <strong>
                                {getSourceStockValue(item, config.sourceSublocationId)}
                              </strong>{" "}
                              units
                            </span>
                          ) : (
                            <span className="text-[9px] text-muted-foreground/60 italic">
                              Select product to configure
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Target Area */}
                      <div className="col-span-4 space-y-1.5">
                        <select
                          disabled={!isChecked}
                          value={config.targetSublocationId}
                          onChange={(e) =>
                            updateInlineConfig(product.inflowId, {
                              targetSublocationId: e.target.value,
                            })
                          }
                          className="w-full text-xs h-8 rounded-md border border-input bg-background px-1 focus:outline-hidden disabled:opacity-40"
                        >
                          <option value="">Floor / Bulk Area</option>
                          {arrivalSublocations.map((sub) => {
                            const selfCollision =
                              sourceLocationId === targetLocationId &&
                              sub.id === config.sourceSublocationId;
                            return !selfCollision ? (
                              <option key={sub.id} value={sub.id}>
                                {sub.name}
                              </option>
                            ) : null;
                          })}
                        </select>

                        <div className="flex items-center gap-1.5 px-1 min-h-[14px]">
                          {isChecked ? (
                            <span className="text-[10px] font-mono text-blue-600 font-medium">
                              Current:{" "}
                              <strong>
                                {getTargetStockValue(item, config.targetSublocationId)}
                              </strong>{" "}
                              units
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* Quantity Input */}
                      <div className="col-span-1">
                        <Input
                          type="number"
                          step="any"
                          min="0.0001"
                          disabled={!isChecked}
                          value={config.quantity}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateInlineConfig(product.inflowId, {
                              quantity: val === "" ? "" : Number(val),
                            });
                          }}
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
          <Button size="sm" onClick={handleValidateAndCommit} className="text-xs h-8 min-w-[140px]">
            {editingLineIndex !== null
              ? "Save Changes"
              : `Add ${selectedProductIds.length} Selected Line(s)`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}