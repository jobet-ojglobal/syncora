"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ArrowRightLeft,
  AlertCircle,
  Search,
  CheckCircle2,
  Circle,
  ChevronsUpDown,
  Check,
  X,
} from "lucide-react";
import { TransferOrderInput } from "@/schemas/transfer.schema";

export interface StockBinItem {
  sublocationId: string;
  quantity: number;
}

export interface ProductMatrixItem {
  product: {
    inflowId: string;
    name: string;
    sku?: string | null;
  };
  stocks: {
    source: {
      quantityAvailable: number;
      bins: StockBinItem[];
    };
    target: {
      quantityAvailable: number;
      bins: StockBinItem[];
    };
  };
}

export interface SourceAllocation {
  sublocationId: string;
  quantity: number;
}

export interface InlineConfig {
  productId: string;
  sourceAllocations: SourceAllocation[];
  targetSublocationId: string;
  quantity: number | string;
}

export interface SublocationLookup {
  id: string;
  name: string;
  locationId: string;
}

interface ProductLineModalProps {
  isOpen: boolean;
  onClose: () => void;
  productMatrix?: ProductMatrixItem[];
  sublocations?: SublocationLookup[];
  sourceLocationId: string;
  targetLocationId: string;
  existingLines: TransferOrderInput["lines"];
  editingLineIndex: number | null;
  onSave: (lines: any[]) => void;
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

  // Helper to compute smart default bin allocation when selecting a product
  const getDefaultAllocations = (item: ProductMatrixItem): SourceAllocation[] => {
    const totalAvailableSource = item.stocks.source.quantityAvailable;
    if (totalAvailableSource <= 0) return [];

    // Calculate total stock assigned to bins
    const totalBinSource = item.stocks.source.bins.reduce(
      (sum, bin) => sum + (bin.quantity || 0),
      0
    );

    // Remaining stock is Floor / Bulk
    const totalBulkSource = Math.max(0, totalAvailableSource - totalBinSource);

    // 1. If Floor / Bulk has stock (> 0), default to Floor / Bulk ("")
    if (totalBulkSource > 0) {
      return [{ sublocationId: "", quantity: 1 }];
    }

    // 2. If Floor / Bulk is 0, pick the first source bin with stock > 0
    const firstAvailableBin = item.stocks.source.bins.find((bin) => bin.quantity > 0);
    if (firstAvailableBin) {
      return [{ sublocationId: firstAvailableBin.sublocationId, quantity: 1 }];
    }

    return [];
  };

  

  // useEffect(() => {
  //   if (isOpen) {
  //     const initialConfigs: Record<string, InlineConfig> = {};

  //     productMatrix.forEach((item) => {
  //       initialConfigs[item.product.inflowId] = {
  //         productId: item.product.inflowId,
  //         sourceAllocations: [{ sublocationId: "", quantity: 1 }],
  //         targetSublocationId: "",
  //         quantity: 1,
  //       };
  //     });

  //     if (editingLineIndex !== null && existingLines[editingLineIndex]) {
  //       const currentLine = existingLines[editingLineIndex];
  //       const targetProdId = currentLine.productId;
  //       setSelectedProductIds([targetProdId]);

  //       // Collect ALL lines matching this productId to build combined sourceAllocations & total quantity
  //       const productLines = existingLines.filter((line) => line.productId === targetProdId);
  //       const combinedAllocations: SourceAllocation[] = productLines.map((line) => ({
  //         sublocationId: line.sourceSublocationId || "",
  //         quantity: Number(line.quantity) || 0,
  //       }));

  //       const totalQty = combinedAllocations.reduce((acc, a) => acc + Number(a.quantity), 0);

  //       initialConfigs[targetProdId] = {
  //         productId: targetProdId,
  //         sourceAllocations: combinedAllocations,
  //         targetSublocationId: currentLine.targetSublocationId || "",
  //         quantity: totalQty,
  //       };
  //     } else {
  //       setSelectedProductIds([]);
  //       if (searchQuery !== "") setSearchQuery("");
  //     }

  //     setRowConfigs(initialConfigs);
  //     setValidationError("");
  //   }
  // }, [isOpen, editingLineIndex, existingLines, productMatrix]);

  useEffect(() => {
  if (isOpen) {
    const initialConfigs: Record<string, InlineConfig> = {};

    productMatrix.forEach((item) => {
      const defaultAllocations = getDefaultAllocations(item);

      initialConfigs[item.product.inflowId] = {
        productId: item.product.inflowId,
        sourceAllocations: defaultAllocations,
        targetSublocationId: "",
        quantity: defaultAllocations.length > 0 ? 1 : 0,
      };
    });

    if (editingLineIndex !== null && existingLines[editingLineIndex]) {
      const currentLine = existingLines[editingLineIndex];
      const targetProdId = currentLine.productId;
      setSelectedProductIds([targetProdId]);

      const productLines = existingLines.filter((line) => line.productId === targetProdId);
      const combinedAllocations: SourceAllocation[] = productLines.map((line) => ({
        sublocationId: line.sourceSublocationId || "",
        quantity: Number(line.quantity) || 0,
      }));

      const totalQty = combinedAllocations.reduce((acc, a) => acc + Number(a.quantity), 0);

      initialConfigs[targetProdId] = {
        productId: targetProdId,
        sourceAllocations: combinedAllocations,
        targetSublocationId: currentLine.targetSublocationId || "",
        quantity: totalQty,
      };
    } else {
      setSelectedProductIds([]);
      if (searchQuery !== "") setSearchQuery("");
    }

    setRowConfigs(initialConfigs);
    setValidationError("");
  }
}, [isOpen, editingLineIndex, existingLines, productMatrix]);

  

  // Helper to get max available stock for a specific bin ID
  const getBinMaxStock = (item: ProductMatrixItem, sublocationId: string): number => {
    if (sublocationId === "") {
      const totalBinSource = item.stocks.source.bins.reduce(
        (sum, bin) => sum + (bin.quantity || 0),
        0
      );
      return Math.max(0, item.stocks.source.quantityAvailable - totalBinSource);
    }
    return item.stocks.source.bins.find((b) => b.sublocationId === sublocationId)?.quantity || 0;
  };

  // Refactored recalculateAllocations that automatically picks adjacent available bins when needed
  const recalculateAllocations = (
    item: ProductMatrixItem,
    targetQty: number,
    selectedBinIds: string[]
  ): SourceAllocation[] => {
    if (targetQty <= 0) return [];

    let remaining = Math.min(targetQty, item.stocks.source.quantityAvailable);
    const allocations: SourceAllocation[] = [];
    const trackedBins = new Set(selectedBinIds);

    // 1. First allocate across user's explicitly selected bins
    for (const binId of selectedBinIds) {
      if (remaining <= 0) break;
      const maxBinAvail = getBinMaxStock(item, binId);
      const taken = Math.min(maxBinAvail, remaining);
      if (taken > 0 || selectedBinIds.length === 1) {
        allocations.push({ sublocationId: binId, quantity: taken });
        remaining -= taken;
      }
    }

    // 2. If requested Qty is increased and selected bins aren't enough, auto-add next available bins
    if (remaining > 0) {
      const remainingBins = item.stocks.source.bins.filter(
        (b) => !trackedBins.has(b.sublocationId) && b.quantity > 0
      );

      for (const bin of remainingBins) {
        if (remaining <= 0) break;
        const taken = Math.min(bin.quantity, remaining);
        if (taken > 0) {
          allocations.push({ sublocationId: bin.sublocationId, quantity: taken });
          trackedBins.add(bin.sublocationId);
          remaining -= taken;
        }
      }
    }

    // 3. Fallback to Floor/Bulk Area ("") if still remaining
    if (remaining > 0 && !trackedBins.has("")) {
      const bulkMax = getBinMaxStock(item, "");
      if (bulkMax > 0) {
        const taken = Math.min(bulkMax, remaining);
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

  // const handleToggleProduct = (id: string) => {
  //   if (editingLineIndex !== null) return;
  //   setSelectedProductIds((prev) =>
  //     prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
  //   );
  // };
  const handleToggleProduct = (id: string) => {
    if (editingLineIndex !== null) return;

    setSelectedProductIds((prev) => {
      const isSelecting = !prev.includes(id);

      if (isSelecting) {
        const item = productMatrix.find((m) => m.product.inflowId === id);
        if (item) {
          const defaultAllocations = getDefaultAllocations(item);

          setRowConfigs((prevConfigs) => ({
            ...prevConfigs,
            [id]: {
              ...prevConfigs[id],
              productId: id,
              sourceAllocations: defaultAllocations,
              quantity: defaultAllocations.length > 0 ? 1 : 0,
            },
          }));
        }
      }

      return isSelecting ? [...prev, id] : prev.filter((item) => item !== id);
    });
  };

  const handleQuantityChange = (item: ProductMatrixItem, rawVal: string) => {
    const qty = rawVal === "" ? "" : Number(rawVal);
    const numQty = Number(qty) || 0;

    const currentAllocations = rowConfigs[item.product.inflowId]?.sourceAllocations || [];
    const selectedBinIds = currentAllocations.map((a) => a.sublocationId);

    const newAllocations = recalculateAllocations(
      item,
      numQty,
      selectedBinIds.length > 0 ? selectedBinIds : [""]
    );

    setRowConfigs((prev) => ({
      ...prev,
      [item.product.inflowId]: {
        ...prev[item.product.inflowId],
        quantity: qty,
        sourceAllocations:
          newAllocations.length > 0
            ? newAllocations
            : [{ sublocationId: selectedBinIds[0] || "", quantity: numQty }],
      },
    }));
  };

  const handleBinsSelectionChange = (item: ProductMatrixItem, updatedBinIds: string[]) => {
    const currentQty = Number(rowConfigs[item.product.inflowId]?.quantity) || 1;
    const newAllocations = recalculateAllocations(item, currentQty, updatedBinIds);

    setRowConfigs((prev) => ({
      ...prev,
      [item.product.inflowId]: {
        ...prev[item.product.inflowId],
        sourceAllocations:
          newAllocations.length > 0
            ? newAllocations
            : updatedBinIds.map((id) => ({ sublocationId: id, quantity: 0 })),
      },
    }));
  };

  const handleAllocationQtyChange = (
    item: ProductMatrixItem,
    sublocationId: string,
    rawQty: string
  ) => {
    const maxStock = getBinMaxStock(item, sublocationId);
    const parsedQty = rawQty === "" ? 0 : Number(rawQty);
    // Cap entered quantity to the bin's max stock
    const newQty = Math.min(parsedQty, maxStock);

    setRowConfigs((prev) => {
      const currentAllocations = prev[item.product.inflowId]?.sourceAllocations || [];
      const updatedAllocations = currentAllocations.map((alloc) =>
        alloc.sublocationId === sublocationId ? { ...alloc, quantity: newQty } : alloc
      );
      const totalAllocatedQty = updatedAllocations.reduce((sum, a) => sum + Number(a.quantity), 0);

      return {
        ...prev,
        [item.product.inflowId]: {
          ...prev[item.product.inflowId],
          quantity: totalAllocatedQty,
          sourceAllocations: updatedAllocations,
        },
      };
    });
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

      // Filter allocations that have quantity > 0
      const activeAllocations = (config.sourceAllocations || []).filter(
        (alloc) => Number(alloc.quantity) > 0
      );

      // Insert 1 TO line per used source bin allocation
      if (activeAllocations.length > 0) {
        activeAllocations.forEach((alloc) => {
          payload.push({
            productId: prodId,
            sourceSublocationId: alloc.sublocationId || "",
            sourceAllocations: [{ sublocationId: alloc.sublocationId || "", quantity: Number(alloc.quantity) }],
            targetSublocationId: config.targetSublocationId || "",
            quantity: Number(alloc.quantity),
          });
        });
      } else {
        payload.push({
          productId: prodId,
          sourceSublocationId: "",
          sourceAllocations: [{ sublocationId: "", quantity: qtyNum }],
          targetSublocationId: config.targetSublocationId || "",
          quantity: qtyNum,
        });
      }
    }

    setValidationError("");
    onSave(payload);
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
              <span className="col-span-4">Source Bin(s) Selection</span>
              <span className="col-span-3">Target Bin & Stock</span>
              <span className="col-span-2 text-right pr-1">Total Qty</span>
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

                  const selectedBinIds = config.sourceAllocations.map((a) => a.sublocationId);
                  const totalAvailableSource = item.stocks.source.quantityAvailable;
                  const isOutOfStock = totalAvailableSource <= 0;

                  // Calculate total allocated quantity across all sublocation bins
                  const totalBinSource = item.stocks.source.bins.reduce(
                    (sum, bin) => sum + (bin.quantity || 0),
                    0
                  );

                  // Bulk area / floor stock is the remaining unassigned quantity
                  const totalBulkSource = Math.max(0, totalAvailableSource - totalBinSource);

                  // Options list for Multi-Select (Floor/Bulk + source sublocations)
                  const binOptions = [
                    { id: "", name: `Floor / Bulk Area (${totalBulkSource} avail)` },
                    ...departureSublocations.map((sub) => {
                      const binStock =
                        item.stocks.source.bins.find((b) => b.sublocationId === sub.id)?.quantity || 0;
                      return { id: sub.id, name: `${sub.name} (${binStock} avail)` };
                    }),
                  ];

                  return (
                    <div
                      key={product.inflowId}
                      className={`p-3 text-xs grid grid-cols-12 gap-3 items-start transition-colors border-b last:border-0 ${
                        isChecked ? "bg-primary/5" : "hover:bg-muted/30"
                      } ${isOutOfStock ? "opacity-60 bg-muted/10" : ""}`}
                    >
                      {/* Product Reference */}
                      <div
                        className={`col-span-3 flex items-start gap-2.5 min-w-0 pt-1 ${
                          editingLineIndex === null && !isOutOfStock ? "cursor-pointer select-none" : ""
                        }`}
                        onClick={() => !isOutOfStock && handleToggleProduct(product.inflowId)}
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
                          {isOutOfStock && (
                            <span className="text-[9px] text-destructive font-semibold mt-0.5">
                              Out of Stock
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Multi-Select Source Bins & Dynamic Split Controls */}
                      <div className="col-span-4 space-y-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              disabled={!isChecked || isOutOfStock}
                              className="w-full justify-between font-normal text-xs min-h-8 h-auto py-1 px-2 shadow-xs items-center gap-1 flex flex-wrap bg-background disabled:opacity-40"
                            >
                              {selectedBinIds.length > 0 ? (
                                <div className="flex flex-wrap gap-1 max-w-[85%] pointer-events-auto">
                                  {selectedBinIds.map((binId) => {
                                    const optionName =
                                      binId === ""
                                        ? "Floor / Bulk Area"
                                        : departureSublocations.find((s) => s.id === binId)?.name || binId;
                                    return (
                                      <Badge
                                        key={binId || "bulk"}
                                        variant="secondary"
                                        className="text-[10px] font-medium pl-1.5 pr-1 py-0 gap-1 flex items-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 border-none"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const nextBinIds = selectedBinIds.filter((id) => id !== binId);
                                          handleBinsSelectionChange(item, nextBinIds);
                                        }}
                                      >
                                        <span className="truncate max-w-[100px]">{optionName}</span>
                                        <X className="h-2.5 w-2.5 opacity-60 hover:opacity-100 cursor-pointer" />
                                      </Badge>
                                    );
                                  })}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">Select source bin(s)...</span>
                              )}
                              <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50 ml-auto" />
                            </Button>
                          </PopoverTrigger>

                          <PopoverContent className="w-[280px] p-0 max-h-60" align="start">
                            <Command>
                              <CommandInput placeholder="Search bins..." className="h-8 text-xs" />
                              <CommandList>
                                <CommandEmpty className="p-2 text-xs text-muted-foreground text-center">
                                  No bin options found.
                                </CommandEmpty>
                                <CommandGroup>
                                  {binOptions.map((opt) => {
                                    const isSelected = selectedBinIds.includes(opt.id);
                                    return (
                                      <CommandItem
                                        key={opt.id || "bulk"}
                                        value={opt.name}
                                        onSelect={() => {
                                          const nextBinIds = isSelected
                                            ? selectedBinIds.filter((id) => id !== opt.id)
                                            : [...selectedBinIds, opt.id];
                                          handleBinsSelectionChange(item, nextBinIds);
                                        }}
                                        className="text-xs flex items-center justify-between cursor-pointer"
                                      >
                                        <div className="flex items-center gap-2 flex-1 truncate">
                                          <div
                                            className={cn(
                                              "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-xs border border-primary transition-colors",
                                              isSelected
                                                ? "bg-primary text-primary-foreground"
                                                : "opacity-50"
                                            )}
                                          >
                                            {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                                          </div>
                                          <span className="truncate">{opt.name}</span>
                                        </div>
                                      </CommandItem>
                                    );
                                  })}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>

                        {/* Split Quantity Inputs for Selected Bins */}
                        {/* {isChecked && config.sourceAllocations.length > 0 && (
                          <div className="space-y-1 bg-muted/30 p-2 rounded-lg border">
                            <span className="text-[10px] font-semibold text-amber-600 block mb-1">
                              Bin Allocations Breakdown:
                            </span>
                            {config.sourceAllocations.map((alloc) => {
                              const binName =
                                alloc.sublocationId === ""
                                  ? "Floor / Bulk"
                                  : departureSublocations.find((s) => s.id === alloc.sublocationId)?.name ||
                                    alloc.sublocationId;

                              return (
                                <div
                                  key={alloc.sublocationId || "bulk"}
                                  className="flex items-center justify-between gap-2"
                                >
                                  <span className="text-[10px] font-mono text-muted-foreground truncate">
                                    • {binName}
                                  </span>
                                  <Input
                                    type="number"
                                    step="any"
                                    min="0"
                                    value={alloc.quantity}
                                    onChange={(e) =>
                                      handleAllocationQtyChange(item, alloc.sublocationId, e.target.value)
                                    }
                                    className="w-16 text-[11px] h-6 font-mono text-right p-1"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        )} */}

                        {isChecked && config.sourceAllocations.length > 0 && (
                        <div className="space-y-1 bg-muted/30 p-2 rounded-lg border">
                          <span className="text-[10px] font-semibold text-amber-600 block mb-1">
                            Bin Allocations Breakdown:
                          </span>
                          {config.sourceAllocations.map((alloc) => {
                            const maxBinAvail = getBinMaxStock(item, alloc.sublocationId);
                            const binName =
                              alloc.sublocationId === ""
                                ? "Floor / Bulk"
                                : departureSublocations.find((s) => s.id === alloc.sublocationId)?.name ||
                                  alloc.sublocationId;

                            return (
                              <div
                                key={alloc.sublocationId || "bulk"}
                                className="flex items-center justify-between gap-2"
                              >
                                <span className="text-[10px] font-mono text-muted-foreground truncate">
                                  • {binName} ({maxBinAvail} avail)
                                </span>
                                <Input
                                  type="number"
                                  step="any"
                                  min="0"
                                  max={maxBinAvail}
                                  value={alloc.quantity}
                                  onChange={(e) =>
                                    handleAllocationQtyChange(item, alloc.sublocationId, e.target.value)
                                  }
                                  className="w-16 text-[11px] h-6 font-mono text-right p-1"
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}
                      </div>

                      {/* Target Area */}
                      <div className="col-span-3 space-y-1.5">
                        <select
                          disabled={!isChecked || isOutOfStock}
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
                          {arrivalSublocations.map((sub) => (
                            <option key={sub.id} value={sub.id}>
                              {sub.name}
                            </option>
                          ))}
                        </select>

                        {isChecked && (
                          <span className="text-[10px] font-mono text-blue-600 font-medium block px-0.5">
                            Target Stock:{" "}
                            <strong>
                              {getTargetStockValue(item, config.targetSublocationId)}
                            </strong>{" "}
                            units
                          </span>
                        )}
                      </div>

                      {/* Total Aggregate Quantity Display / Override Input */}
                      <div className="col-span-2">
                        <Input
                          type="number"
                          step="any"
                          min="0.0001"
                          disabled={!isChecked || isOutOfStock}
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


  // const handleAllocationQtyChange = (
  //   item: ProductMatrixItem,
  //   sublocationId: string,
  //   rawQty: string
  // ) => {
  //   const newQty = Number(rawQty) || 0;
  //   setRowConfigs((prev) => {
  //     const currentAllocations = prev[item.product.inflowId]?.sourceAllocations || [];
  //     const updatedAllocations = currentAllocations.map((alloc) =>
  //       alloc.sublocationId === sublocationId ? { ...alloc, quantity: newQty } : alloc
  //     );
  //     const totalAllocatedQty = updatedAllocations.reduce((sum, a) => sum + Number(a.quantity), 0);

  //     return {
  //       ...prev,
  //       [item.product.inflowId]: {
  //         ...prev[item.product.inflowId],
  //         quantity: totalAllocatedQty,
  //         sourceAllocations: updatedAllocations,
  //       },
  //     };
  //   });
  // };


// "use client";

// import React, { useState, useEffect, useMemo } from "react";
// import { ArrowRightLeft, Search, CheckCircle2, Circle, AlertCircle } from "lucide-react";
// import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { ScrollArea } from "@/components/ui/scroll-area";
// import { FormMultiSelect } from "../shared/form-multiple-select";

// export interface ProductMatrixItem {
//   product: {
//     id: string;
//     inflowId: string;
//     sku: string;
//     name: string;
//     slug: string;
//     thumbnail: string | null;
//   };
//   stocks: {
//     source: {
//       quantityAvailable: number;
//       bins: Array<{ sublocationId: string; quantity: number }>;
//     };
//     target: {
//       quantityAvailable: number;
//       bins: Array<{ sublocationId: string; quantity: number }>;
//     };
//   };
// }

// export interface SublocationLookup {
//   id: string;
//   name: string;
//   locationId: string;
// }

// export interface SourceAllocation {
//   sublocationId: string; 
//   quantity: number;
// }

// export interface InlineConfig {
//   productId: string;
//   sourceAllocations: SourceAllocation[];
//   targetSublocationId: string;
//   quantity: number | "";
// }

// export interface ProductLineModalProps {
//   isOpen: boolean;
//   onClose: () => void;
//   productMatrix: ProductMatrixItem[];
//   sublocations: SublocationLookup[];
//   sourceLocationId: string;
//   targetLocationId: string;
//   existingLines: any[];
//   editingLineIndex: number | null;
//   onSave: (data: any | any[]) => void;
// }

// export function ProductLineModal({
//   isOpen,
//   onClose,
//   productMatrix = [],
//   sublocations = [],
//   sourceLocationId,
//   targetLocationId,
//   existingLines,
//   editingLineIndex,
//   onSave,
// }: ProductLineModalProps) {
//   const [searchQuery, setSearchQuery] = useState("");
//   const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
//   const [validationError, setValidationError] = useState("");
//   const [rowConfigs, setRowConfigs] = useState<Record<string, InlineConfig>>({});

//   const departureSublocations = useMemo(
//     () => sublocations.filter((s) => s.locationId === sourceLocationId),
//     [sublocations, sourceLocationId]
//   );

//   const arrivalSublocations = useMemo(
//     () => sublocations.filter((s) => s.locationId === targetLocationId),
//     [sublocations, targetLocationId]
//   );

//   const filteredMatrix = useMemo(() => {
//     let result = productMatrix;

//     if (editingLineIndex !== null && existingLines[editingLineIndex]) {
//       const targetProductId = existingLines[editingLineIndex].productId;
//       result = productMatrix.filter((item) => item.product.inflowId === targetProductId);
//     } else {
//       const activeLineProductIds = existingLines.map((line) => line.productId);
//       result = productMatrix.filter((item) => !activeLineProductIds.includes(item.product.inflowId));
//     }

//     if (!searchQuery.trim()) return result;
//     const lowerQuery = searchQuery.toLowerCase();
//     return result.filter(
//       (item) =>
//         item.product.name.toLowerCase().includes(lowerQuery) ||
//         item.product.inflowId.toLowerCase().includes(lowerQuery) ||
//         item.product.sku?.toLowerCase().includes(lowerQuery)
//     );
//   }, [productMatrix, existingLines, editingLineIndex, searchQuery]);

//   useEffect(() => {
//     if (isOpen) {
//       const initialConfigs: Record<string, InlineConfig> = {};

//       productMatrix.forEach((item) => {
//         initialConfigs[item.product.inflowId] = {
//           productId: item.product.inflowId,
//           sourceAllocations: [{ sublocationId: "", quantity: 1 }],
//           targetSublocationId: "",
//           quantity: 1,
//         };
//       });

//       if (editingLineIndex !== null && existingLines[editingLineIndex]) {
//         const currentLine = existingLines[editingLineIndex];
//         const targetProdId = currentLine.productId;
//         setSelectedProductIds([targetProdId]);

//         // Collect ALL lines matching this productId to build combined sourceAllocations & total quantity
//         const productLines = existingLines.filter((line) => line.productId === targetProdId);
//         const combinedAllocations: SourceAllocation[] = productLines.map((line) => ({
//           sublocationId: line.sourceSublocationId || "",
//           quantity: Number(line.quantity) || 0,
//         }));

//         const totalQty = combinedAllocations.reduce((acc, a) => acc + Number(a.quantity), 0);

//         initialConfigs[targetProdId] = {
//           productId: targetProdId,
//           sourceAllocations: combinedAllocations,
//           targetSublocationId: currentLine.targetSublocationId || "",
//           quantity: totalQty,
//         };
//       } else {
//         setSelectedProductIds([]);
//         if (searchQuery !== "") setSearchQuery("");
//       }

//       setRowConfigs(initialConfigs);
//       setValidationError("");
//     }
//   }, [isOpen, editingLineIndex, existingLines, productMatrix]);


//   const allocateStockFromSources = (
//     item: ProductMatrixItem,
//     targetQty: number,
//     preferredPrimarySubId?: string
//   ): SourceAllocation[] => {
//     if (targetQty <= 0) return [];

//     const availableBins = item.stocks.source.bins.filter((b) => b.quantity > 0);
//     const allocations: SourceAllocation[] = [];
//     let remaining = targetQty;

//     if (preferredPrimarySubId !== undefined) {
//       if (preferredPrimarySubId === "") {
//         const bulkQty = item.stocks.source.quantityAvailable;
//         if (bulkQty > 0) {
//           const taken = Math.min(bulkQty, remaining);
//           allocations.push({ sublocationId: "", quantity: taken });
//           remaining -= taken;
//         }
//       } else {
//         const primaryBin = availableBins.find((b) => b.sublocationId === preferredPrimarySubId);
//         if (primaryBin) {
//           const taken = Math.min(primaryBin.quantity, remaining);
//           allocations.push({ sublocationId: primaryBin.sublocationId, quantity: taken });
//           remaining -= taken;
//         }
//       }
//     }

//     if (remaining > 0) {
//       for (const bin of availableBins) {
//         if (allocations.some((a) => a.sublocationId === bin.sublocationId)) continue;

//         const taken = Math.min(bin.quantity, remaining);
//         if (taken > 0) {
//           allocations.push({ sublocationId: bin.sublocationId, quantity: taken });
//           remaining -= taken;
//         }
//         if (remaining <= 0) break;
//       }
//     }

//     if (remaining > 0 && !allocations.some((a) => a.sublocationId === "")) {
//       const bulkQty = item.stocks.source.quantityAvailable;
//       if (bulkQty > 0) {
//         const taken = Math.min(bulkQty, remaining);
//         allocations.push({ sublocationId: "", quantity: taken });
//         remaining -= taken;
//       }
//     }

//     return allocations;
//   };

//   const getTargetStockValue = (item: ProductMatrixItem, tgtSubId: string) => {
//     if (tgtSubId) {
//       return item.stocks.target.bins.find((b) => b.sublocationId === tgtSubId)?.quantity || 0;
//     }
//     return item.stocks.target.quantityAvailable;
//   };

//   const handleToggleProduct = (id: string) => {
//     if (editingLineIndex !== null) return;
//     setSelectedProductIds((prev) =>
//       prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
//     );
//   };

//   const handleQuantityChange = (item: ProductMatrixItem, rawVal: string) => {
//     const qty = rawVal === "" ? "" : Number(rawVal);
//     const numQty = Number(qty) || 0;
//     const currentPrimary = rowConfigs[item.product.inflowId]?.sourceAllocations[0]?.sublocationId ?? "";

//     const newAllocations = allocateStockFromSources(item, numQty, currentPrimary);

//     setRowConfigs((prev) => ({
//       ...prev,
//       [item.product.inflowId]: {
//         ...prev[item.product.inflowId],
//         quantity: qty,
//         sourceAllocations: newAllocations.length > 0 ? newAllocations : [{ sublocationId: currentPrimary, quantity: numQty }],
//       },
//     }));
//   };

//   const handlePrimarySourceChange = (item: ProductMatrixItem, newSublocationId: string) => {
//     const currentQty = Number(rowConfigs[item.product.inflowId]?.quantity) || 1;
//     const newAllocations = allocateStockFromSources(item, currentQty, newSublocationId);

//     setRowConfigs((prev) => ({
//       ...prev,
//       [item.product.inflowId]: {
//         ...prev[item.product.inflowId],
//         sourceAllocations: newAllocations.length > 0 ? newAllocations : [{ sublocationId: newSublocationId, quantity: currentQty }],
//       },
//     }));
//   };

//   const handleValidateAndCommit = () => {
//     if (selectedProductIds.length === 0) {
//       return setValidationError("Please select at least one product line.");
//     }

//     const payload: any[] = [];

//     for (const prodId of selectedProductIds) {
//       const item = productMatrix.find((m) => m.product.inflowId === prodId);
//       const config = rowConfigs[prodId];
//       const qtyNum = Number(config?.quantity);
//       const prodName = item?.product.name || prodId;

//       if (!config || !qtyNum || qtyNum <= 0) {
//         return setValidationError(`Allocated quantity for "${prodName}" must be greater than zero.`);
//       }

//       const totalAvailableStock = item?.stocks.source.quantityAvailable || 0;
//       if (qtyNum > totalAvailableStock) {
//         return setValidationError(
//           `Requested quantity (${qtyNum}) exceeds available stock (${totalAvailableStock}) for "${prodName}".`
//         );
//       }

//       // Filter allocations that have quantity > 0
//       const activeAllocations = (config.sourceAllocations || []).filter(
//         (alloc) => Number(alloc.quantity) > 0
//       );

//       // Insert 1 TO line per used source bin allocation
//       if (activeAllocations.length > 0) {
//         activeAllocations.forEach((alloc) => {
//           payload.push({
//             productId: prodId,
//             sourceSublocationId: alloc.sublocationId || "",
//             sourceAllocations: [{ sublocationId: alloc.sublocationId || "", quantity: Number(alloc.quantity) }],
//             targetSublocationId: config.targetSublocationId || "",
//             quantity: Number(alloc.quantity),
//           });
//         });
//       } else {
//         payload.push({
//           productId: prodId,
//           sourceSublocationId: "",
//           sourceAllocations: [{ sublocationId: "", quantity: qtyNum }],
//           targetSublocationId: config.targetSublocationId || "",
//           quantity: qtyNum,
//         });
//       }
//     }

//     setValidationError("");
//     // Always pass the array of generated TO lines back to the form handler
//     onSave(payload);
//   };


//   return (
//     <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
//       <DialogContent className="sm:max-w-5xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
//         <DialogHeader className="p-4 border-b bg-muted/20">
//           <DialogTitle className="text-sm font-semibold flex items-center gap-2">
//             <ArrowRightLeft className="w-4 h-4 text-primary" />
//             {editingLineIndex !== null
//               ? "Edit Line Location & Quantity"
//               : "Batch Product Transfer Selection Matrix"}
//           </DialogTitle>
//         </DialogHeader>

//         {validationError && (
//           <div className="mx-4 mt-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg font-medium flex items-center gap-2">
//             <AlertCircle className="w-4 h-4 shrink-0" />
//             <span>{validationError}</span>
//           </div>
//         )}

//         <div className="p-4 space-y-4 flex-1 overflow-y-auto flex flex-col min-h-0">
//           {editingLineIndex === null && (
//             <div className="relative">
//               <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
//               <Input
//                 placeholder="Search products by name, SKU, or ID..."
//                 value={searchQuery}
//                 onChange={(e) => setSearchQuery(e.target.value)}
//                 className="pl-9 text-xs h-9"
//               />
//             </div>
//           )}

//           <div className="border rounded-xl flex flex-col flex-1 bg-card overflow-hidden min-h-[260px]">
//             <div className="bg-muted/50 border-b text-[10px] font-bold uppercase tracking-wider text-muted-foreground p-3 grid grid-cols-12 gap-3 items-center shrink-0">
//               <span className="col-span-3">Product Reference</span>
//               <span className="col-span-4">Source Bin & Stock Allocation</span>
//               <span className="col-span-4">Target Bin & Stock</span>
//               <span className="col-span-1 text-right pr-1">Qty</span>
//             </div>

//             <ScrollArea className="flex-1 divide-y">
//               {filteredMatrix.length === 0 ? (
//                 <div className="p-8 text-center text-xs text-muted-foreground font-medium">
//                   {editingLineIndex !== null
//                     ? "Target item not found."
//                     : "No available inventory items found at source site."}
//                 </div>
//               ) : (
//                 filteredMatrix.map((item) => {
//                   const { product } = item;
//                   const isChecked = selectedProductIds.includes(product.inflowId);
//                   const config = rowConfigs[product.inflowId] || {
//                     sourceAllocations: [{ sublocationId: "", quantity: 1 }],
//                     targetSublocationId: "",
//                     quantity: 1,
//                   };

//                   const primarySourceSubId = config.sourceAllocations[0]?.sublocationId ?? "";
//                   const totalAvailableSource = item.stocks.source.quantityAvailable;
//                   const isOutOFStock = totalAvailableSource <= 0;

//                   return (
//                     <div
//                       key={product.inflowId}
//                       className={`p-3 text-xs grid grid-cols-12 gap-3 items-start transition-colors border-b last:border-0 ${
//                         isChecked ? "bg-primary/5" : "hover:bg-muted/30"
//                       } ${isOutOFStock ? "opacity-60 bg-muted/10" : ""}`}
//                     >
//                       {/* Product Reference */}
//                       <div
//                         className={`col-span-3 flex items-start gap-2.5 min-w-0 pt-1 ${
//                           editingLineIndex === null && !isOutOFStock ? "cursor-pointer select-none" : ""
//                         }`}
//                         onClick={() => !isOutOFStock && handleToggleProduct(product.inflowId)}
//                       >
//                         <div className="shrink-0 mt-0.5">
//                           {isChecked ? (
//                             <CheckCircle2 className="w-4 h-4 text-primary fill-primary/10" />
//                           ) : (
//                             <Circle className="w-4 h-4 text-muted-foreground" />
//                           )}
//                         </div>
//                         <div className="flex flex-col min-w-0">
//                           <span className="font-medium text-foreground truncate">{product.name}</span>
//                           <span className="text-[10px] text-muted-foreground font-mono truncate mt-0.5">
//                             {product.sku || product.inflowId}
//                           </span>
//                           {isOutOFStock && (
//                             <span className="text-[9px] text-destructive font-semibold mt-0.5">
//                               Out of Stock
//                             </span>
//                           )}
//                         </div>
//                       </div>

                      

//                       {/* Source Bin & Allocation */}
                      

//                       <div className="col-span-4 space-y-1.5">
//                         <select
//                           disabled={!isChecked || isOutOFStock}
//                           value={primarySourceSubId}
//                           onChange={(e) => handlePrimarySourceChange(item, e.target.value)}
//                           className="w-full text-xs h-8 rounded-md border border-input bg-background px-1 focus:outline-hidden disabled:opacity-40"
//                         >
//                           <option value="">Floor / Bulk Area</option>
//                           {departureSublocations.map((sub) => {
//                             const binStock = item.stocks.source.bins.find((b) => b.sublocationId === sub.id)?.quantity || 0;
//                             return (
//                               <option key={sub.id} value={sub.id}>
//                                 {sub.name} ({binStock} avail)
//                               </option>
//                             );
//                           })}
//                         </select>

//                         <div className="flex flex-col gap-1 px-1 min-h-[14px]">
//                           {isChecked ? (
//                             <>
//                               <div className="flex items-center justify-between text-[10px] font-mono">
//                                 <span className="text-amber-600 font-medium">
//                                   Total Source Avail: <strong>{totalAvailableSource}</strong> units
//                                 </span>
//                               </div>
//                               {config.sourceAllocations.length > 1 && (
//                                 <div className="text-[9px] bg-amber-500/10 text-amber-700 dark:text-amber-400 p-1.5 rounded border border-amber-500/20 space-y-0.5">
//                                   <span className="font-semibold block">Multi-Bin Auto Allocation:</span>
//                                   {config.sourceAllocations.map((alloc) => {
//                                     const subName =
//                                       departureSublocations.find((s) => s.id === alloc.sublocationId)?.name ||
//                                       "Floor / Bulk Area";
//                                     return (
//                                       <div key={alloc.sublocationId || "bulk"} className="flex justify-between">
//                                         <span>• {subName}</span>
//                                         <span className="font-mono font-bold">{alloc.quantity} qty</span>
//                                       </div>
//                                     );
//                                   })}
//                                 </div>
//                               )}
//                             </>
//                           ) : (
//                             <span className="text-[9px] text-muted-foreground/60 italic">
//                               Select product to configure
//                             </span>
//                           )}
//                         </div>
//                       </div>

//                       {/* Target Area */}
//                       <div className="col-span-4 space-y-1.5">
//                         <select
//                           disabled={!isChecked || isOutOFStock}
//                           value={config.targetSublocationId}
//                           onChange={(e) =>
//                             setRowConfigs((prev) => ({
//                               ...prev,
//                               [product.inflowId]: {
//                                 ...prev[product.inflowId],
//                                 targetSublocationId: e.target.value,
//                               },
//                             }))
//                           }
//                           className="w-full text-xs h-8 rounded-md border border-input bg-background px-1 focus:outline-hidden disabled:opacity-40"
//                         >
//                           <option value="">Floor / Bulk Area</option>
//                           {arrivalSublocations.map((sub) => {
//                             const selfCollision =
//                               sourceLocationId === targetLocationId &&
//                               sub.id === primarySourceSubId;
//                             return !selfCollision ? (
//                               <option key={sub.id} value={sub.id}>
//                                 {sub.name}
//                               </option>
//                             ) : null;
//                           })}
//                         </select>

//                         <div className="flex items-center gap-1.5 px-1 min-h-[14px]">
//                           {isChecked ? (
//                             <span className="text-[10px] font-mono text-blue-600 font-medium">
//                               Current Target Stock:{" "}
//                               <strong>
//                                 {getTargetStockValue(item, config.targetSublocationId)}
//                               </strong>{" "}
//                               units
//                             </span>
//                           ) : null}
//                         </div>
//                       </div>

//                       {/* Quantity Input Field */}
//                       <div className="col-span-1">
//                         <Input
//                           type="number"
//                           step="any"
//                           min="0.0001"
//                           disabled={!isChecked || isOutOFStock}
//                           value={config.quantity}
//                           onChange={(e) => handleQuantityChange(item, e.target.value)}
//                           className={`text-xs h-8 font-mono text-right p-1 ${
//                             Number(config.quantity) > totalAvailableSource
//                               ? "border-destructive text-destructive bg-destructive/10 focus-visible:ring-destructive font-bold"
//                               : ""
//                           }`}
//                           placeholder="1"
//                         />
//                         {isChecked && Number(config.quantity) > totalAvailableSource && (
//                           <span className="text-[9px] text-destructive font-semibold block text-right mt-1">
//                             Exceeds stock!
//                           </span>
//                         )}
//                       </div>
//                     </div>
//                   );
//                 })
//               )}
//             </ScrollArea>
//           </div>
//         </div>

//         <div className="p-3 border-t bg-muted/20 flex items-center justify-end gap-2 shrink-0">
//           <Button variant="ghost" size="sm" onClick={onClose} className="text-xs h-8">
//             Cancel
//           </Button>
//           <Button size="sm" onClick={handleValidateAndCommit} className="text-xs h-8 min-w-[140px]">
//             {editingLineIndex !== null
//               ? "Save Changes"
//               : `Add ${selectedProductIds.length} Selected Line(s)`}
//           </Button>
//         </div>
//       </DialogContent>
//     </Dialog>
//   );
// }



  // useEffect(() => {
  //   if (isOpen) {
  //     const initialConfigs: Record<string, InlineConfig> = {};

  //     productMatrix.forEach((item) => {
  //       initialConfigs[item.product.inflowId] = {
  //         productId: item.product.inflowId,
  //         sourceAllocations: [{ sublocationId: "", quantity: 1 }],
  //         targetSublocationId: "",
  //         quantity: 1,
  //       };
  //     });

  //     if (editingLineIndex !== null && existingLines[editingLineIndex]) {
  //       const currentLine = existingLines[editingLineIndex];
  //       setSelectedProductIds([currentLine.productId]);

  //       const allocations: SourceAllocation[] = Array.isArray(currentLine.sourceAllocations)
  //         ? currentLine.sourceAllocations
  //         : [{ sublocationId: currentLine.sourceSublocationId || "", quantity: Number(currentLine.quantity) || 1 }];

  //       initialConfigs[currentLine.productId] = {
  //         productId: currentLine.productId,
  //         sourceAllocations: allocations,
  //         targetSublocationId: currentLine.targetSublocationId || "",
  //         quantity: Number(currentLine.quantity) || 1,
  //       };
  //     } else {
  //       setSelectedProductIds([]);
  //       if (searchQuery !== "") setSearchQuery("");
  //     }

  //     existingLines.forEach((line) => {
  //       initialConfigs[line.productId] = {
  //         productId: line.productId,
  //         sourceAllocations:
  //           line.sourceAllocations ??
  //           [
  //             {
  //               sublocationId: line.sourceSublocationId ?? "",
  //               quantity: Number(line.quantity),
  //             },
  //           ],
  //         targetSublocationId: line.targetSublocationId ?? "",
  //         quantity: Number(line.quantity),
  //       };
  //     });

  //     setRowConfigs(initialConfigs);
  //     setValidationError("");
  //   }
  // }, [isOpen, editingLineIndex, existingLines, productMatrix]);


  // const handleValidateAndCommit = () => {
  //   if (selectedProductIds.length === 0) {
  //     return setValidationError("Please select at least one product line.");
  //   }

  //   const payload: any[] = [];

  //   for (const prodId of selectedProductIds) {
  //     const item = productMatrix.find((m) => m.product.inflowId === prodId);
  //     const config = rowConfigs[prodId];
  //     const qtyNum = Number(config?.quantity);
  //     const prodName = item?.product.name || prodId;

  //     if (!config || !qtyNum || qtyNum <= 0) {
  //       return setValidationError(`Allocated quantity for "${prodName}" must be greater than zero.`);
  //     }

  //     const totalAvailableStock = item?.stocks.source.quantityAvailable || 0;
  //     if (qtyNum > totalAvailableStock) {
  //       return setValidationError(
  //         `Requested quantity (${qtyNum}) exceeds available stock (${totalAvailableStock}) for "${prodName}".`
  //       );
  //     }

  //     // DO NOT pass `id` into this payload. Let RHF handle the mapping during update().
  //     payload.push({
  //       productId: prodId,
  //       sourceSublocationId: config.sourceAllocations[0]?.sublocationId || "",
  //       sourceAllocations: config.sourceAllocations,
  //       targetSublocationId: config.targetSublocationId || "",
  //       quantity: qtyNum,
  //     });
  //   }

  //   setValidationError("");

  //   if (editingLineIndex !== null) {
  //     onSave(payload[0]);
  //   } else {
  //     onSave(payload);
  //   }
  // };
