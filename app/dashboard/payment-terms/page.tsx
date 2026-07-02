// app/admin/payment-terms/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, Scale, Edit3, Trash2, CheckCircle2, XCircle, CalendarClock, ShieldAlert, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Tooltip, TooltipTrigger,TooltipContent } from "@/components/ui/tooltip";
import { DeleteButton } from "@/components/shared/delete-button";

interface PaymentTermRow {
  id: string;
  inflowId: string;
  name: string;
  daysDue: number | null;
  isActive: boolean;
  customerUsageCount: number;
  vendorUsageCount: number;
  salesOrderUsageCount: number;
  cumulativeDependencies: number;
}

export default function PaymentTermsListPage() {
  const [terms, setTerms] = useState<PaymentTermRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchPaymentTerms = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/admin/payment-terms/list");
      if (res.ok) {
        const payload = await res.json();
        setTerms(payload);
      }
    } catch (err) {
      toast.error("Hydration Interrupted", { description: "Failed resolving organizational credit frameworks models." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentTerms();
  }, []);

  const handlePrunePaymentTerm = async (id: string, inflowId: string, name: string, totalDependencies: number) => {
    if (totalDependencies > 0) {
      toast.error("Relational Constraint Alarm", {
        description: `Maturity framework "${name}" is locked. It coordinates ${totalDependencies} active client ledgers, trade creditor nodes, or historical logistics orders blocks.`
      });
      return;
    }

    if (!confirm(`Are you entirely certain you want to soft-delete payment rule template "${name}"?`)) return;

    try {
      const res = await fetch("/api/admin/payment-terms", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inflowId }),
      });

      if (!res.ok) throw new Error();
      toast.success("Maturity framework decoupled safely");
      setTerms((prev) => prev.filter((t) => t.inflowId !== inflowId));
    } catch (err) {
      toast.error("Instruction Terminated", { description: "Database transaction block rejected structural deletion sequence rules." });
    }
  };

  const filteredTerms = terms.filter((t) => {
    const term = searchQuery.toLowerCase().trim();
    return t.name.toLowerCase().includes(term) || t.inflowId.toLowerCase().includes(term);
  });

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6 text-xs">
      
      {/* Upper Context Control Toolbar Section Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Scale className="w-5 h-5 text-primary" /> Credit Maturity Rules Registry
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure temporal boundaries variables for invoicing, establish cash-on-delivery flags patterns, map automated system sync metrics keys, and evaluate active sub-ledger dependencies indexes.
          </p>
        </div>
        <Button asChild size="sm" className="gap-1.5 shrink-0 text-xs">
          <Link href="/dashboard/payment-terms/create">
            <Plus className="w-4 h-4" /> Instantiate Payment Rule
          </Link>
        </Button>
      </div>

      {/* Lookup filter search control bar strip */}
      <div className="w-full sm:max-w-xs relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/70" />
        <Input
          placeholder="Filter settlement terms by title name, integration ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 text-xs h-9"
        />
      </div>

      {/* Main Framework Table Canvas Container Component */}
      {isLoading ? (
        <div className="p-20 text-center text-xs text-muted-foreground bg-card border rounded-xl shadow-3xs italic animate-pulse">
          Parsing corporate financial aging properties configurations and unpacking payment terms models lists tables...
        </div>
      ) : filteredTerms.length === 0 ? (
        <div className="p-20 text-center text-xs text-muted-foreground border-dashed border-2 rounded-xl bg-card">
          No registered payment credit parameters vectors matched target layout criteria.
        </div>
      ) : (
        <div className="border rounded-xl bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/30 border-b text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="p-4 pl-5 w-[240px]">Maturity Framework Profile</th>
                  <th className="p-4 w-[180px]">Receivables Aging Threshold Window</th>
                  <th className="p-4 text-right w-[130px]">Bound Debtors</th>
                  <th className="p-4 text-right w-[130px]">Trade Creditors</th>
                  <th className="p-4 text-right w-[130px]">Live Orders Logs</th>
                  <th className="p-4 text-center w-[90px]">Status</th>
                  <th className="p-4 text-right pr-5 w-[100px]">Controls Matrix</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-xs font-medium">
                {filteredTerms.map((term) => (
                  <tr key={term.id} className="hover:bg-muted/5 transition-colors">
                    
                    {/* Public Designation Title Identity Cell Block */}
                    <td className="p-4 pl-5">
                      <div className="font-semibold text-foreground text-[13px] leading-snug">{term.name}</div>
                    </td>

                    {/* Window Day Delay Limit Measurement Parameter Data Field */}
                    <td className="p-4">
                      {term.daysDue !== null ? (
                        <div className="text-foreground font-bold flex items-center gap-1 font-mono text-[13px]">
                          <CalendarClock className="w-4 h-4 text-primary shrink-0" />
                          <span>{term.daysDue} <span className="text-[10px] text-muted-foreground font-sans font-medium">Calendar Days</span></span>
                        </div>
                      ) : (
                        <div className="text-amber-600 font-bold flex items-center gap-1 tracking-tight">
                          <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0" /> Due On Receipt (COD)
                        </div>
                      )}
                    </td>

                    {/* Customer Portfolio Mapped Quantities Counter Weight */}
                    <td className="p-4 text-right font-mono pr-6 text-slate-600">
                      {term.customerUsageCount.toLocaleString()}
                    </td>

                    {/* Vendor Directory Mapped Quantities Counter Weight */}
                    <td className="p-4 text-right font-mono pr-6 text-slate-600">
                      {term.vendorUsageCount.toLocaleString()}
                    </td>

                    {/* Active Logistics Invoicing Pipeline Orders Instances Counter Weight */}
                    <td className="p-4 text-right pr-6">
                      <div className="inline-flex items-center gap-1 font-mono font-bold text-slate-700 bg-muted/60 border rounded-md px-2 py-0.5">
                        <span>{term.salesOrderUsageCount.toLocaleString()}</span>
                      </div>
                    </td>

                    {/* Logical Active Switch Visualization State Icon Node */}
                    <td className="p-4 text-center">
                      <div className="flex justify-center">
                        <Tooltip>
                          <TooltipTrigger asChild>
                          {term.isActive ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : (
                              <XCircle className="w-4 h-4 text-slate-300" />
                          )}
                          </TooltipTrigger>
                          <TooltipContent>
                          <p>{term.isActive ? "Active billing routing standard enabled" : "Suspended temporal matrix configuration"}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </td>

                    {/* Commands modifiers adjustments triggers buttons panel strip handles */}
                    <td className="p-4 pr-5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                          <Link href={`/dashboard/payment-terms/${term.id}/edit`}>
                            <Edit3 className="w-3.5 h-3.5" />
                          </Link>
                        </Button>
                        <DeleteButton
                          itemId={term.id} 
                          itemName={term.name} 
                          endpointUrl={`/api/admin/payment-terms/${term.id}`}
                          onSuccess={(id) => {
                              setTerms(prev => prev.filter(t => t.id !== id));
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