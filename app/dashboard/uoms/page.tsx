// app/admin/uoms/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, Scale, ArrowRightLeft, Edit3, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface ConversionMap {
  factor: number;
  targetCode: string;
  targetName: string;
}

interface UomRow {
  id: string;
  code: string;
  name: string;
  category: "COUNT" | "WEIGHT" | "VOLUME" | "LENGTH" | "AREA";
  baseFactor: number;
  isActive: boolean;
  dependentProductsCount: number;
  explicitConversions: ConversionMap[];
}

export default function UomsListPage() {
  const [uoms, setUoms] = useState<UomRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchUnits = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/admin/uoms/list");
      if (res.ok) {
        const data = await res.json();
        setUoms(data);
      }
    } catch (err) {
      toast.error("Data Hydration Interrupted", { description: "Could not safely fetch logistics units master map indices." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUnits();
  }, []);

  const handleDelete = async (id: string, code: string, productCount: number) => {
    if (productCount > 0) {
      toast.error("Constraint Violation", { 
        description: `Cannot drop unit [${code}]. It is actively bound to ${productCount} SKU items lines parameters.` 
      });
      return;
    }

    if (!confirm(`Are you certain you want to remove the tracking configuration card for unit "${code}"?`)) return;

    try {
      const res = await fetch("/api/admin/uoms", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) throw new Error();
      toast.success(`Unit ${code} pruned cleanly`);
      setUoms(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      toast.error("Pipeline Sync Failure", { description: "Database rejected command structural constraints rules drop." });
    }
  };

  const filteredUoms = uoms.filter(u => {
    const term = searchQuery.toLowerCase().trim();
    return u.code.toLowerCase().includes(term) || u.name.toLowerCase().includes(term) || u.category.toLowerCase().includes(term);
  });

  const getCategoryBadgeStyle = (category: string) => {
    switch(category) {
      case "COUNT": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "WEIGHT": return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "VOLUME": return "bg-purple-500/10 text-purple-600 border-purple-500/20";
      default: return "bg-slate-500/10 text-slate-600 border-slate-500/20";
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      
      {/* Upper Navigation Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Scale className="w-5 h-5 text-primary" /> Units of Measure (UOM)
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure core operational scales multipliers parameters used for packing profiles, sales channels conversion, and tracking stock limits.
          </p>
        </div>
        <Button asChild size="sm" className="gap-1.5 shrink-0 text-xs">
          <Link href="/dashboard/uoms/create">
            <Plus className="w-4 h-4" /> Provision Metric Unit
          </Link>
        </Button>
      </div>

      {/* Control Utility Toolbar */}
      <div className="w-full sm:max-w-xs relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/70" />
        <Input
          placeholder="Filter metrics by symbol, category name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 text-xs h-9"
        />
      </div>

      {/* Core Matrix Storage Grid Display wrapper */}
      {isLoading ? (
        <div className="p-20 text-center text-xs text-muted-foreground bg-card border rounded-xl italic animate-pulse">
          Parsing logistics system unit calculation metrics arrays...
        </div>
      ) : filteredUoms.length === 0 ? (
        <div className="p-20 text-center text-xs text-muted-foreground border-dashed border-2 rounded-xl bg-card">
          No metrics configuration entries tracked matching current query tokens criteria.
        </div>
      ) : (
        <div className="border rounded-xl bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-muted/30 border-b text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="p-4 pl-5 w-[110px]">Symbol Code</th>
                  <th className="p-4 w-[180px]">Display Unit Name</th>
                  <th className="p-4 w-[130px]">Domain Domain</th>
                  <th className="p-4 text-right w-[140px]">Base Scalar Factor</th>
                  <th className="p-4">Explicit Translation Intersections Overrides</th>
                  <th className="p-4 text-center w-[90px]">Status</th>
                  <th className="p-4 text-right pr-5 w-[100px]">Actions Matrix</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredUoms.map((unit) => (
                  <tr key={unit.id} className="hover:bg-muted/5 transition-colors">
                    
                    {/* Unique Identifier Token String column */}
                    <td className="p-4 pl-5 font-mono font-bold text-foreground tracking-wide text-sm">
                      {unit.code}
                    </td>

                    {/* Descriptive Display Title designation string */}
                    <td className="p-4 font-medium text-foreground">
                      {unit.name}
                    </td>

                    {/* Physics Metrology Category Flag block */}
                    <td className="p-4">
                      <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-tight px-2 py-0.5 ${getCategoryBadgeStyle(unit.category)}`}>
                        {unit.category}
                      </Badge>
                    </td>

                    {/* Multiplication calculation base factor coefficient text scale */}
                    <td className="p-4 text-right font-mono text-muted-foreground font-semibold">
                      {unit.baseFactor.toFixed(6)}
                    </td>

                    {/* Translation pathways hover blocks rendering matrix strings components lists */}
                    <td className="p-4">
                      {unit.explicitConversions.length === 0 ? (
                        <span className="text-[10px] text-muted-foreground/50 italic font-normal">Root Baseline Standard</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 max-w-xs md:max-w-md">
                          {unit.explicitConversions.map((conv, idx) => (
                            <div 
                              key={idx} 
                              className="inline-flex items-center gap-1 bg-muted/60 border rounded-md px-1.5 py-0.5 text-[10px] text-muted-foreground font-medium"
                              title={`1 ${unit.code} transforms into ${conv.factor} ${conv.targetCode} (${conv.targetName})`}
                            >
                              <ArrowRightLeft className="w-2.5 h-2.5 text-muted-foreground/60" />
                              <span>➔ <span className="font-mono font-bold text-foreground">{conv.targetCode}</span> ({conv.factor})</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Active routing conditional visibility flag row */}
                    <td className="p-4 text-center">
                      <div className="flex justify-center">
                        {unit.isActive ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Active catalog unit selection parameter target block</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <XCircle className="w-4 h-4 text-slate-300" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Suspended / Disabled metric tracking index card item</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </td>

                    {/* Modification trigger components handlers panel keys layout block row */}
                    <td className="p-4 pr-5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                          <Link href={`/dashboard/uoms/${unit.id}/edit`}>
                            <Edit3 className="w-3.5 h-3.5" />
                          </Link>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDelete(unit.id, unit.code, unit.dependentProductsCount)}
                          disabled={unit.dependentProductsCount > 0}
                          className={`h-8 w-8 ${
                            unit.dependentProductsCount > 0 
                              ? "text-muted-foreground/30 cursor-not-allowed opacity-50" 
                              : "text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                          }`}
                          title={unit.dependentProductsCount > 0 ? `Locked: Bound to ${unit.dependentProductsCount} product configurations.` : "Prune metric allocation profile card."}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}