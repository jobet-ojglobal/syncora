// app/admin/pricing-schemes/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, Tags, Edit3, Trash2, CheckCircle2, XCircle, Users2, Landmark, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { TooltipTrigger, Tooltip, TooltipContent } from "@/components/ui/tooltip";
import { DeleteButton } from "@/components/shared/delete-button";

interface PricingSchemeRow {
  id: string;
  inflowId: string;
  name: string;
  isActive: boolean;
  isDefault: boolean;
  isTaxInclusive: boolean;
  currencyIso: string;
  currencySymbol: string;
  skuPricePointsCount: number;
  customerBindingsCount: number;
}

export default function PricingSchemesListPage() {
  const [schemes, setSchemes] = useState<PricingSchemeRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchPricingSchemes = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/admin/pricing-scheme/list");
      if (res.ok) {
        const payload = await res.json();
        setSchemes(payload);
      }
    } catch (err) {
      toast.error("Hydration Failure", { description: "Failed resolving organizational catalog structural matrix schemas." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPricingSchemes();
  }, []);

  const filteredSchemes = schemes.filter(s => {
    const term = searchQuery.toLowerCase().trim();
    return s.name.toLowerCase().includes(term) || s.inflowId.toLowerCase().includes(term);
  });

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6 text-xs">
      
      {/* Structural view title strip banner component */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Tags className="w-5 h-5 text-primary" /> Pricing Strategies Directory
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Structure unique customer catalogs matrices tier channels, regulate tax pricing calculations thresholds rules variables, and map international trade settlement indices currencies fields.
          </p>
        </div>
        <Button asChild size="sm" className="gap-1.5 shrink-0 text-xs">
          <Link href="/dashboard/pricing-scheme/create">
            <Plus className="w-4 h-4" /> Provision Strategy Tier
          </Link>
        </Button>
      </div>

      {/* Lookup search component utility filter toolbar segment */}
      <div className="w-full sm:max-w-xs relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/70" />
        <Input
          placeholder="Filter schemes by template name, ID index..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 text-xs h-9"
        />
      </div>

      {/* Central data layout directory board canvas */}
      {isLoading ? (
        <div className="p-20 text-center text-xs text-muted-foreground bg-card border rounded-xl shadow-3xs italic animate-pulse">
          Reindexing catalog layout maps and assembling live pricing tier matrices vectors data strings...
        </div>
      ) : filteredSchemes.length === 0 ? (
        <div className="p-20 text-center text-xs text-muted-foreground border-dashed border-2 rounded-xl bg-card">
          No pricing scheme matrices configurations logged matching specified search filters conditions.
        </div>
      ) : (
        <div className="border rounded-xl bg-card shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/30 border-b text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="p-4 pl-5 w-[250px]">Pricing Matrix Setup</th>
                  <th className="p-4 w-[140px]">Settlement Currency</th>
                  <th className="p-4 w-[160px]">Tax Calculation Strategy</th>
                  <th className="p-4 w-[150px] text-right">Mapped SKUs Price-Points</th>
                  <th className="p-4 w-[150px] text-right">Assigned Active Accounts</th>
                  <th className="p-4 text-center w-[90px]">Status</th>
                  <th className="p-4 text-right pr-5 w-[100px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-xs font-medium">
                {filteredSchemes.map((scheme) => (
                  <tr key={scheme.id} className="hover:bg-muted/5 transition-colors">
                    
                    {/* Strategy Display Label Profile Node Column */}
                    <td className="p-4 pl-5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-foreground text-[13px]">{scheme.name}</span>
                        {scheme.isDefault && (
                          <Badge className="text-[9px] bg-primary/10 text-primary hover:bg-primary/10 font-bold border-primary/20 px-1.5 py-0 rounded">
                            Global Baseline
                          </Badge>
                        )}
                      </div>
                      {/* <div className="font-mono text-[9px] text-muted-foreground/60 mt-1 uppercase tracking-wider">
                        {scheme.inflowId}
                      </div> */}
                    </td>

                    {/* Operational settlement trading currency link lookup fields */}
                    <td className="p-4 font-mono font-bold text-foreground">
                      <div className="flex items-center gap-1.5">
                        <span className="bg-muted px-2 py-0.5 border rounded text-[11px]">{scheme.currencyIso}</span>
                        <span className="text-muted-foreground font-normal">({scheme.currencySymbol})</span>
                      </div>
                    </td>

                    {/* Tax inclusion configuration flag text row marker block */}
                    <td className="p-4">
                      {scheme.isTaxInclusive ? (
                        <div className="text-amber-600 font-bold flex items-center gap-1 tracking-tight">
                          <Landmark className="w-3.5 h-3.5" /> Tax-Inclusive Gross Price
                        </div>
                      ) : (
                        <div className="text-slate-500 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-slate-400" /> Standard Subtotal + Tax Net Price
                        </div>
                      )}
                    </td>

                    {/* Quantitative pricing matrix values loaded summary count metric column */}
                    <td className="p-4 text-right font-mono text-foreground font-semibold text-sm pr-6">
                      {scheme.skuPricePointsCount.toLocaleString()}
                    </td>

                    {/* Active dynamic dependency customer accounts relationship metrics count weight item */}
                    <td className="p-4 text-right pr-6">
                      <div className="inline-flex items-center gap-1 justify-end font-mono text-foreground font-bold">
                        <Users2 className="w-3.5 h-3.5 text-muted-foreground/70" />
                        <span>{scheme.customerBindingsCount}</span>
                      </div>
                    </td>

                    {/* Scheme publishing state switch toggle checkbox visualization node */}
                    <td className="p-4 text-center">
                      <div className="flex justify-center">
                        <Tooltip>
                            <TooltipTrigger asChild>
                            {scheme.isActive ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            ) : (
                                <XCircle className="w-4 h-4 text-slate-300" />
                            )}
                            </TooltipTrigger>
                            <TooltipContent>
                            <p>{scheme.isActive ? "Active catalog rule routing profile enabled" : "Suspended / Disabled scheme state visibility"}</p>
                            </TooltipContent>
                        </Tooltip>
                      </div>
                    </td>

                    {/* Standard control triggers action commands buttons grouping stack panel links */}
                    <td className="p-4 pr-5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                          <Link href={`/dashboard/pricing-scheme/${scheme.id}/edit`}>
                            <Edit3 className="w-3.5 h-3.5" />
                          </Link>
                        </Button>
                        <DeleteButton
                          itemId={scheme.id} 
                          itemName={scheme.name} 
                          endpointUrl={`/api/admin/pricing-scheme/${scheme.id}`}
                          onSuccess={(id) => {
                            setSchemes(prev => prev.filter(s => s.id !== id));
                          }} 
                          variant="icon"
                        />
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