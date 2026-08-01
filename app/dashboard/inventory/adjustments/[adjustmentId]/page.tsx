"use client";

import { use, useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
  AlertCircle,
  Hash,
  CheckCircle2,
  PlusCircle,
  MinusCircle,
  ArrowRight,
  SlidersHorizontal,
  Package,
  Layers,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

  const [selectedSerialsLine, setSelectedSerialsLine] = useState<any | null>(null);

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

  const isDraft = adjustment.status === "DRAFT";
  const totalItems = adjustment.lines.length;
  const netQuantityDelta = adjustment.lines.reduce(
    (acc: number, line: any) => acc + Number(line.quantityAdjusted || 0),
    0
  );

  const totalSerialsAffected = adjustment.lines.reduce((acc: number, line: any) => {
    if (isDraft) {
      const lineSerialCount = line.serials?.length || 0;
      const binSerialCount = line.draftBins?.reduce(
        (bAcc: number, bin: any) => bAcc + (bin.serials?.length || 0),
        0
      ) || 0;
      return acc + Math.max(lineSerialCount, binSerialCount);
    }
    return acc + (line.serials?.length || 0);
  }, 0);

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "POSTED":
        return (
          <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border-emerald-500/30 px-2.5 py-1">
            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-500" />
            Approved / Posted
          </Badge>
        );
      case "DRAFT":
        return (
          <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 border-amber-500/30 px-2.5 py-1">
            <Clock className="w-3 h-3 mr-1 text-amber-500" />
            Draft Mode
          </Badge>
        );
      case "VOIDED":
        return (
          <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-600 border-rose-500/30 px-2.5 py-1">
            <AlertCircle className="w-3 h-3 mr-1 text-rose-500" />
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getActionBadge = (action?: string) => {
    switch (action) {
      case "ADD":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[9px]"><PlusCircle className="w-2.5 h-2.5 mr-1" /> Add</Badge>;
      case "REMOVE":
        return <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20 text-[9px]"><MinusCircle className="w-2.5 h-2.5 mr-1" /> Remove</Badge>;
      case "MOVE":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[9px]"><ArrowRight className="w-2.5 h-2.5 mr-1" /> Move</Badge>;
      default:
        return <Badge variant="secondary" className="text-[9px]">Staged</Badge>;
    }
  };

  // Helper to get unassigned serials not explicitly linked to a draftBinId
  const getUnassignedSerials = (line: any) => {
    if (!line?.serials) return [];
    return line.serials.filter((s: any) => !s.draftBinId);
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6 text-xs print:p-0 print:space-y-4">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5 print:border-none">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0 print:hidden"
              onClick={() => router.push("/dashboard/inventory/adjustments")}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-mono">
              {adjustment.adjustmentNumber}
            </h1>
            {renderStatusBadge(adjustment.status)}
          </div>
          <p className="text-muted-foreground text-xs pl-11 print:pl-0">
            Created on {new Date(adjustment.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        </div>

        <div className="flex items-center gap-2 pl-11 sm:pl-0 print:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="gap-1.5 text-xs h-9"
          >
            <Printer className="w-3.5 h-3.5" /> Print Audit
          </Button>

          {isDraft && (
            <Button asChild size="sm" className="gap-1.5 text-xs h-9">
              <Link href={`/dashboard/inventory/adjustments/${adjustment.id}/edit`}>
                <Pencil className="w-3.5 h-3.5" /> Edit Draft
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Notice Banner for Draft Mode */}
      {isDraft && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-amber-900 dark:text-amber-200 print:hidden">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="text-xs">
              <span className="font-semibold">Unposted Draft Adjustment</span>
              <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
                Bin allocation records and serial updates are currently staged. Stock balances will not change until this draft is committed.
              </p>
            </div>
          </div>
          <Button asChild size="sm" variant="default" className="text-xs shrink-0">
            <Link href={`/dashboard/inventory/adjustments/${adjustment.id}/edit`}>
              Review & Post Adjustment
            </Link>
          </Button>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-2xs border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Reason / Category
            </CardTitle>
            <FileText className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-semibold text-foreground truncate">
              {formatReasonLabel(adjustment.adjustmentReason?.name)}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
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
                <span className="text-emerald-600 dark:text-emerald-400">+{netQuantityDelta} Units</span>
              ) : netQuantityDelta < 0 ? (
                <span className="text-rose-600 dark:text-rose-400">{netQuantityDelta} Units</span>
              ) : (
                <span className="text-muted-foreground">0 Units</span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Total unit balance change</p>
          </CardContent>
        </Card>

        <Card className="shadow-2xs border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Serials Logged
            </CardTitle>
            <Hash className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-semibold text-foreground font-mono">
              {totalSerialsAffected} Serial Numbers
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Total tracked serial units</p>
          </CardContent>
        </Card>
      </div>

      {/* Ledger Line Details */}
      <Card className="shadow-xs border overflow-hidden">
        <CardHeader className="border-b bg-muted/20 py-3.5">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Warehouse className="w-4 h-4" /> Ledger Lines & Sublocation/Bin Breakdown
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/30 border-b text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="p-4 pl-5">Product & SKU</th>
                  <th className="p-4">Location & Bin Breakdown</th>
                  <th className="p-4 w-[100px] text-right">Qty Before</th>
                  <th className="p-4 w-[110px] text-right">Adjustment</th>
                  <th className="p-4 w-[100px] text-right">Qty After</th>
                  <th className="p-4 pr-5 w-[130px] text-right">Line Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-xs font-medium">
                {adjustment.lines.map((line: any) => {
                  const qtyAdjusted = Number(line.quantityAdjusted);
                  const qtyBefore = Number(line.quantityBefore);
                  const qtyAfter = Number(line.quantityAfter);
                  const thumbUrl = line.product?.images?.[0]?.thumbUrl || line.product?.images?.[0]?.originalUrl;

                  // 1. Calculate assigned quantity across all draft bins
                  const assignedBinQty = (line.draftBins || []).reduce(
                    (acc: number, db: any) => acc + Number(db.quantity || 0),
                    0
                  );

                  // 2. Calculate remaining unassigned quantity for "Floor / Bulk Area"
                  const totalAbsAdjusted = Math.abs(qtyAdjusted);
                  const unassignedQty = Math.max(0, totalAbsAdjusted - assignedBinQty);

                  // Extract total serial count
                  const lineSerialsCount = line.serials?.length || 0;
                  const draftBinsSerialCount = line.draftBins?.reduce(
                    (sum: number, bin: any) => sum + (bin.serials?.length || 0),
                    0
                  ) || 0;
                  const totalLineSerials = Math.max(lineSerialsCount, draftBinsSerialCount);

                  return (
                    <tr key={line.id} className="hover:bg-muted/5 transition-colors">
                      {/* Product Column */}
                      <td className="p-4 pl-5 align-top">
                        <div className="flex items-start gap-3">
                          <div className="relative w-9 h-9 rounded-md border bg-muted/30 shrink-0 overflow-hidden flex items-center justify-center">
                            {thumbUrl ? (
                              <Image
                                src={thumbUrl}
                                alt={line.product?.name || "Product image"}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <Package className="w-4 h-4 text-muted-foreground/60" />
                            )}
                          </div>
                          <div className="flex flex-col space-y-1">
                            <span className="font-semibold text-foreground text-[13px] leading-tight">
                              {line.product?.name || "Unknown Product"}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] text-muted-foreground flex items-center gap-1">
<<<<<<< HEAD
                                <Barcode className="w-3 h-3" /> {line.product?.sku || "N/A"}
=======
                                 SKU: {line.product?.sku || "N/A"}
>>>>>>> 0bb88344244287618b9a29d21a23a5f88ff00f2d
                              </span>
                              {line.product?.trackSerials && (
                                <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-primary/5 border-primary/20 text-primary">
                                  Serialized
                                </Badge>
                              )}
                            </div>
                            {totalLineSerials > 0 && (
                              <button
                                onClick={() => setSelectedSerialsLine({ ...line, unassignedQty })}
                                className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline font-mono print:hidden mt-0.5"
                              >
                                <Hash className="w-2.5 h-2.5" />
                                Inspect {totalLineSerials} Serial{totalLineSerials > 1 ? "s" : ""}
                              </button>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Location & Bins Breakdown Column */}
                      <td className="p-4 align-top">
                        <div className="flex flex-col space-y-2">
                          <span className="text-foreground flex items-center gap-1 font-medium">
                            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                            {line.location?.name || "Main Warehouse"}
                          </span>

                          <div className="flex flex-col gap-1 pl-4">
                            {/* Render Assigned Sublocation / Draft Bins */}
                            {line.draftBins && line.draftBins.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {line.draftBins.map((db: any) => (
                                  <Badge
                                    key={db.id}
                                    variant="secondary"
                                    className="text-[10px] font-mono py-0.5 px-2 flex items-center gap-1 bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20"
                                  >
                                    <span>{db.sublocation?.name || "Unassigned Bin"}:</span>
                                    <strong className="font-bold">{Number(db.quantity)}</strong>
                                    {db.serials && db.serials.length > 0 && (
                                      <span className="text-[9px] text-amber-700/80 dark:text-amber-400/80 ml-0.5">
                                        ({db.serials.length} SNs)
                                      </span>
                                    )}
                                  </Badge>
                                ))}
                              </div>
                            )}

                            {/* Render Unassigned / Floor / Bulk Area Quantity */}
                            {unassignedQty > 0 && (
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <Badge
                                  variant="outline"
                                  className="text-[10px] font-mono py-0.5 px-2 flex items-center gap-1 bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
                                >
                                  <Layers className="w-3 h-3 text-slate-500" />
                                  <span>Floor / Bulk Area (Unassigned):</span>
                                  <strong className="font-bold">{unassignedQty}</strong>
                                </Badge>
                              </div>
                            )}

                            {/* Fallback for already posted bin assignments */}
                            {!isDraft && line.inventoryBin?.sublocation?.name && (
                              <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                Bin: <Badge variant="outline" className="text-[9px] py-0 px-1.5 font-mono">{line.inventoryBin.sublocation.name}</Badge>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="p-4 text-right font-mono text-muted-foreground align-top">
                        {qtyBefore}
                      </td>

                      <td className="p-4 text-right font-mono font-bold align-top">
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

                      <td className="p-4 text-right font-mono font-bold text-foreground align-top">
                        {qtyAfter}
                      </td>

                      <td className="p-4 pr-5 text-right align-top">
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

      {/* Audit & Execution Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="shadow-xs border bg-muted/10">
          <CardContent className="p-4 flex flex-col space-y-2 text-muted-foreground text-[11px]">
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Created & Executed By:</span>
              <strong className="text-foreground">
                {adjustment.performedBy?.name || "System User"} ({adjustment.performedBy?.email || "N/A"})
              </strong>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Created On:</span>
              <strong className="text-foreground">
                {new Date(adjustment.createdAt).toLocaleString()}
              </strong>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs border bg-muted/10">
          <CardContent className="p-4 flex flex-col space-y-2 text-muted-foreground text-[11px]">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Last Modified On:</span>
              <strong className="text-foreground">
                {new Date(adjustment.updatedAt).toLocaleString()}
              </strong>
            </div>
            {adjustment.lastModifiedBy && (
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Modified By:</span>
                <strong className="text-foreground">
                  {adjustment.lastModifiedBy.name} ({adjustment.lastModifiedBy.email})
                </strong>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Serial Inspection Modal */}
      <Dialog open={!!selectedSerialsLine} onOpenChange={() => setSelectedSerialsLine(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Barcode className="w-4 h-4 text-primary" /> Serial Audit: {selectedSerialsLine?.product?.name}
            </DialogTitle>
          </DialogHeader>

          {selectedSerialsLine && (
            <div className="space-y-4 pt-1">
              <div className="text-xs text-muted-foreground flex justify-between bg-muted/30 p-2.5 rounded-lg border">
                <span>SKU: <strong className="font-mono text-foreground">{selectedSerialsLine.product?.sku}</strong></span>
                <span>
                  Mode: <strong className="font-mono text-foreground">{isDraft ? "Draft Staging" : "Posted"}</strong>
                </span>
              </div>

              {/* Draft Mode: Group Serials by Draft Bins & Floor/Bulk Area */}
              {isDraft ? (
                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                  {/* Bin-assigned serials */}
                  {selectedSerialsLine.draftBins && selectedSerialsLine.draftBins.length > 0 && (
                    selectedSerialsLine.draftBins.map((bin: any) => (
                      <div key={bin.id} className="border rounded-lg p-3 space-y-2 bg-background">
                        <div className="flex justify-between items-center text-xs font-semibold border-b pb-1.5">
                          <span className="flex items-center gap-1.5 text-foreground">
                            <Building2 className="w-3.5 h-3.5 text-amber-500" />
                            Sublocation: {bin.sublocation?.name || "Unassigned"}
                          </span>
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {bin.serials?.length || 0} / {Number(bin.quantity)} Serials
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5 pt-1">
                          {bin.serials && bin.serials.length > 0 ? (
                            bin.serials.map((s: any) => (
                              <div key={s.id} className="p-1.5 rounded bg-muted/30 border text-[11px] font-mono flex items-center justify-between">
                                <span>{s.serialNumber}</span>
                                {getActionBadge("ADD")}
                              </div>
                            ))
                          ) : (
                            <span className="text-[11px] text-muted-foreground italic col-span-2">
                              No serials mapped to this bin
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}

                  {/* Floor / Bulk Area serials */}
                  {(() => {
                    const unassignedSerials = getUnassignedSerials(selectedSerialsLine);
                    const unassignedQty = selectedSerialsLine.unassignedQty || 0;

                    if (unassignedQty === 0 && unassignedSerials.length === 0) return null;

                    return (
                      <div className="border border-slate-300 dark:border-slate-800 rounded-lg p-3 space-y-2 bg-slate-500/5">
                        <div className="flex justify-between items-center text-xs font-semibold border-b pb-1.5">
                          <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                            <Layers className="w-3.5 h-3.5 text-slate-500" />
                            Floor / Bulk Area (Unassigned)
                          </span>
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {unassignedSerials.length} / {unassignedQty} Serials
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5 pt-1">
                          {unassignedSerials.length > 0 ? (
                            unassignedSerials.map((s: any) => (
                              <div key={s.id} className="p-1.5 rounded bg-background border text-[11px] font-mono flex items-center justify-between">
                                <span>{s.serialNumber}</span>
                                {getActionBadge(s.action || "ADD")}
                              </div>
                            ))
                          ) : (
                            <span className="text-[11px] text-muted-foreground italic col-span-2">
                              No serial numbers assigned to bulk floor area
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                /* Posted Mode Direct Serial List */
                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                  {selectedSerialsLine.serials && selectedSerialsLine.serials.length > 0 ? (
                    selectedSerialsLine.serials.map((s: any) => (
                      <div key={s.id} className="flex items-center justify-between p-2 rounded border bg-muted/20 text-xs">
                        <div className="flex items-center gap-2">
                          {getActionBadge(s.action)}
                          <span className="font-mono font-medium">{s.serialNumber}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-muted-foreground text-xs">
                      No serial numbers attached to this line item.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 7/31/2026

// "use client";

// import { use } from "react";
// import Link from "next/link";
// import { useRouter } from "next/navigation";
// import useSWR from "swr";
// import {
//   ArrowLeft,
//   Pencil,
//   Printer,
//   Calendar,
//   User,
//   Warehouse,
//   Boxes,
//   FileText,
//   Clock,
//   ArrowUpRight,
//   ArrowDownLeft,
//   RotateCcw,
//   Barcode,
//   Building2,
// } from "lucide-react";

// import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// const fetcher = (url: string) =>
//   fetch(url).then((res) => {
//     if (!res.ok) throw new Error("Failed to fetch inventory adjustment details");
//     return res.json();
//   });

// function formatReasonLabel(reason?: string | null): string {
//   if (!reason) return "General Adjustment";
//   const map: Record<string, string> = {
//     STOCK_COUNT: "Restock / Count",
//     DAMAGE: "Damaged Goods",
//     LOSS: "Write-off / Loss",
//     THEFT: "Stolen Inventory",
//     EXPIRED: "Expired Stock",
//     RETURN: "Customer Return",
//     CORRECTION: "System Correction",
//     MANUAL: "Manual Adjustment",
//   };
//   return map[reason] || reason;
// }

// export default function InventoryAdjustmentDetailsPage({
//   params,
// }: {
//   params: Promise<{ adjustmentId: string }>;
// }) {
//   const resolvedParams = use(params);
//   const adjustmentId = resolvedParams.adjustmentId;
//   const router = useRouter();

//   const { data: payload, error, isLoading } = useSWR(
//     `/api/admin/inventory/adjustments/${adjustmentId}`,
//     fetcher
//   );

//   const adjustment = payload?.data;

//   if (error) {
//     return (
//       <div className="w-full max-w-6xl mx-auto p-6 space-y-4">
//         <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-2 text-xs">
//           <ArrowLeft className="w-4 h-4" /> Back to Adjustments
//         </Button>
//         <div className="p-8 text-center text-xs text-rose-500 bg-destructive/10 border border-destructive/20 rounded-xl font-medium">
//           Failed to load inventory adjustment details. It may have been removed or deleted.
//         </div>
//       </div>
//     );
//   }

//   if (isLoading || !adjustment) {
//     return (
//       <div className="w-full max-w-6xl mx-auto p-6 space-y-6 animate-pulse">
//         <div className="h-6 w-36 bg-muted rounded-md" />
//         <div className="h-20 w-full bg-muted rounded-xl" />
//         <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
//           {[...Array(4)].map((_, i) => (
//             <div key={i} className="h-24 bg-muted rounded-xl" />
//           ))}
//         </div>
//         <div className="h-64 bg-muted rounded-xl" />
//       </div>
//     );
//   }

//   // Deduce total quantities
//   const totalItems = adjustment.lines.length;
//   const netQuantityDelta = adjustment.lines.reduce(
//     (acc: number, line: any) => acc + Number(line.quantityAdjusted || 0),
//     0
//   );

//   const renderStatusBadge = (status: string) => {
//     switch (status) {
//       case "POSTED":
//         return (
//           <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border-emerald-500/30 px-2.5 py-1">
//             Approved
//           </Badge>
//         );
//       case "DRAFT":
//         return (
//           <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 border-amber-500/30 px-2.5 py-1">
//             Draft
//           </Badge>
//         );
//       case "VOIDED":
//         return (
//           <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-600 border-rose-500/30 px-2.5 py-1">
//             Cancelled
//           </Badge>
//         );
//       default:
//         return <Badge variant="outline">{status}</Badge>;
//     }
//   };

//   return (
//     <div className="w-full max-w-6xl mx-auto p-6 space-y-6 text-xs">
//       {/* Top Header Controls */}
//       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
//         <div className="space-y-1">
//           <div className="flex items-center gap-3">
//             <Button
//               variant="outline"
//               size="icon"
//               className="h-8 w-8 shrink-0"
//               onClick={() => router.push("/dashboard/inventory/adjustments")}
//             >
//               <ArrowLeft className="w-4 h-4" />
//             </Button>
//             <h1 className="text-xl font-bold tracking-tight text-foreground font-mono">
//               {adjustment.adjustmentNumber}
//             </h1>
//             {renderStatusBadge(adjustment.status)}
//           </div>
//           <p className="text-muted-foreground text-xs pl-11">
//             Created on {new Date(adjustment.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
//           </p>
//         </div>

//         <div className="flex items-center gap-2 pl-11 sm:pl-0">
//           <Button
//             variant="outline"
//             size="sm"
//             onClick={() => window.print()}
//             className="gap-1.5 text-xs h-9"
//           >
//             <Printer className="w-3.5 h-3.5" /> Print Audit
//           </Button>

//           {/* Edit button only accessible when adjustment is in DRAFT status */}
//           {adjustment.status === "DRAFT" && (
//             <Button asChild size="sm" className="gap-1.5 text-xs h-9">
//               <Link href={`/dashboard/inventory/adjustments/${adjustment.id}/edit`}>
//                 <Pencil className="w-3.5 h-3.5" /> Edit Draft
//               </Link>
//             </Button>
//           )}
//         </div>
//       </div>

//       {/* Overview Stat Cards */}
//       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
//         <Card className="shadow-2xs border">
//           <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
//             <CardTitle className="text-xs font-medium text-muted-foreground">
//               Reason / Type
//             </CardTitle>
//             <FileText className="w-4 h-4 text-muted-foreground" />
//           </CardHeader>
//           <CardContent>
//             <div className="text-sm font-semibold text-foreground">
//               {formatReasonLabel(adjustment.adjustmentReason?.name)}
//             </div>
//             <p className="text-[10px] text-muted-foreground mt-0.5">
//               {adjustment.remarks || "No additional remarks attached"}
//             </p>
//           </CardContent>
//         </Card>

//         <Card className="shadow-2xs border">
//           <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
//             <CardTitle className="text-xs font-medium text-muted-foreground">
//               Adjusted Items
//             </CardTitle>
//             <Boxes className="w-4 h-4 text-muted-foreground" />
//           </CardHeader>
//           <CardContent>
//             <div className="text-sm font-semibold text-foreground font-mono">
//               {totalItems} {totalItems === 1 ? "Line Item" : "Line Items"}
//             </div>
//             <p className="text-[10px] text-muted-foreground mt-0.5">Distinct SKUs affected</p>
//           </CardContent>
//         </Card>

//         <Card className="shadow-2xs border">
//           <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
//             <CardTitle className="text-xs font-medium text-muted-foreground">
//               Net Quantity Shift
//             </CardTitle>
//             {netQuantityDelta > 0 ? (
//               <ArrowUpRight className="w-4 h-4 text-emerald-500" />
//             ) : netQuantityDelta < 0 ? (
//               <ArrowDownLeft className="w-4 h-4 text-rose-500" />
//             ) : (
//               <RotateCcw className="w-4 h-4 text-muted-foreground" />
//             )}
//           </CardHeader>
//           <CardContent>
//             <div className="text-sm font-bold font-mono">
//               {netQuantityDelta > 0 ? (
//                 <span className="text-emerald-600 dark:text-emerald-400">+{netQuantityDelta}</span>
//               ) : netQuantityDelta < 0 ? (
//                 <span className="text-rose-600 dark:text-rose-400">{netQuantityDelta}</span>
//               ) : (
//                 <span className="text-muted-foreground">0</span>
//               )}
//             </div>
//             <p className="text-[10px] text-muted-foreground mt-0.5">Total unit balance change</p>
//           </CardContent>
//         </Card>

//         <Card className="shadow-2xs border">
//           <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
//             <CardTitle className="text-xs font-medium text-muted-foreground">
//               Performed By
//             </CardTitle>
//             <User className="w-4 h-4 text-muted-foreground" />
//           </CardHeader>
//           <CardContent>
//             <div className="text-sm font-semibold text-foreground truncate">
//               {adjustment.performedBy?.name || "System User"}
//             </div>
//             <p className="text-[10px] text-muted-foreground truncate mt-0.5">
//               {adjustment.performedBy?.email || "N/A"}
//             </p>
//           </CardContent>
//         </Card>
//       </div>

//       {/* Line Items Detail Section */}
//       <Card className="shadow-xs border overflow-hidden">
//         <CardHeader className="border-b bg-muted/20 py-3.5">
//           <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
//             <Warehouse className="w-4 h-4" /> Adjustment Ledger Lines
//           </CardTitle>
//         </CardHeader>
//         <CardContent className="p-0">
//           <div className="overflow-x-auto">
//             <table className="w-full text-left border-collapse">
//               <thead>
//                 <tr className="bg-muted/30 border-b text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
//                   <th className="p-4 pl-5">Product & SKU</th>
//                   <th className="p-4">Location & Bin</th>
//                   <th className="p-4 w-[110px] text-right">Qty Before</th>
//                   <th className="p-4 w-[110px] text-right">Adjustment</th>
//                   <th className="p-4 w-[110px] text-right">Qty After</th>
//                   <th className="p-4 pr-5 w-[140px] text-right">Line Reason</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-border/60 text-xs font-medium">
//                 {adjustment.lines.map((line: any) => {
//                   const qtyAdjusted = Number(line.quantityAdjusted);
//                   const qtyBefore = Number(line.quantityBefore);
//                   const qtyAfter = Number(line.quantityAfter);

//                   return (
//                     <tr key={line.id} className="hover:bg-muted/5 transition-colors">
//                       <td className="p-4 pl-5">
//                         <div className="flex flex-col">
//                           <span className="font-semibold text-foreground text-[13px]">
//                             {line.product?.name || "Unknown Item"}
//                           </span>
//                           <span className="font-mono text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
//                             <Barcode className="w-3 h-3" /> SKU: {line.product?.sku || "N/A"}
//                           </span>
//                         </div>
//                       </td>

//                       <td className="p-4">
//                         <div className="flex flex-col">
//                           <span className="text-foreground flex items-center gap-1 font-medium">
//                             <Building2 className="w-3 h-3 text-muted-foreground" />
//                             {line.location?.name || "Main Warehouse"}
//                           </span>
//                           {line.inventoryBin?.sublocation?.name && (
//                             <span className="text-[10px] text-muted-foreground pl-4">
//                               Bin: {line.inventoryBin.sublocation.name}
//                             </span>
//                           )}
//                         </div>
//                       </td>

//                       <td className="p-4 text-right font-mono text-muted-foreground">
//                         {qtyBefore}
//                       </td>

//                       <td className="p-4 text-right font-mono font-bold">
//                         {qtyAdjusted > 0 ? (
//                           <span className="text-emerald-600 dark:text-emerald-400">
//                             +{qtyAdjusted}
//                           </span>
//                         ) : qtyAdjusted < 0 ? (
//                           <span className="text-rose-600 dark:text-rose-400">
//                             {qtyAdjusted}
//                           </span>
//                         ) : (
//                           <span className="text-muted-foreground">0</span>
//                         )}
//                       </td>

//                       <td className="p-4 text-right font-mono font-bold text-foreground">
//                         {qtyAfter}
//                       </td>

//                       <td className="p-4 pr-5 text-right">
//                         <Badge variant="secondary" className="text-[10px] font-medium">
//                           {formatReasonLabel(line.reason || adjustment.adjustmentReason?.name)}
//                         </Badge>
//                       </td>
//                     </tr>
//                   );
//                 })}
//               </tbody>
//             </table>
//           </div>
//         </CardContent>
//       </Card>

//       {/* Audit Log / Metadata Details */}
//       <Card className="shadow-xs border bg-muted/10">
//         <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-muted-foreground text-[11px]">
//           <div className="flex items-center gap-2">
//             <Clock className="w-3.5 h-3.5" />
//             <span>
//               Last updated on{" "}
//               <strong className="text-foreground">
//                 {new Date(adjustment.updatedAt).toLocaleString("en-US", {
//                   dateStyle: "medium",
//                   timeStyle: "short",
//                 })}
//               </strong>
//             </span>
//           </div>
//           {adjustment.lastModifiedBy && (
//             <div className="flex items-center gap-1.5">
//               <span>Modified by:</span>
//               <span className="font-semibold text-foreground">
//                 {adjustment.lastModifiedBy.name} ({adjustment.lastModifiedBy.email})
//               </span>
//             </div>
//           )}
//         </CardContent>
//       </Card>
//     </div>
//   );
// }