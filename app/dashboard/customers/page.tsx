// app/admin/customers/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, Building2, UserCheck, ShieldCheck, Landmark, Edit3, Trash2, CheckCircle2, XCircle, ShoppingBag, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DeleteButton } from "@/components/shared/delete-button";

interface FinancialMatrixNode {
  netBalance: number;
  symbol: string;
  isoCode: string;
}

interface CustomerRow {
  id: string;
  inflowId: string;
  legalName: string;
  contactName: string;
  email: string;
  phone: string;
  isActive: boolean;
  regionalScope: string;
  pricingTier: string;
  taxingSchemeName: string;
  salesOrderCount: number;
  financialMetrics: FinancialMatrixNode;
}

export default function CustomersDirectoryListPage() {
  const [directory, setDirectory] = useState<CustomerRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchDirectory = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/admin/customers/list");
      if (res.ok) {
        const payload = await res.json();
        setDirectory(payload);
      }
    } catch (err) {
      toast.error("CRM Sync Breakdown", { description: "Failed assembling active legal customer directories collections rows." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDirectory();
  }, []);

  const handleArchiveCustomer = async (id: string, inflowId: string, legalName: string, orderCount: number) => {
    if (orderCount > 0) {
      toast.error("Relational Constraint Alarm", {
        description: `Customer account "${legalName}" cannot be deleted. Operative tracking file maintains ${orderCount} live historical sales orders line items links.`
      });
      return;
    }

    if (!confirm(`Are you entirely certain you want to soft-delete commercial partner entry "${legalName}"? This action detaches address mapping components layers.`)) return;

    try {
      const res = await fetch("/api/admin/customers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inflowId })
      });

      if (!res.ok) throw new Error();
      toast.success(`Business Account archived safely`);
      setDirectory(prev => prev.filter(c => c.inflowId !== inflowId));
    } catch (err) {
      toast.error("Archival Pipeline Aborted", { description: "Database isolation guard rules aborted processing target deletion script." });
    }
  };

  const filteredDirectory = directory.filter(c => {
    const term = searchQuery.toLowerCase().trim();
    return (
      c.legalName.toLowerCase().includes(term) ||
      c.inflowId.toLowerCase().includes(term) ||
      c.contactName.toLowerCase().includes(term) ||
      c.email.toLowerCase().includes(term)
    );
  });

  return (
    <div className="w-full mx-auto p-6 space-y-6 text-xs">
      
      {/* Structural Upper Control Strip Ribbon */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" /> Commercial Customer Portfolio Ledger
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitor institutional account status lines, coordinate global pricing matrix channels allocations, track localized regional tax metrics compliance, and inspect multi-currency account statements.
          </p>
        </div>
        <Button asChild size="sm" className="gap-1.5 shrink-0 text-xs">
          <Link href="/dashboard/customers/create">
            <Plus className="w-4 h-4" /> Onboard Business Client
          </Link>
        </Button>
      </div>

      {/* Filtering Utility Box bar */}
      <div className="w-full sm:max-w-xs relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/70" />
        <Input
          placeholder="Filter accounts by legal name, POC, system code token..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 text-xs h-9"
        />
      </div>

      {/* Main Core Ledger Table Layout Wrapper */}
      {isLoading ? (
        <div className="p-20 text-center text-xs text-muted-foreground bg-card border rounded-xl shadow-3xs italic animate-pulse">
          Synchronizing transactional sales logs pipelines and indexing corporate sub-ledger customer tables data streams...
        </div>
      ) : filteredDirectory.length === 0 ? (
        <div className="p-20 text-center text-xs text-muted-foreground border-dashed border-2 rounded-xl bg-card">
          No registered institutional customer profiles located matching target search parameter indicators.
        </div>
      ) : (
        <div className="border rounded-xl bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/30 border-b text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="p-4 pl-5 w-[220px]">Legal Entity Partner Profile</th>
                  <th className="p-4 w-[180px]">Point of Contact Coordinator</th>
                  <th className="p-4 w-[150px]">Regional HQ Scope</th>
                  <th className="p-4 w-[140px]">Pricing & Tax Setup Policies</th>
                  <th className="p-4 text-center w-[100px]">Orders Flow</th>
                  <th className="p-4 text-right w-[150px]">Net Accounts Statements Balance</th>
                  <th className="p-4 text-center w-[80px]">Status</th>
                  <th className="p-4 text-right pr-5 w-[100px]">Controls Matrix</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-xs font-medium">
                {filteredDirectory.map((customer) => (
                  <tr key={customer.id} className="hover:bg-muted/5 transition-colors items-start">
                    
                    {/* Legal Corporate Identification Data Frame Cell Block */}
                    <td className="p-4 pl-5">
                      <div className="font-bold text-foreground text-[13px] leading-snug tracking-tight">{customer.legalName}</div>
                    </td>

                    {/* Operational point-of-contact structural fields line coordinates */}
                    <td className="p-4 text-muted-foreground">
                      <div className="text-foreground font-semibold flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-slate-400" /> {customer.contactName}
                      </div>
                      <div className="font-mono text-[10px] select-all mt-0.5 text-muted-foreground/80 lowercase truncate max-w-[170px]" title={customer.email}>
                        {customer.email}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 font-sans font-medium">{customer.phone}</div>
                    </td>

                    {/* Regional Footprint Localization tag block item row */}
                    <td className="p-4 text-slate-600">
                      <div className="flex items-start gap-1 text-[11px] leading-tight">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                        <span>{customer.regionalScope}</span>
                      </div>
                    </td>

                    {/* Governance administrative rules indicators markers checkboxes templates */}
                    <td className="p-4 text-[11px] space-y-1">
                      <div className="flex items-center gap-1 font-semibold text-foreground">
                        <Landmark className="w-3.5 h-3.5 text-slate-400 shrink-0" /> 
                        <span className="truncate max-w-[120px]" title={customer.pricingTier}>{customer.pricingTier}</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground text-[10px]">
                        <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[120px]" title={customer.taxingSchemeName}>{customer.taxingSchemeName}</span>
                      </div>
                    </td>

                    {/* Cumulative Operational Logistics sales order counters weights */}
                    <td className="p-4 text-center">
                      <div className="inline-flex items-center gap-1 font-mono font-bold text-slate-700 bg-muted/60 border rounded-md px-2 py-0.5">
                        <ShoppingBag className="w-3 h-3 text-muted-foreground" />
                        <span>{customer.salesOrderCount}</span>
                      </div>
                    </td>

                    {/* Financial Portfolio Net Balances Statements Calculations block text node */}
                    <td className={`p-4 text-right font-mono font-bold text-sm bg-muted/5 pr-6 ${
                      customer.financialMetrics.netBalance > 0 
                        ? "text-rose-600 bg-rose-500/5" 
                        : customer.financialMetrics.netBalance < 0 
                        ? "text-emerald-600 bg-emerald-500/5"
                        : "text-muted-foreground"
                    }`}>
                      <span>
                        {customer.financialMetrics.netBalance > 0 ? "+" : ""}
                        {customer.financialMetrics.netBalance.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground/60 font-semibold uppercase tracking-wider ml-1">
                        {customer.financialMetrics.isoCode}
                      </span>
                    </td>

                    {/* Operative visibility state check icon badge field block row */}
                    <td className="p-4 text-center">
                      <div className="flex justify-center">
                        <Tooltip>
                          <TooltipTrigger asChild>
                          {customer.isActive ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : (
                              <XCircle className="w-4 h-4 text-slate-300" />
                          )}
                          </TooltipTrigger>
                          <TooltipContent>
                          <p>{customer.isActive ? "Active baseline corporate debtor catalog" : "Suspended / Disabled portfolio card"}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </td>

                    {/* Administrative modifiers switch triggers buttons keys block panel panel element */}
                    <td className="p-4 pr-5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                          <Link href={`/dashboard/customers/${customer.id}/edit`}>
                            <Edit3 className="w-3.5 h-3.5" />
                          </Link>
                        </Button>
                        <DeleteButton
                          itemId={customer.id} 
                          itemName={customer.legalName} 
                          endpointUrl={`/api/admin/customers/${customer.id}`}
                          onSuccess={(id) => {
                            setDirectory(prev => prev.filter(c => c.inflowId !== id));
                          }} 
                          variant="icon"
                        />
                        {/* <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleArchiveCustomer(customer.id, customer.inflowId, customer.legalName, customer.salesOrderCount)}
                          disabled={customer.salesOrderCount > 0}
                          className={`h-8 w-8 ${
                            customer.salesOrderCount > 0 
                              ? "text-muted-foreground/30 cursor-not-allowed opacity-40" 
                              : "text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                          }`}
                          title={customer.salesOrderCount > 0 ? `Locked: Business account points to active operational invoicing pipelines.` : "Archive corporate client partner dossier records node."}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button> */}
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