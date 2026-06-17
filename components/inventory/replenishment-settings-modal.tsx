// app/dashboard/inventory/components/replenishment-settings-modal.tsx
"use client";

import { useState, useEffect } from "react";
import { Sliders, RefreshCw, AlertCircle, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface LookupLocation {
  id: string;
  inflowId: string;
  name: string;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  locations: LookupLocation[];
  isLoadingLocations: boolean
  inventoryItem: {
    id: string;
    productName: string;
    productSlug: string;
    reorderThreshold: number;
    reorderQuantity: number;
    isAutoReorderEnabled: boolean;
    preferredSourceLocationId: string | null;
  };
  onSaveSuccess: () => void;
}

export function ReplenishmentSettingsModal({ isOpen, onClose, inventoryItem, onSaveSuccess, locations, isLoadingLocations }: ModalProps) {
  const [threshold, setThreshold] = useState(inventoryItem.reorderThreshold.toString());
  const [reorderQty, setReorderQty] = useState(inventoryItem.reorderQuantity.toString());
  const [enabled, setEnabled] = useState(inventoryItem.isAutoReorderEnabled);
  const [sourceLoc, setSourceLoc] = useState(inventoryItem.preferredSourceLocationId || "");
  
  // 📍 New Lookup States

  const [isSaving, setIsSaving] = useState(false);

 

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/inventory/${inventoryItem.id}/replenishment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reorderThreshold: parseFloat(threshold) || 0,
          reorderQuantity: parseFloat(reorderQty) || 0,
          isAutoReorderEnabled: enabled,
          preferredSourceLocationId: sourceLoc || null
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed stock adjustment process allocation.");
      }

      onSaveSuccess();
      onClose();
    } catch (err: any) {
      toast.error("Process Deviation Error", { description: err?.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-card border w-full max-w-md rounded-xl p-5 shadow-lg space-y-4 animate-in zoom-in-95 duration-150">
        
        {/* Header Block */}
        <div className="flex items-center gap-2 border-b pb-3">
          <Sliders className="w-4 h-4 text-blue-500" />
          <div>
            <h3 className="text-sm font-bold text-foreground">Automation Rules Engine</h3>
            <p className="text-[11px] text-muted-foreground font-mono">{inventoryItem.productSlug}</p>
          </div>
        </div>

        {/* Content Configuration Form Fields */}
        <div className="space-y-4 text-xs">
          
          {/* Main Automation Switch toggle */}
          <div className="flex items-center justify-between bg-muted/40 p-3 rounded-lg border">
            <div className="space-y-0.5">
              <span className="font-semibold text-foreground block">Auto-Replenish Orders</span>
              <span className="text-[11px] text-muted-foreground block">Generate pending orders when safety levels breach</span>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Alert Threshold</label>
              <Input 
                type="number" 
                value={threshold} 
                onChange={e => setThreshold(e.target.value)}
                className="text-xs h-8 font-mono" 
                placeholder="0.00"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Reorder Quantity</label>
              <Input 
                type="number" 
                value={reorderQty} 
                onChange={e => setReorderQty(e.target.value)}
                className="text-xs h-8 font-mono" 
                placeholder="0.00"
              />
            </div>
          </div>

          {/* 📍 Swapped Input for a Native Tailwind-Styled Select Dropdown */}
          <div className="space-y-1">
            <label className="font-medium text-muted-foreground">Upstream Distribution Hub</label>
            <select
              value={sourceLoc}
              onChange={(e) => setSourceLoc(e.target.value)}
              disabled={isLoadingLocations}
              className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs transition-colors file:border-0 file:bg-transparent file:text-xs file:font-medium placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-sans"
            >
              <option value="">-- Choose Upstream Target Node --</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.inflowId}>
                  {loc.name}
                </option>
              ))}
            </select>
            {isLoadingLocations && (
              <span className="text-[10px] text-muted-foreground block animate-pulse mt-1">
                Syncing available network nodes...
              </span>
            )}
          </div>

          {enabled && !sourceLoc && (
            <div className="bg-amber-50 text-amber-800 border border-amber-200 rounded-lg p-2.5 text-[11px] flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <span>An Upstream Distribution Hub choice is required to complete automatic routing generation.</span>
            </div>
          )}
        </div>

        {/* Footer Actions Row */}
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSaving} className="text-xs h-8">
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving || (enabled && !sourceLoc)} className="text-xs h-8 gap-1.5">
            {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Automation Settings
          </Button>
        </div>

      </div>
    </div>
  );
}