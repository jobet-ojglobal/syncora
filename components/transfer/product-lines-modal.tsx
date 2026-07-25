"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ArrowRightLeft, Search, CheckCircle2, Circle, AlertCircle } from "lucide-react";
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

export interface SourceAllocation {
  sublocationId: string; // "" represents Floor / Bulk Area
  quantity: number;
}

export interface InlineConfig {
  productId: string;
  sourceAllocations: SourceAllocation[];
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
          sourceAllocations: [{ sublocationId: "", quantity: 1 }],
          targetSublocationId: "",
          quantity: 1,
        };
      });

      if (editingLineIndex !== null && existingLines[editingLineIndex]) {
        const currentLine = existingLines[editingLineIndex];
        setSelectedProductIds([currentLine.productId]);

        const allocations: SourceAllocation[] = Array.isArray(currentLine.sourceAllocations)
          ? currentLine.sourceAllocations
          : [{ sublocationId: currentLine.sourceSublocationId || "", quantity: Number(currentLine.quantity) || 1 }];

        initialConfigs[currentLine.productId] = {
          productId: currentLine.productId,
          sourceAllocations: allocations,
          targetSublocationId: currentLine.targetSublocationId || "",
          quantity: Number(currentLine.quantity) || 1,
        };
      } else {
        setSelectedProductIds([]);
        if (searchQuery !== "") setSearchQuery("");
      }

      // hydrate existing lines
      existingLines.forEach((line) => {
        initialConfigs[line.productId] = {
          productId: line.productId,
          sourceAllocations:
            line.sourceAllocations ??
            [
              {
                sublocationId: line.sourceSublocationId ?? "",
                quantity: Number(line.quantity),
              },
            ],
          targetSublocationId: line.targetSublocationId ?? "",
          quantity: Number(line.quantity),
        };
      });

      setRowConfigs(initialConfigs);
      setValidationError("");
    }
  }, [isOpen, editingLineIndex, existingLines, productMatrix]);

  // Auto-allocate bins when transfer quantity or initial source bin changes
  const allocateStockFromSources = (
    item: ProductMatrixItem,
    targetQty: number,
    preferredPrimarySubId?: string
  ): SourceAllocation[] => {
    if (targetQty <= 0) return [];

    const availableBins = item.stocks.source.bins.filter((b) => b.quantity > 0);
    const allocations: SourceAllocation[] = [];
    let remaining = targetQty;

    // 1. Check primary preferred sublocation
    if (preferredPrimarySubId !== undefined) {
      if (preferredPrimarySubId === "") {
        const bulkQty = item.stocks.source.quantityAvailable;
        if (bulkQty > 0) {
          const taken = Math.min(bulkQty, remaining);
          allocations.push({ sublocationId: "", quantity: taken });
          remaining -= taken;
        }
      } else {
        const primaryBin = availableBins.find((b) => b.sublocationId === preferredPrimarySubId);
        if (primaryBin) {
          const taken = Math.min(primaryBin.quantity, remaining);
          allocations.push({ sublocationId: primaryBin.sublocationId, quantity: taken });
          remaining -= taken;
        }
      }
    }

    // 2. Auto-fill remaining needed quantity from other available bins
    if (remaining > 0) {
      for (const bin of availableBins) {
        if (allocations.some((a) => a.sublocationId === bin.sublocationId)) continue;

        const taken = Math.min(bin.quantity, remaining);
        if (taken > 0) {
          allocations.push({ sublocationId: bin.sublocationId, quantity: taken });
          remaining -= taken;
        }
        if (remaining <= 0) break;
      }
    }

    // 3. Fallback to Floor / Bulk if bins didn't cover it and Bulk hasn't been added
    if (remaining > 0 && !allocations.some((a) => a.sublocationId === "")) {
      const bulkQty = item.stocks.source.quantityAvailable;
      if (bulkQty > 0) {
        const taken = Math.min(bulkQty, remaining);
        allocations.push({ sublocationId: "", quantity: taken });
        remaining -= taken;
      }
    }

    return allocations;
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

  const handleQuantityChange = (item: ProductMatrixItem, rawVal: string) => {
    const qty = rawVal === "" ? "" : Number(rawVal);
    const numQty = Number(qty) || 0;
    const currentPrimary = rowConfigs[item.product.inflowId]?.sourceAllocations[0]?.sublocationId ?? "";

    const newAllocations = allocateStockFromSources(item, numQty, currentPrimary);

    setRowConfigs((prev) => ({
      ...prev,
      [item.product.inflowId]: {
        ...prev[item.product.inflowId],
        quantity: qty,
        sourceAllocations: newAllocations.length > 0 ? newAllocations : [{ sublocationId: currentPrimary, quantity: numQty }],
      },
    }));
  };

  const handlePrimarySourceChange = (item: ProductMatrixItem, newSublocationId: string) => {
    const currentQty = Number(rowConfigs[item.product.inflowId]?.quantity) || 1;
    const newAllocations = allocateStockFromSources(item, currentQty, newSublocationId);

    setRowConfigs((prev) => ({
      ...prev,
      [item.product.inflowId]: {
        ...prev[item.product.inflowId],
        sourceAllocations: newAllocations.length > 0 ? newAllocations : [{ sublocationId: newSublocationId, quantity: currentQty }],
      },
    }));
  };

  const handleValidateAndCommit = () => {
    if (selectedProductIds.length === 0) {
      return setValidationError("Please select at least one product line.");
    }

    const payload: any[] = [];

    for (const prodId of selectedProductIds) {
      const item = productMatrix.find((m) => m.product.inflowId === prodId);
      const config = rowConfigs[prodId];
      const qtyNum = Number(config?.quantity);
      const prodName = item?.product.name || prodId;

      if (!config || !qtyNum || qtyNum <= 0) {
        return setValidationError(`Allocated quantity for "${prodName}" must be greater than zero.`);
      }

      const totalAvailableStock = item?.stocks.source.quantityAvailable || 0;
      if (qtyNum > totalAvailableStock) {
        return setValidationError(
          `Requested quantity (${qtyNum}) exceeds available stock (${totalAvailableStock}) for "${prodName}".`
        );
      }

      // Capture the existing row ID if in edit mode so React Hook Form doesn't lose track of it
      const existingRow =
        editingLineIndex !== null && existingLines[editingLineIndex]
          ? existingLines[editingLineIndex]
          : null;

      payload.push({
        ...(existingRow ? { id: existingRow.id } : {}),
        productId: prodId,
        sourceSublocationId: config.sourceAllocations[0]?.sublocationId || "",
        sourceAllocations: config.sourceAllocations,
        targetSublocationId: config.targetSublocationId || "",
        quantity: qtyNum,
      });
    }

    setValidationError("");

    // CRITICAL FIX: Emit single object on edit, full array on create
    if (editingLineIndex !== null) {
      onSave(payload[0]);
    } else {
      onSave(payload);
    }
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
          <div className="mx-4 mt-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{validationError}</span>
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
              <span className="col-span-4">Source Bin & Stock Allocation</span>
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
                    sourceAllocations: [{ sublocationId: "", quantity: 1 }],
                    targetSublocationId: "",
                    quantity: 1,
                  };

                  const primarySourceSubId = config.sourceAllocations[0]?.sublocationId ?? "";
                  const totalAvailableSource = item.stocks.source.quantityAvailable;
                  const isOutOFStock = totalAvailableSource <= 0;

                  return (
                    <div
                      key={product.inflowId}
                      className={`p-3 text-xs grid grid-cols-12 gap-3 items-start transition-colors border-b last:border-0 ${
                        isChecked ? "bg-primary/5" : "hover:bg-muted/30"
                      } ${isOutOFStock ? "opacity-60 bg-muted/10" : ""}`}
                    >
                      {/* Product Reference */}
                      <div
                        className={`col-span-3 flex items-start gap-2.5 min-w-0 pt-1 ${
                          editingLineIndex === null && !isOutOFStock ? "cursor-pointer select-none" : ""
                        }`}
                        onClick={() => !isOutOFStock && handleToggleProduct(product.inflowId)}
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
                          {isOutOFStock && (
                            <span className="text-[9px] text-destructive font-semibold mt-0.5">
                              Out of Stock
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Source Bin & Allocation */}
                      <div className="col-span-4 space-y-1.5">
                        <select
                          disabled={!isChecked || isOutOFStock}
                          value={primarySourceSubId}
                          onChange={(e) => handlePrimarySourceChange(item, e.target.value)}
                          className="w-full text-xs h-8 rounded-md border border-input bg-background px-1 focus:outline-hidden disabled:opacity-40"
                        >
                          <option value="">Floor / Bulk Area</option>
                          {departureSublocations.map((sub) => {
                            const binStock = item.stocks.source.bins.find((b) => b.sublocationId === sub.id)?.quantity || 0;
                            return (
                              <option key={sub.id} value={sub.id}>
                                {sub.name} ({binStock} avail)
                              </option>
                            );
                          })}
                        </select>

                        <div className="flex flex-col gap-1 px-1 min-h-[14px]">
                          {isChecked ? (
                            <>
                              <div className="flex items-center justify-between text-[10px] font-mono">
                                <span className="text-amber-600 font-medium">
                                  Total Source Avail: <strong>{totalAvailableSource}</strong> units
                                </span>
                              </div>
                              {config.sourceAllocations.length > 1 && (
                                <div className="text-[9px] bg-amber-500/10 text-amber-700 dark:text-amber-400 p-1.5 rounded border border-amber-500/20 space-y-0.5">
                                  <span className="font-semibold block">Multi-Bin Auto Allocation:</span>
                                  {config.sourceAllocations.map((alloc) => {
                                    const subName =
                                      departureSublocations.find((s) => s.id === alloc.sublocationId)?.name ||
                                      "Floor / Bulk Area";
                                    return (
                                      <div key={alloc.sublocationId || "bulk"} className="flex justify-between">
                                        <span>• {subName}</span>
                                        <span className="font-mono font-bold">{alloc.quantity} qty</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </>
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
                          disabled={!isChecked || isOutOFStock}
                          value={config.targetSublocationId}
                          onChange={(e) =>
                            setRowConfigs((prev) => ({
                              ...prev,
                              [product.inflowId]: {
                                ...prev[product.inflowId],
                                targetSublocationId: e.target.value,
                              },
                            }))
                          }
                          className="w-full text-xs h-8 rounded-md border border-input bg-background px-1 focus:outline-hidden disabled:opacity-40"
                        >
                          <option value="">Floor / Bulk Area</option>
                          {arrivalSublocations.map((sub) => {
                            const selfCollision =
                              sourceLocationId === targetLocationId &&
                              sub.id === primarySourceSubId;
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
                              Current Target Stock:{" "}
                              <strong>
                                {getTargetStockValue(item, config.targetSublocationId)}
                              </strong>{" "}
                              units
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* Quantity Input Field */}
                      <div className="col-span-1">
                        <Input
                          type="number"
                          step="any"
                          min="0.0001"
                          disabled={!isChecked || isOutOFStock}
                          value={config.quantity}
                          onChange={(e) => handleQuantityChange(item, e.target.value)}
                          className={`text-xs h-8 font-mono text-right p-1 ${
                            Number(config.quantity) > totalAvailableSource
                              ? "border-destructive text-destructive bg-destructive/10 focus-visible:ring-destructive font-bold"
                              : ""
                          }`}
                          placeholder="1"
                        />
                        {isChecked && Number(config.quantity) > totalAvailableSource && (
                          <span className="text-[9px] text-destructive font-semibold block text-right mt-1">
                            Exceeds stock!
                          </span>
                        )}
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