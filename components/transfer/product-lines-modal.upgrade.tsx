import React, { useState, useEffect, useMemo } from "react";
import { ArrowRightLeft, Search, CheckCircle2, Circle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

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
  const [sourceSubId, setSourceSubId] = useState("");
  const [targetSubId, setTargetSubId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [validationError, setValidationError] = useState("");

  const departureSublocations = sublocations.filter(s => s.locationId === sourceLocationId);
  const arrivalSublocations = sublocations.filter(s => s.locationId === targetLocationId);

  // Filter catalog list items based on query strings
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const lowerQuery = searchQuery.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(lowerQuery) ||
      p.inflowId.toLowerCase().includes(lowerQuery)
    );
  }, [products, searchQuery]);

  // Synchronize dynamic entries on change events
  useEffect(() => {
    if (isOpen) {
      if (editingLineIndex !== null && existingLines[editingLineIndex]) {
        const currentLine = existingLines[editingLineIndex];
        setSelectedProductIds([currentLine.productId]);
        setSourceSubId(currentLine.sourceSublocationId || "");
        setTargetSubId(currentLine.targetSublocationId || "");
        setQuantity(Number(currentLine.quantity) || 1);
      } else {
        setSelectedProductIds([]);
        setSourceSubId("");
        setTargetSubId("");
        setQuantity(1);
        setSearchQuery("");
      }
      setValidationError("");
    }
  }, [isOpen, editingLineIndex, existingLines]);

  const handleToggleProduct = (id: string) => {
    if (editingLineIndex !== null) {
      setSelectedProductIds([id]);
      return;
    }
    setSelectedProductIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    const unfilteredIds = filteredProducts.map(p => p.inflowId);
    const allSelected = unfilteredIds.every(id => selectedProductIds.includes(id));

    if (allSelected) {
      setSelectedProductIds(prev => prev.filter(id => !unfilteredIds.includes(id)));
    } else {
      setSelectedProductIds(prev => Array.from(new Set([...prev, ...unfilteredIds])));
    }
  };

  const handleValidateAndCommit = () => {
    if (selectedProductIds.length === 0) {
      return setValidationError("Please pick at least one product component reference selection.");
    }
    if (quantity <= 0) {
      return setValidationError("Transfer distribution volumes must exceed zero.");
    }

    const duplicates: string[] = [];
    const payload: any[] = [];

    for (const prodId of selectedProductIds) {
      const isDuplicate = existingLines.some((line, index) => {
        if (index === editingLineIndex) return false;
        return (
          line.productId === prodId &&
          (line.sourceSublocationId || "") === sourceSubId &&
          (line.targetSublocationId || "") === targetSubId
        );
      });

      if (isDuplicate) {
        const pName = products.find(p => p.inflowId === prodId)?.name || prodId;
        duplicates.push(pName);
      } else {
        payload.push({
          productId: prodId,
          sourceSublocationId: sourceSubId,
          targetSublocationId: targetSubId,
          quantity: Number(quantity),
        });
      }
    }

    if (duplicates.length > 0) {
      return setValidationError(`Conflict warning: The following items are already listed under this specific route matching framework: ${duplicates.join(", ")}`);
    }

    setValidationError("");
    onSave(editingLineIndex !== null ? payload[0] : payload);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        
        <DialogHeader className="p-4 border-b bg-muted/20">
          <DialogTitle className="text-sm font-semibold flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-primary" />
            {editingLineIndex !== null ? "Modify Route Parameters" : "Batch Consignment Routing Selector"}
          </DialogTitle>
        </DialogHeader>

        {validationError && (
          <div className="mx-4 mt-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg font-medium">
            {validationError}
          </div>
        )}

        <div className="p-4 space-y-4 flex-1 overflow-y-auto flex flex-col min-h-0">
          
          {/* Custom Filter Bar Controls */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter catalog metrics by product SKU reference tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs h-9 focus-visible:ring-1"
            />
          </div>

          {/* Clean Selection Ledger Wrapper */}
          <div className="border rounded-xl flex flex-col flex-1 bg-card overflow-hidden min-h-[200px] max-h-[280px]">
            <div className="bg-muted/40 border-b text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-3 py-2 flex items-center justify-between">
              <span>System Catalog Items ({filteredProducts.length} entries matching)</span>
              {editingLineIndex === null && (
                <Button 
                  variant="link" 
                  size="sm" 
                  onClick={handleSelectAllFiltered}
                  className="h-auto p-0 text-[10px] uppercase font-semibold text-primary"
                >
                  Toggle Selection Page
                </Button>
              )}
            </div>

            <ScrollArea className="flex-1 divide-y">
              {filteredProducts.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground font-medium">No results found mapping parameters.</div>
              ) : (
                filteredProducts.map(product => {
                  const isChecked = selectedProductIds.includes(product.inflowId);
                  return (
                    <div
                      key={product.inflowId}
                      onClick={() => handleToggleProduct(product.inflowId)}
                      className={`p-3 text-xs flex items-center gap-3 cursor-pointer transition-colors select-none group border-b last:border-0 ${
                        isChecked ? "bg-primary/5" : "hover:bg-muted/50"
                      }`}
                    >
                      <div className="shrink-0">
                        {isChecked ? (
                          <CheckCircle2 className="w-4 h-4 text-primary fill-primary/10" />
                        ) : (
                          <Circle className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                        )}
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="font-medium text-foreground truncate">{product.name}</span>
                        <span className="text-[10px] text-muted-foreground font-mono mt-0.5">{product.inflowId}</span>
                      </div>
                      {isChecked && <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">Selected</Badge>}
                    </div>
                  );
                })
              )}
            </ScrollArea>
          </div>

          {/* Grid Allocation Select Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-muted-foreground">Source Bin Route Destination</label>
              <select
                value={sourceSubId}
                onChange={(e) => setSourceSubId(e.target.value)}
                className="w-full text-xs h-9 rounded-md border border-input bg-background px-2 focus:outline-hidden focus:ring-1 focus:ring-ring disabled:opacity-50"
              >
                <option value="">Floor / Bulk Area</option>
                {departureSublocations.map(sub => <option key={sub.id} value={sub.id}>{sub.name}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-muted-foreground">Target Bin Route Destination</label>
              <select
                value={targetSubId}
                onChange={(e) => setTargetSubId(e.target.value)}
                className="w-full text-xs h-9 rounded-md border border-input bg-background px-2 focus:outline-hidden focus:ring-1 focus:ring-ring"
              >
                <option value="">Floor / Bulk Area</option>
                {arrivalSublocations.map(sub => {
                  const selfCollision = sourceLocationId === targetLocationId && sub.id === sourceSubId;
                  return !selfCollision ? <option key={sub.id} value={sub.id}>{sub.name}</option> : null;
                })}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-muted-foreground">
              Transfer Volume Quantity {editingLineIndex === null && "(Applies to all checked items)"} *
            </label>
            <Input
              type="number"
              step="0.0001"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="text-xs h-9 font-mono"
              placeholder="Enter transfer value balance multiplier..."
            />
          </div>

        </div>

        {/* Form control action footers */}
        <div className="p-3 border-t bg-muted/20 flex items-center justify-end gap-2 shrink-0">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs h-8">
            Cancel
          </Button>
          <Button 
            size="sm" 
            onClick={handleValidateAndCommit} 
            className="text-xs h-8 min-w-[120px]"
          >
            {editingLineIndex !== null ? "Apply Changes" : `Append ${selectedProductIds.length} Line(s)`}
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}

// USAGE

// {modalOpen && (
// <ProductLineModal
//     isOpen={modalOpen}
//     onClose={() => { setModalOpen(false); setEditingIndex(null); }}
//     products={products}
//     sublocations={sublocations}
//     sourceLocationId={watchedSourceLocId}
//     targetLocationId={watchedTargetLocId}
//     existingLines={fields} 
//     editingLineIndex={editingIndex}
//     onSave={(data) => {
//     if (editingIndex !== null) {
//         // If modifying a single row path, save the direct object structure directly
//         update(editingIndex, data);
//     } else {
//         // If data is returned as an array, push all elements onto useFieldArray lines bulk checklist
//         if (Array.isArray(data)) {
//         data.forEach(item => append(item));
//         } else {
//         append(data);
//         }
//     }
//     setModalOpen(false);
//     setEditingIndex(null);
//     }}
// />
// )}