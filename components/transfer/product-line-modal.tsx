"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { X, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";

interface StockState {
  locations: Array<{ locationId: string; quantityAvailable: number }>;
  bins: Array<{ sublocationId: string; locationId: string; quantity: number }>;
}

interface LookupItem {
  inflowId: string;
  name: string;
}

interface SublocationLookup {
  id: string;
  name: string;
  locationId: string;
}

interface ProductLineModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: LookupItem[];
  sublocations: SublocationLookup[];
  sourceLocationId: string;
  targetLocationId: string;
  existingLines: any[]; // These must be the actual live fields from useFieldArray
  editingLineIndex: number | null;
  onSave: (data: { productId: string; sourceSublocationId: string; targetSublocationId: string; quantity: number }) => void;
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
  const [productId, setProductId] = useState("");
  const [sourceSubId, setSourceSubId] = useState("");
  const [targetSubId, setTargetSubId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [validationError, setValidationError] = useState("");

  const [stockData, setStockData] = useState<StockState>({ locations: [], bins: [] });
  const [isLoadingStock, setIsLoadingStock] = useState(false);

  const departureSublocations = sublocations.filter(s => s.locationId === sourceLocationId);
  const arrivalSublocations = sublocations.filter(s => s.locationId === targetLocationId);

  // Single source of truth for initialization and state sync on Open/Edit transitions
  useEffect(() => {
    if (isOpen) {
      if (editingLineIndex !== null && existingLines[editingLineIndex]) {
        const currentLine = existingLines[editingLineIndex];
        setProductId(currentLine.productId || "");
        setSourceSubId(currentLine.sourceSublocationId || "");
        setTargetSubId(currentLine.targetSublocationId || "");
        setQuantity(Number(currentLine.quantity) || 1);
      } else {
        // Reset to clean state for fresh additions
        setProductId("");
        setSourceSubId("");
        setTargetSubId("");
        setQuantity(1);
      }
      setValidationError("");
    }
  }, [isOpen, editingLineIndex, existingLines]);

  // Live Metrics fetcher
  useEffect(() => {
    if (!productId) {
      setStockData({ locations: [], bins: [] });
      return;
    }

    async function fetchLiveMetrics() {
      setIsLoadingStock(true);
      try {
        const url = `/api/admin/stocks?productId=${productId}&sourceLocationId=${sourceLocationId}&targetLocationId=${targetLocationId}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setStockData(data);
        }
      } catch (err) {
        console.error("Failed pulling real-time stock metrics:", err);
      } finally {
        setIsLoadingStock(false);
      }
    }

    fetchLiveMetrics();
  }, [productId, sourceLocationId, targetLocationId]);

  const getSourceStock = () => {
    if (isLoadingStock) return "...";
    if (sourceSubId) {
      const binMatch = stockData.bins.find(b => b.sublocationId === sourceSubId);
      return binMatch ? binMatch.quantity : 0;
    }
    const locMatch = stockData.locations.find(l => l.locationId === sourceLocationId);
    return locMatch ? locMatch.quantityAvailable : 0;
  };

  const getTargetStock = () => {
    if (isLoadingStock) return "...";
    if (targetSubId) {
      const binMatch = stockData.bins.find(b => b.sublocationId === targetSubId);
      return binMatch ? binMatch.quantity : 0;
    }
    const locMatch = stockData.locations.find(l => l.locationId === targetLocationId);
    return locMatch ? locMatch.quantityAvailable : 0;
  };

  const handleValidateAndCommit = () => {
    if (!productId) return setValidationError("Please choose a product SKU specification.");
    if (quantity <= 0) return setValidationError("Transfer allocations must exceed zero.");

    // Strict duplicate configuration matching layout 
    const isDuplicate = existingLines.some((line, index) => {
      if (index === editingLineIndex) return false; // Ignore current row if modifying
      
      const matchProduct = line.productId === productId;
      const matchSource = (line.sourceSublocationId || "") === sourceSubId;
      const matchTarget = (line.targetSublocationId || "") === targetSubId;
      
      return matchProduct && matchSource && matchTarget;
    });

    if (isDuplicate) {
      return setValidationError("This exact product configuration pathway is already allocated inside this draft.");
    }

    setValidationError("");
    onSave({
      productId,
      sourceSublocationId: sourceSubId,
      targetSublocationId: targetSubId,
      quantity: Number(quantity),
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-background border rounded-xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="p-4 border-b flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm text-foreground">
              {editingLineIndex !== null ? "Modify Route Metrics" : "Configure Product Allocation Route"}
            </h3>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {validationError && (
            <p className="p-2.5 bg-destructive/10 border border-destructive/20 text-destructive text-[11px] rounded-lg font-medium">
              {validationError}
            </p>
          )}

          <Field>
            <FieldLabel className="text-xs font-semibold">Select Target Product SKU *</FieldLabel>
            <select
              value={productId}
              onChange={(e) => { setProductId(e.target.value); setSourceSubId(""); setTargetSubId(""); }}
              className="w-full text-xs h-9 rounded-md border border-input bg-background px-2 focus-visible:outline-hidden"
            >
              <option value="">-- Search Inventory SKUs --</option>
              {products.map(p => <option key={p.inflowId} value={p.inflowId}>{p.name}</option>)}
            </select>
          </Field>

          {productId && (
            <div className="grid grid-cols-2 gap-3 bg-muted/30 p-3 rounded-lg border">
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-amber-600 flex items-center gap-1">
                  Origin On-Hand
                </p>
                <p className="text-lg font-mono font-bold mt-1 text-foreground">
                  {getSourceStock()} units
                </p>
                <p className="text-[9px] text-muted-foreground mt-0.5">
                  {sourceSubId ? "Available in selected bin" : "Total available at source location"}
                </p>
              </div>
              <div className="border-l pl-3">
                <p className="text-[10px] uppercase font-bold tracking-wider text-blue-600 flex items-center gap-1">
                  Destination Current
                </p>
                <p className="text-lg font-mono font-bold mt-1 text-foreground">
                  {getTargetStock()} units
                </p>
                <p className="text-[9px] text-muted-foreground mt-0.5">
                  {targetSubId ? "Current balance in selected bin" : "Total stock at target location"}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field>
              <FieldLabel className="text-xs">Source Bin Location / Zone</FieldLabel>
              <select
                disabled={!productId}
                value={sourceSubId}
                onChange={(e) => setSourceSubId(e.target.value)}
                className="w-full text-xs h-9 rounded-md border border-input bg-background px-2 focus-visible:outline-hidden disabled:opacity-50"
              >
                <option value="">Floor / Bulk Area</option>
                {departureSublocations.map(sub => <option key={sub.id} value={sub.id}>{sub.name}</option>)}
              </select>
            </Field>

            <Field>
              <FieldLabel className="text-xs">Target Bin Location / Zone</FieldLabel>
              <select
                disabled={!productId}
                value={targetSubId}
                onChange={(e) => setTargetSubId(e.target.value)}
                className="w-full text-xs h-9 rounded-md border border-input bg-background px-2 focus-visible:outline-hidden disabled:opacity-50"
              >
                <option value="">Floor / Bulk Area</option>
                {arrivalSublocations.map(sub => {
                  const selfCollision = sourceLocationId === targetLocationId && sub.id === sourceSubId;
                  return !selfCollision ? <option key={sub.id} value={sub.id}>{sub.name}</option> : null;
                })}
              </select>
            </Field>
          </div>

          <Field>
            <FieldLabel className="text-xs font-semibold">Transfer Volume Quantity *</FieldLabel>
            <Input
              type="number"
              step="0.0001"
              value={quantity}
              disabled={!productId}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="text-xs h-9 text-left font-mono"
              placeholder="Enter transfer count..."
            />
          </Field>
        </div>

        <div className="p-3 border-t bg-muted/10 flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} className="text-xs">
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={handleValidateAndCommit} className="text-xs min-w-[100px]">
            {editingLineIndex !== null ? "Apply Changes" : "Save Component"}
          </Button>
        </div>

      </div>
    </div>
  );
}

// USAGE

{/* Find this block at the bottom of your TransferOrderForm layout */}
// { modalOpen && (
//   <ProductLineModal
//     isOpen={modalOpen}
//     onClose={() => { setModalOpen(false); setEditingIndex(null); }}
//     products={products}
//     sublocations={sublocations}
//     sourceLocationId={watchedSourceLocId}
//     targetLocationId={watchedTargetLocId}
//     existingLines={fields} // <-- Change from watchedLines to fields!
//     editingLineIndex={editingIndex}
//     onSave={(data) => {
//       if (editingIndex !== null) {
//         update(editingIndex, data);
//       } else {
//         append(data);
//       }
//       setModalOpen(false);
//       setEditingIndex(null);
//     }}
//   />
// )}