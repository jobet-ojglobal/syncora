// app/admin/products/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, Package, Image as ImageIcon, Barcode, CalendarClock, ShieldCheck, HelpCircle, Edit, Kanban, Power, PowerOff, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { DeleteButton } from "@/components/shared/delete-button";

interface ProductCatalogRow {
  id: string;
  inflowId: string;
  sku: string;
  name: string;
  slug: string;
  itemType: string;
  isActive: boolean;
  trackExpiry: boolean;
  trackLots: boolean;
  trackSerials: boolean;
  brandName: string;
  categoryName: string; 
  groupName: string | null;
  thumbnail: string | null;
  barcodesCount: number;
  primaryBarcode: string | null;
  purchasingUomText: string;
  salesUomText: string;
}

export default function ProductsListPage() {
  const [products, setProducts] = useState<ProductCatalogRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/admin/products");
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (err) {
      toast.error("Pipeline Failure", { description: "Failed loading product matrix indices data state." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleToggleActiveState = async (inflowId: string, currentStatus: boolean) => {
    try {
      const response = await fetch("/api/admin/products/toggle", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inflowId, isActive: !currentStatus }),
      });
      if (response.ok) {
        toast.success("Status Synchronized", { description: `Product is now ${!currentStatus ? 'Active' : 'Archived'}.` });
        setProducts(prev => prev.map(p => p.inflowId === inflowId ? { ...p, isActive: !currentStatus } : p));
      }
    } catch (err) {
      toast.error("State Mutation Exception");
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchStr = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(matchStr) ||
      p.sku.toLowerCase().includes(matchStr) ||
      p.brandName.toLowerCase().includes(matchStr) ||
      p.categoryName.toLowerCase().includes(matchStr) || 
      (p.groupName && p.groupName.toLowerCase().includes(matchStr)) ||
      (p.primaryBarcode && p.primaryBarcode.includes(matchStr))
    );
  });

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      
      {/* Upper Navigation / Title Segment */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Product Catalog Matrix</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage global trade line SKUs, nested barcode structures, multi-tier transactional UOM variables, and active tracking variables.
          </p>
        </div>
        <Button asChild size="sm" className="gap-1.5 shrink-0">
          <Link href="/dashboard/products/create">
            <Plus className="w-4 h-4" /> Register New Product
          </Link>
        </Button>
      </div>

      {/* Control Configuration Utility Block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/70" />
          <Input
            placeholder="Search SKU, item text title, brand, or barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        <div className="text-xs text-muted-foreground font-medium bg-muted/40 border px-3 py-1.5 rounded-lg flex items-center gap-2">
          <Kanban className="w-3.5 h-3.5 text-primary" />
          Active Registered Lines: <span className="font-bold text-foreground">{filteredProducts.length}</span>
        </div>
      </div>

      {/* Primary Datagrid Output */}
      {isLoading ? (
        <div className="p-16 text-center text-xs text-muted-foreground italic bg-card border rounded-xl shadow-xs">
          Loading master product collection indices...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="p-16 text-center text-xs text-muted-foreground border-dashed border-2 rounded-xl bg-card">
          No catalog items located matching the input query parameters.
        </div>
      ) : (
        <div className="border rounded-xl bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="p-4 w-[12px]">Status</th>
                  <th className="p-4">SKU Product Variant Spec</th>
                  <th className="p-4 w-[140px]">Department</th>
                  <th className="p-4">Brand / Group</th>
                  <th className="p-4">Primary Code Reference</th>
                  <th className="p-4">Purchasing UOM</th>
                  <th className="p-4">Sales UOM</th>
                  <th className="p-4">Traceability Rules</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y text-xs">
                {filteredProducts.map((product) => {
                  return (
                    <tr key={product.inflowId} className={`hover:bg-muted/10 transition-colors ${!product.isActive ? "opacity-65 bg-muted/5" : ""}`}>
                      
                      {/* Active Status Control Toggle Switch Indicator Column */}
                      <td className="p-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleActiveState(product.inflowId, product.isActive)}
                          title={product.isActive ? "Click to Deactivate Item" : "Click to Activate Item"}
                          className={`p-1.5 rounded-md border transition-colors ${
                            product.isActive 
                              ? "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/20" 
                              : "bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100"
                          }`}
                        >
                          {product.isActive ? <Power className="w-3.5 h-3.5" /> : <PowerOff className="w-3.5 h-3.5" />}
                        </button>
                      </td>

                      {/* Image / Name Grid Box Item */}
                      <td className="p-4 max-w-[280px]">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-muted border rounded-lg overflow-hidden flex items-center justify-center shrink-0 relative">
                            {product.thumbnail ? (
                              <img src={product.thumbnail} alt={product.name} className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon className="w-4 h-4 text-muted-foreground/50" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-foreground block truncate" title={product.name}>
                              {product.name}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded-sm font-semibold text-muted-foreground tracking-tight">
                                {product.sku}
                              </span>
                              <Badge variant="outline" className="text-[9px] h-4 px-1 py-0 uppercase font-normal tracking-wide">
                                {product.itemType}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="p-4 text-muted-foreground">
                        <Badge variant="outline" className="bg-background text-xs font-normal max-w-[140px] truncate shadow-2xs">
                          {product.categoryName}
                        </Badge>
                      </td>

                      {/* Brand Designation Column */}
                      <td className="p-4">
                        <span className="block font-medium text-foreground truncate max-w-[150px]" title={product.brandName}>
                          {product.brandName}
                        </span>
                        {product.groupName && (
                          <span className="block text-[10px] text-muted-foreground truncate max-w-[150px]" title={`Group: ${product.groupName}`}>
                            Collection: {product.groupName}
                          </span>
                        )}
                      </td>

                      {/* Primary Barcode Data Field */}
                      <td className="p-4 font-mono text-muted-foreground">
                        {product.primaryBarcode ? (
                          <div className="flex items-center gap-1">
                            <Barcode className="w-3.5 h-3.5 text-muted-foreground/60" />
                            <span className="text-[11px] font-medium text-foreground">{product.primaryBarcode}</span>
                            {product.barcodesCount > 1 && (
                              <span className="text-[9px] bg-blue-50 text-blue-600 border border-blue-100 px-1 rounded-sm">
                                +{product.barcodesCount - 1}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground/40 italic text-[11px]">No GTIN mapped</span>
                        )}
                      </td>

                      {/* Procurement Unit Conversion Rules Text */}
                      <td className="p-4 text-muted-foreground font-medium font-mono text-[11px]">
                        {product.purchasingUomText}
                      </td>

                      {/* Sales Channels Conversion Matrix Output */}
                      <td className="p-4 text-muted-foreground font-medium font-mono text-[11px]">
                        {product.salesUomText}
                      </td>

                      {/* Traceability Rules Control Summary Badges Grid column */}
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1 max-w-[150px]">
                          {product.trackLots && (
                            <Badge className="bg-purple-50 text-purple-600 hover:bg-purple-50 border border-purple-200 text-[9px] py-0 h-4 px-1">
                              LOTS
                            </Badge>
                          )}
                          {product.trackSerials && (
                            <Badge className="bg-indigo-50 text-indigo-600 hover:bg-indigo-50 border border-indigo-200 text-[9px] py-0 h-4 px-1">
                              SERIALS
                            </Badge>
                          )}
                          {product.trackExpiry && (
                            <Badge className="bg-amber-50 text-amber-600 hover:bg-amber-50 border border-amber-200 text-[9px] py-0 h-4 px-1 inline-flex items-center gap-0.5">
                              <CalendarClock className="w-2.5 h-2.5" /> EXPIRY
                            </Badge>
                          )}
                          {!product.trackLots && !product.trackSerials && !product.trackExpiry && (
                            <span className="text-[10px] text-muted-foreground/50 flex items-center gap-1 italic">
                              <ShieldCheck className="w-3 h-3 opacity-60 text-emerald-500" /> Standard
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Command Action Buttons Block Column */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted" 
                            title={`Modify ${product.name}`}>
                            <Link href={`/dashboard/products/${product.id}/edit`}>
                              <Edit3 className="w-3.5 h-3.5" />
                            </Link>
                          </Button>
                          <DeleteButton
                            itemId={product.id}
                            itemName={product.name}
                            endpointUrl={`/api/admin/products/${product.id}`}
                            onSuccess={fetchProducts}
                            variant="icon"
                          />
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}