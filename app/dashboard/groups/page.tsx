// app/admin/groups/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, Layers, Settings2, Package, Edit3, Trash2, Eye, EyeOff, ChevronDown, ChevronRight, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { DeleteButton } from "@/components/shared/delete-button";

interface LinkedSkuItem {
  variantId: string;
  productId: string;
  skuCode: string;
  productName: string;
}

interface ProductGroupRow {
  id: string;
  inflowId: string;
  name: string;
  slug: string;
  isActive: boolean;
  brandName: string;
  categoryName: string;
  optionsCount: number;
  linkedSkus: LinkedSkuItem[];
  createdAt: string;
}

export default function ProductGroupsListPage() {
  const [groups, setGroups] = useState<ProductGroupRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchProductGroups = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/admin/groups/list");
      if (res.ok) {
        const payload = await res.json();
        setGroups(payload);
      }
    } catch (err) {
      toast.error("Network Exception", { description: "Failed assembling parent matrix records indices." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProductGroups();
  }, []);

  const handleDeleteGroup = async (inflowId: string) => {
    setGroups(prev => prev.filter(g => g.inflowId !== inflowId));
  };
  

  const handleToggleActive = async (inflowId: string, currentStatus: boolean) => {
    const nextState = !currentStatus;
    setGroups(prev => prev.map(g => g.inflowId === inflowId ? { ...g, isActive: nextState } : g));

    try {
      const response = await fetch("/api/admin/groups/toggle", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inflowId, isActive: nextState })
      });
      if (!response.ok) throw new Error();
    } catch (err) {
      setGroups(prev => prev.map(g => g.inflowId === inflowId ? { ...g, isActive: currentStatus } : g));
      toast.error("Network sync failed updating listing toggles.");
    }
  };

  const filteredGroups = groups.filter(g => {
    const term = searchQuery.toLowerCase().trim();
    return (
      g.name.toLowerCase().includes(term) ||
      g.categoryName.toLowerCase().includes(term) ||
      g.brandName.toLowerCase().includes(term) ||
      g.linkedSkus.some(s => s.skuCode.toLowerCase().includes(term))
    );
  });

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      
      {/* Upper Navigation Block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" /> Matrix Product Groupings
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Organize loose warehouse inventory stock keeping units into dynamic variable customer arrays.
          </p>
        </div>
        <Button asChild size="sm" className="gap-1.5 shrink-0 text-xs">
          <Link href="/dashboard/groups/create">
            <Plus className="w-4 h-4" /> Assemble Group Matrix
          </Link>
        </Button>
      </div>

      {/* Toolbar Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/70" />
          <Input
            placeholder="Search group label name, brand, or SKU code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs h-9"
          />
        </div>
      </div>

      {/* Master Data Grid Rendering Table */}
      {isLoading ? (
        <div className="p-20 text-center text-xs text-muted-foreground italic bg-card border rounded-xl shadow-2xs">
          Compiling variable dimensional data nodes matrix configurations...
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="p-20 text-center text-xs text-muted-foreground border-dashed border-2 rounded-xl bg-card">
          No variable catalog matrix groups located matching criteria.
        </div>
      ) : (
        <div className="border rounded-xl bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/30 border-b text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="p-4 pl-5 w-[40px]"></th> {/* Toggle carets space */}
                  <th className="p-4 w-[240px]">Group Specification</th>
                  <th className="p-4 w-[140px]">Department</th>
                  <th className="p-4 w-[130px]">Brand</th>
                  <th className="p-4 w-[100px] text-center">Axes</th>
                  <th className="p-4 w-[120px] text-center">SKU Tally</th>
                  <th className="p-4 w-[120px] text-center">Live Status</th>
                  <th className="p-4 w-[100px] text-right pr-5">Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y text-xs divide-border/50">
                {filteredGroups.map((group) => (
                  <ExpandableGroupRow 
                    key={group.id} 
                    group={group} 
                    onToggleActive={handleToggleActive} 
                    onDeleteGroup={handleDeleteGroup} 
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                        📦 SUB-COMPONENT: ROW MANAGER                       */
/* -------------------------------------------------------------------------- */

interface ExpandableGroupRowProps {
  group: ProductGroupRow;
  onToggleActive: (inflowId: string, currentStatus: boolean) => Promise<void>;
  onDeleteGroup: (inflowId: string) => Promise<void>;
}

function ExpandableGroupRow({ group, onToggleActive, onDeleteGroup }: ExpandableGroupRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <tr className={`hover:bg-muted/5 transition-colors ${isExpanded ? "bg-muted/15" : ""}`}>
        
        {/* Toggle Expand Trigger Row Cell */}
        <td className="p-4 pl-5 text-center">
          {group.linkedSkus.length > 0 ? (
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title={isExpanded ? "Collapse SKU items list" : "Expand nested SKU listings details"}
            >
              { isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          ) : (
            <div className="w-4 h-4" /> // Spacing matching offset if empty
          )}
        </td>

        {/* Identity Column */}
        <td className="p-4 font-medium">
          <div className="font-semibold text-foreground text-[13px] truncate">{group.name}</div>
          <div className="font-mono text-[9px] text-muted-foreground mt-0.5 truncate">
            handle: /{group.slug}
          </div>
        </td>

        {/* Category Placement */}
        <td className="p-4 text-muted-foreground">
          <Badge variant="outline" className="text-[10px] bg-muted/10 font-normal max-w-[120px] truncate">
            {group.categoryName}
          </Badge>
        </td>

        {/* Brand Meta Data */}
        <td className="p-4 text-muted-foreground truncate max-w-[120px]">
          {group.brandName}
        </td>

        {/* Dimensions Count Tally */}
        <td className="p-4 text-center">
          <div className="flex items-center justify-center gap-1 text-muted-foreground">
            <Settings2 className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono font-bold text-foreground">{group.optionsCount}</span>
          </div>
        </td>

        {/* Direct linked physical product item variants balance count row */}
        <td className="p-4 text-center">
          <div className="flex items-center justify-center gap-1">
            <Package className="w-3.5 h-3.5 text-primary/60" />
            <span className="font-mono font-extrabold text-foreground bg-primary/5 px-2 py-0.5 rounded-md border border-primary/10">
              {group.linkedSkus.length}
            </span>
          </div>
        </td>

        {/* Visibility Switch */}
        <td className="p-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <Switch 
              checked={group.isActive} 
              onCheckedChange={() => onToggleActive(group.inflowId, group.isActive)}
              className="scale-90"
            />
            <span className="text-[10px] w-8 text-left font-semibold text-muted-foreground">
              {group.isActive ? (
                <span className="text-emerald-600 flex items-center gap-0.5"><Eye className="w-3 h-3" /> Live</span>
              ) : (
                <span className="text-slate-400 flex items-center gap-0.5"><EyeOff className="w-3 h-3" /> Off</span>
              )}
            </span>
          </div>
        </td>

        {/* Controls Actions Column */}
        <td className="p-4 pr-5 text-right">
          <div className="flex items-center justify-end gap-1">
            <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted" title="Modify Group Structure">
              <Link href={`/dashboard/groups/${group.id}/edit`}>
                <Edit3 className="w-3.5 h-3.5" />
              </Link>
            </Button>
            <DeleteButton
                itemId={group.inflowId}
                itemName={group.name}
                endpointUrl={`/api/admin/groups/${group.inflowId}/soft-delete`}
                onSuccess={() => onDeleteGroup(group.inflowId)}
                variant="icon"
            />
          </div>
        </td>
      </tr>

      {/* 🛠️ NESTED EXPANSION DRAWER AREA */}
      {isExpanded && group.linkedSkus.length > 0 && (
        <tr className="bg-muted/20 border-t border-b border-muted">
          <td colSpan={8} className="p-4 pl-12 pr-5">
            <div className="space-y-2 animate-in fade-in duration-150">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5 mb-2">
                <Package className="w-3.5 h-3.5 text-primary" /> Assigned Product Stock Keeping Units Variants Tree Details
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {group.linkedSkus.map((sku) => (
                  <Link
                    key={sku.variantId}
                    href={`/admin/products/edit/${sku.productId}`}
                    className="group bg-background border rounded-lg p-2.5 flex flex-col justify-between hover:border-primary/50 hover:shadow-xs transition-all text-left"
                    title={`Click to open inventory details form configuration dashboard loop for ${sku.productName}`}
                  >
                    <div>
                      <div className="font-mono font-bold text-foreground text-xs select-all flex items-center justify-between">
                        <span>{sku.skuCode}</span>
                        <ArrowUpRight className="w-3 h-3 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-1 truncate font-medium group-hover:text-foreground/90 transition-colors">
                        {sku.productName}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}