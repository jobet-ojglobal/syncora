"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import {
  ArrowLeft,
  Pencil,
  Printer,
  Calendar,
  User,
  Warehouse,
  Boxes,
  FileText,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  RotateCcw,
  Barcode,
  Building2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch inventory adjustment details");
    return res.json();
  });

function formatReasonLabel(reason?: string | null): string {
  if (!reason) return "General Adjustment";
  const map: Record<string, string> = {
    STOCK_COUNT: "Restock / Count",
    DAMAGE: "Damaged Goods",
    LOSS: "Write-off / Loss",
    THEFT: "Stolen Inventory",
    EXPIRED: "Expired Stock",
    RETURN: "Customer Return",
    CORRECTION: "System Correction",
    MANUAL: "Manual Adjustment",
  };
  return map[reason] || reason;
}

export default function InventoryAdjustmentDetailsPage({
  params,
}: {
  params: Promise<{ adjustmentId: string }>;
}) {
  const resolvedParams = use(params);
  const adjustmentId = resolvedParams.adjustmentId;
  const router = useRouter();

  const { data: payload, error, isLoading } = useSWR(
    `/api/admin/inventory/adjustments/${adjustmentId}`,
    fetcher
  );

  const adjustment = payload?.data;

  if (error) {
    return (
      <div className="w-full max-w-6xl mx-auto p-6 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-2 text-xs">
          <ArrowLeft className="w-4 h-4" /> Back to Adjustments
        </Button>
        <div className="p-8 text-center text-xs text-rose-500 bg-destructive/10 border border-destructive/20 rounded-xl font-medium">
          Failed to load inventory adjustment details. It may have been removed or deleted.
        </div>
      </div>
    );
  }

  if (isLoading || !adjustment) {
    return (
      <div className="w-full max-w-6xl mx-auto p-6 space-y-6 animate-pulse">
        <div className="h-6 w-36 bg-muted rounded-md" />
        <div className="h-20 w-full bg-muted rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-muted rounded-xl" />
      </div>
    );
  }

  // Deduce total quantities
  const totalItems = adjustment.lines.length;
  const netQuantityDelta = adjustment.lines.reduce(
    (acc: number, line: any) => acc + Number(line.quantityAdjusted || 0),
    0
  );

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "POSTED":
        return (
          <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border-emerald-500/30 px-2.5 py-1">
            Approved
          </Badge>
        );
      case "DRAFT":
        return (
          <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 border-amber-500/30 px-2.5 py-1">
            Draft
          </Badge>
        );
      case "VOIDED":
        return (
          <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-600 border-rose-500/30 px-2.5 py-1">
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6 text-xs">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => router.push("/dashboard/inventory/adjustments")}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-xl font-bold tracking-tight text-foreground font-mono">
              {adjustment.adjustmentNumber}
            </h1>
            {renderStatusBadge(adjustment.status)}
          </div>
          <p className="text-muted-foreground text-xs pl-11">
            Created on {new Date(adjustment.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        </div>

        <div className="flex items-center gap-2 pl-11 sm:pl-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="gap-1.5 text-xs h-9"
          >
            <Printer className="w-3.5 h-3.5" /> Print Audit
          </Button>

          {/* Edit button only accessible when adjustment is in DRAFT status */}
          {adjustment.status === "DRAFT" && (
            <Button asChild size="sm" className="gap-1.5 text-xs h-9">
              <Link href={`/dashboard/inventory/adjustments/${adjustment.id}/edit`}>
                <Pencil className="w-3.5 h-3.5" /> Edit Draft
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-2xs border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Reason / Type
            </CardTitle>
            <FileText className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-semibold text-foreground">
              {formatReasonLabel(adjustment.adjustmentReason?.name)}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {adjustment.remarks || "No additional remarks attached"}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-2xs border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Adjusted Items
            </CardTitle>
            <Boxes className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-semibold text-foreground font-mono">
              {totalItems} {totalItems === 1 ? "Line Item" : "Line Items"}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Distinct SKUs affected</p>
          </CardContent>
        </Card>

        <Card className="shadow-2xs border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Net Quantity Shift
            </CardTitle>
            {netQuantityDelta > 0 ? (
              <ArrowUpRight className="w-4 h-4 text-emerald-500" />
            ) : netQuantityDelta < 0 ? (
              <ArrowDownLeft className="w-4 h-4 text-rose-500" />
            ) : (
              <RotateCcw className="w-4 h-4 text-muted-foreground" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold font-mono">
              {netQuantityDelta > 0 ? (
                <span className="text-emerald-600 dark:text-emerald-400">+{netQuantityDelta}</span>
              ) : netQuantityDelta < 0 ? (
                <span className="text-rose-600 dark:text-rose-400">{netQuantityDelta}</span>
              ) : (
                <span className="text-muted-foreground">0</span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Total unit balance change</p>
          </CardContent>
        </Card>

        <Card className="shadow-2xs border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Performed By
            </CardTitle>
            <User className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-semibold text-foreground truncate">
              {adjustment.performedBy?.name || "System User"}
            </div>
            <p className="text-[10px] text-muted-foreground truncate mt-0.5">
              {adjustment.performedBy?.email || "N/A"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Line Items Detail Section */}
      <Card className="shadow-xs border overflow-hidden">
        <CardHeader className="border-b bg-muted/20 py-3.5">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Warehouse className="w-4 h-4" /> Adjustment Ledger Lines
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/30 border-b text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="p-4 pl-5">Product & SKU</th>
                  <th className="p-4">Location & Bin</th>
                  <th className="p-4 w-[110px] text-right">Qty Before</th>
                  <th className="p-4 w-[110px] text-right">Adjustment</th>
                  <th className="p-4 w-[110px] text-right">Qty After</th>
                  <th className="p-4 pr-5 w-[140px] text-right">Line Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-xs font-medium">
                {adjustment.lines.map((line: any) => {
                  const qtyAdjusted = Number(line.quantityAdjusted);
                  const qtyBefore = Number(line.quantityBefore);
                  const qtyAfter = Number(line.quantityAfter);

                  return (
                    <tr key={line.id} className="hover:bg-muted/5 transition-colors">
                      <td className="p-4 pl-5">
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground text-[13px]">
                            {line.product?.name || "Unknown Item"}
                          </span>
                          <span className="font-mono text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Barcode className="w-3 h-3" /> SKU: {line.product?.sku || "N/A"}
                          </span>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="text-foreground flex items-center gap-1 font-medium">
                            <Building2 className="w-3 h-3 text-muted-foreground" />
                            {line.location?.name || "Main Warehouse"}
                          </span>
                          {line.inventoryBin?.sublocation?.name && (
                            <span className="text-[10px] text-muted-foreground pl-4">
                              Bin: {line.inventoryBin.sublocation.name}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-4 text-right font-mono text-muted-foreground">
                        {qtyBefore}
                      </td>

                      <td className="p-4 text-right font-mono font-bold">
                        {qtyAdjusted > 0 ? (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            +{qtyAdjusted}
                          </span>
                        ) : qtyAdjusted < 0 ? (
                          <span className="text-rose-600 dark:text-rose-400">
                            {qtyAdjusted}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>

                      <td className="p-4 text-right font-mono font-bold text-foreground">
                        {qtyAfter}
                      </td>

                      <td className="p-4 pr-5 text-right">
                        <Badge variant="secondary" className="text-[10px] font-medium">
                          {formatReasonLabel(line.reason || adjustment.adjustmentReason?.name)}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log / Metadata Details */}
      <Card className="shadow-xs border bg-muted/10">
        <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-muted-foreground text-[11px]">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" />
            <span>
              Last updated on{" "}
              <strong className="text-foreground">
                {new Date(adjustment.updatedAt).toLocaleString("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </strong>
            </span>
          </div>
          {adjustment.lastModifiedBy && (
            <div className="flex items-center gap-1.5">
              <span>Modified by:</span>
              <span className="font-semibold text-foreground">
                {adjustment.lastModifiedBy.name} ({adjustment.lastModifiedBy.email})
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}