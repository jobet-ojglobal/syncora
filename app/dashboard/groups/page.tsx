// app/admin/groups/page.tsx
"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, Layers, Settings2, Package, Edit3, Trash2, Eye, EyeOff, ChevronDown, ChevronRight, ArrowUpRight, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { DeleteButton } from "@/components/shared/delete-button";
import PageHeader from "@/components/layout/dashboard/PageHeader";
import Image from "next/image";

interface LinkedSkuItem {
  variantId: string;
  productId: string;
  skuCode: string;
  productName: string;
}

interface ProductGroupRow {
  id: string;
  inflowId: string;
  thumbnail: string | null;
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
      <PageHeader 
        className="border-b pb-5"
        title="Matrix Product Groupings" 
        description="Organize loose warehouse inventory stock keeping units into dynamic variable customer arrays."
        icon={Layers}
        >
        <Button asChild size="sm" className="gap-1.5 shrink-0 text-xs">
          <Link href="/dashboard/groups/create">
            <Plus className="w-4 h-4" /> Assemble Group Matrix
          </Link>
        </Button>
      </PageHeader>

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
                  <th className="p-4 pl-5 w-[40px]"></th>
                  <th className="p-4 w-[40px]">Image</th>
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
                { filteredGroups.map((group) => (
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

interface ExpandableGroupRowProps {
  group: ProductGroupRow;
  onToggleActive: (inflowId: string, currentStatus: boolean) => Promise<void>;
  onDeleteGroup: (inflowId: string) => Promise<void>;
}

export function ExpandableGroupRow({ group, onToggleActive, onDeleteGroup }: ExpandableGroupRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Fragment key={group.id}>
      <tr className={`border-b transition-colors hover:bg-muted/30 ${isExpanded ? "bg-muted/50" : ""}`}>
        
        {/* Toggle Expand Icon */}
        <td className="p-4 pl-5 text-center">
          {group.linkedSkus.length > 0 ? (
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded-md hover:bg-background border border-transparent hover:border-border text-muted-foreground hover:text-foreground transition-all"
              title={isExpanded ? "Collapse SKU variants" : "Expand SKU variants"}
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          ) : (
            <div className="h-4 w-4" />
          )}
        </td>

        <td className="">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-muted overflow-hidden">
            {group.thumbnail ? (
              <Image
                src={group.thumbnail}
                alt={group.name || "Product Image"}
                fill
                sizes="40px"
                className="object-cover"
                unoptimized // Use if referencing raw external URL addresses directly
              />
            ) : (
              <ImageOff className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </td>

        {/* Identity & Slug Handle */}
        <td className="p-4 font-medium max-w-[200px]">
          <div className="font-semibold text-foreground text-sm truncate">{group.name}</div>
          <div className="font-mono text-xs text-muted-foreground mt-0.5 truncate">
            /{group.slug}
          </div>
        </td>

        {/* Category Badge */}
        <td className="p-4 text-muted-foreground">
          <Badge variant="outline" className="bg-background text-xs font-normal max-w-[140px] truncate shadow-2xs">
            {group.categoryName}
          </Badge>
        </td>

        {/* Brand Meta Data */}
        <td className="p-4 text-muted-foreground truncate max-w-[140px]">
          {group.brandName || <span className="text-muted-foreground/40">—</span>}
        </td>

        {/* Option Attributes Count */}
        <td className="p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
            <Settings2 className="h-4 w-4 text-muted-foreground/70" />
            <span className="font-mono text-sm font-semibold text-foreground">{group.optionsCount}</span>
          </div>
        </td>

        {/* Variant Tally */}
        <td className="p-4 text-center">
          <div className="flex items-center justify-center gap-1.5">
            <Package className="h-4 w-4 text-primary/70" />
            <span className="font-mono text-xs font-semibold text-foreground  px-2 py-0.5 rounded-md border border-primary/20">
              {group.linkedSkus.length}
            </span>
          </div>
        </td>

        {/* Visibility Toggle Switch */}
        <td className="p-4 text-center">
          <div className="flex items-center justify-center gap-2.5">
            <Switch 
              checked={group.isActive} 
              onCheckedChange={() => onToggleActive(group.inflowId, group.isActive)}
              className="scale-90"
            />
            <span className="text-xs w-10 text-left font-medium">
              {group.isActive ? (
                <span className="text-emerald-600 flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> Live</span>
              ) : (
                <span className="text-muted-foreground/70 flex items-center gap-1"><EyeOff className="h-3.5 w-3.5" /> Off</span>
              )}
            </span>
          </div>
        </td>

        {/* Action Controls Matrix */}
        <td className="p-4 pr-5 text-right">
          <div className="flex items-center justify-end gap-1">
            <Button 
              asChild 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-muted-foreground hover:text-foreground" 
              title="Edit Group"
            >
              <Link href={`/dashboard/groups/${group.id}/edit`}>
                <Edit3 className="h-4 w-4" />
              </Link>
            </Button>
            <DeleteButton
              itemId={group.inflowId}
              itemName={group.name}
              endpointUrl={`/api/admin/groups/${group.inflowId}`}
              onSuccess={() => onDeleteGroup(group.inflowId)}
              variant="icon"
            />
          </div>
        </td>
      </tr>

      {/* Nested Expansion Content Grid */}
      {isExpanded && group.linkedSkus.length > 0 && (
        <tr className="bg-muted/20 border-b">
          <td colSpan={8} className="p-4 pl-14 pr-5 pb-5">
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                <Package className="h-4 w-4 text-muted-foreground" /> 
                <span>Linked SKU Variants</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {group.linkedSkus.map((sku) => (
                  <Link
                    key={sku.variantId}
                    href={`/dashboard/products/${sku.productId}/edit`}
                    className="group bg-background border rounded-lg p-3 flex flex-col justify-between hover:border-primary hover:shadow-xs transition-all text-left"
                    title={`Edit ${sku.productName}`}
                  >
                    <div className="space-y-1.5">
                      <div className="font-mono font-bold text-foreground text-xs flex items-center justify-between">
                        <span className="select-all tracking-tight">{sku.skuCode}</span>
                        <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0 ml-1" />
                      </div>
                      <div className="text-xs text-muted-foreground truncate font-medium group-hover:text-foreground transition-colors">
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
    </Fragment>
  );
}