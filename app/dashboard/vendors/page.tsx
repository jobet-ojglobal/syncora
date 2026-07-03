// app/admin/vendors/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, Truck, Edit3, CheckCircle2, XCircle, AlertTriangle, Boxes, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DeleteButton } from "@/components/shared/delete-button";
import SyncAllVendorsButton from "@/components/vendor/sync-all-vendors-button";

interface VendorRow {
  id: string;
  inflowId: string;
  legalName: string;
  email: string;
  phone: string;
  isActive: boolean;
  catalogItemsCount: number;
  purchaseOrdersCount: number;
  currencyCode: string;
  outstandingBalance: number;
  hasCriticalPastDue: boolean;
}

export default function VendorsListPage() {
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchVendorsDataMatrix = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/admin/vendors/list");
      if (res.ok) {
        const payload = await res.json();
        setVendors(payload);
      }
    } catch (err) {
      toast.error("Hydration Interrupted", { description: "Failed resolving trade creditor directories rows structures." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVendorsDataMatrix();
  }, []);

  // const handleArchiveVendorRecordRow = async (inflowId: string, name: string, openOrders: number) => {
  //   if (openOrders > 0) {
  //     toast.error("Procurement Locking Rule", {
  //       description: `Trade profile "${name}" maintains ${openOrders} pending purchase order agreements. Close dependencies before archiving execution paths.`
  //     });
  //     return;
  //   }

  //   if (!confirm(`Are you completely certain you want to soft-delete trade partner "${name}"?`)) return;

  //   try {
  //     const res = await fetch(`/api/admin/vendors?inflowId=${inflowId}`, { method: "DELETE" });
  //     if (!res.ok) throw new Error();
      
  //     toast.success("Vendor profile archived safely");
  //     setVendors((prev) => prev.filter((v) => v.inflowId !== inflowId));
  //   } catch (err) {
  //     toast.error("Instruction Terminated", { description: "Database transaction block rejected vendor removal script rules." });
  //   }
  // };

  const filteredVendors = vendors.filter((v) => {
    const normalize = searchQuery.toLowerCase().trim();
    return v.legalName.toLowerCase().includes(normalize) || v.inflowId.toLowerCase().includes(normalize);
  });

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6 text-xs">
      
      {/* Upper Context Control Toolbar Section Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" /> Supply Chain Trade Creditors Registry
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Coordinate supply ecosystem profile accounts, monitor active dynamic leverage accounts balances vectors, track item vendor SKUs catalogs density, and manage relational logistics constraints parameters.
          </p>
        </div>
        <SyncAllVendorsButton />
        <Button asChild size="sm" className="gap-1.5 shrink-0 text-xs px-4">
          <Link href="/dashboard/vendors/create">
            <Plus className="w-4 h-4" /> Register Supply Partner
          </Link>
        </Button>
      </div>

      {/* Lookup filter search control bar strip */}
      <div className="w-full sm:max-w-xs relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/70" />
        <Input
          placeholder="Filter vendors by corporate name, sync token handle..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 text-xs h-9"
        />
      </div>

      {/* Main Framework Table Canvas Container Component */}
      {isLoading ? (
        <div className="p-20 text-center text-xs text-muted-foreground bg-card border rounded-xl shadow-3xs italic animate-pulse">
          Streaming active supply chain ledgers matrices files and aggregating accounts liabilities counters lists...
        </div>
      ) : filteredVendors.length === 0 ? (
        <div className="p-20 text-center text-xs text-muted-foreground border-dashed border-2 rounded-xl bg-card">
          No registered supply or procurement commercial profiles matched validation criteria keys.
        </div>
      ) : (
        <div className="border rounded-xl bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/30 border-b text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="p-4 pl-5 w-[280px]">Enterprise Trade Partner</th>
                  <th className="p-4 w-[200px]">Primary Communications Anchor</th>
                  <th className="p-4 text-center w-[120px]">Catalog Items</th>
                  <th className="p-4 text-center w-[120px]">Purchase Orders</th>
                  <th className="p-4 text-right w-[160px]">Gross Accounts Payable</th>
                  <th className="p-4 text-center w-[80px]">Status</th>
                  <th className="p-4 text-right pr-5 w-[100px]">Controls Matrix</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-xs font-medium">
                {filteredVendors.map((vendor) => (
                  <tr key={vendor.id} className="hover:bg-muted/5 transition-colors">
                    
                    {/* Legal Entity & Identifier Metadata Cell Block */}
                    <td className="p-4 pl-5">
                      <div className="font-semibold text-foreground text-[13px] leading-snug">{vendor.legalName}</div>
                    </td>

                    {/* Communication Anchor Details */}
                    <td className="p-4 text-muted-foreground">
                      <div className="truncate max-w-[180px] text-foreground font-medium">{vendor.email}</div>
                      <div className="text-[10px] font-mono mt-0.5">{vendor.phone}</div>
                    </td>

                    {/* Catalog SKU Items Count Metric */}
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center gap-1 font-mono text-xs text-slate-700 bg-slate-100 border px-2 py-0.5 rounded-md">
                        <Boxes className="w-3 h-3 text-slate-500" />
                        {vendor.catalogItemsCount.toLocaleString()}
                      </span>
                    </td>

                    {/* Active Procurement Pipeline Orders Metrics */}
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center gap-1 font-mono text-xs text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">
                        <ReceiptText className="w-3 h-3 text-blue-500" />
                        {vendor.purchaseOrdersCount.toLocaleString()}
                      </span>
                    </td>

                    {/* Financial Liabilities Liability Balances Column Vector Block */}
                    <td className="p-4 text-right font-mono text-sm pr-6">
                      <div className="flex items-center justify-end gap-1.5">
                        {vendor.hasCriticalPastDue && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-500 animate-bounce"  />
                            </TooltipTrigger>
                            <TooltipContent>
                            <p>Critical liability window aging beyond 60+ days milestone threshold.</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        <span className={`font-bold ${vendor.outstandingBalance > 0 ? "text-foreground" : "text-slate-400"}`}>
                          {vendor.currencyCode && vendor.outstandingBalance.toLocaleString("en-US", {
                            style: "currency",
                            currency: vendor.currencyCode
                          })}
                        </span>
                      </div>
                    </td>

                    {/* Logical Operational Toggle Switch State Icon */}
                    <td className="p-4 text-center">
                      <div className="flex justify-center">
                        <Tooltip>
                          <TooltipTrigger asChild>
                          {vendor.isActive ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : (
                              <XCircle className="w-4 h-4 text-slate-300" />
                          )}
                          </TooltipTrigger>
                          <TooltipContent>
                          <p>{vendor.isActive ? "Active ledger routing profile verified" : "Suspended procurement channel profile"}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </td>

                    {/* Management Action Trigger Tools Row */}
                    <td className="p-4 pr-5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                          <Link href={`/dashboard/vendors/${vendor.id}/edit`}>
                            <Edit3 className="w-3.5 h-3.5" />
                          </Link>
                        </Button>
                        <DeleteButton
                          itemId={vendor.id} 
                          itemName={vendor.legalName} 
                          endpointUrl={`/api/admin/vendors/${vendor.id}`}
                          onSuccess={(id) => {
                            setVendors((prev) => prev.filter((v) => v.inflowId !== id));
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