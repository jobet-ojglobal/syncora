import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit3 } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user";
import { AdjustmentService } from "@/services/adjustment.service";

import { Card, CardContent } from "@/components/ui/card";
import PageHeader from "@/components/layout/dashboard/PageHeader";
import { StockAdjustmentFormOutdated } from "@/components/stock/stock-adjustment-form-outdated";

interface PageProps {
  params: Promise<{
    adjustmentId: string;
  }>;
}

// Loading Skeleton
export function AdjustmentFormSkeleton() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
      {/* Form Top Section / Global Controls */}
      <Card className="border rounded-xl">
        <CardContent className="p-4 space-y-4">
          <div className="h-5 w-48 bg-muted rounded" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="h-10 bg-muted/60 rounded-md" />
            <div className="h-10 bg-muted/60 rounded-md" />
            <div className="h-10 bg-muted/60 rounded-md" />
          </div>
        </CardContent>
      </Card>

      {/* Product Line Card Skeleton */}
      <div className="border rounded-xl bg-background overflow-hidden shadow-xs space-y-0">
        
        {/* Card Header */}
        <div className="bg-muted/40 p-3 border-b flex justify-between items-center">
          <div className="flex gap-2 items-center">
            {/* Thumbnail */}
            <div className="w-10 h-10 bg-muted/70 rounded-lg shrink-0" />
            
            {/* Product Name & SKU */}
            <div className="space-y-1.5">
              <div className="h-3.5 w-36 bg-muted/80 rounded" />
              <div className="h-2.5 w-20 bg-muted/60 rounded" />
            </div>

            {/* Badges */}
            <div className="flex gap-1.5 ml-2">
              <div className="h-4 w-16 bg-muted/60 rounded-full" />
              <div className="h-4 w-24 bg-muted/60 rounded-full" />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <div className="h-7 w-36 bg-muted/60 rounded-md" />
            <div className="h-7 w-28 bg-muted/60 rounded-md" />
            <div className="w-7 h-7 bg-muted/60 rounded-md" />
          </div>
        </div>

        {/* Section 1: Reasoning & Calculations (4-column grid) */}
        <div className="p-4 border-b bg-muted/20">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-3 w-24 bg-muted/60 rounded" />
                <div className="h-8 bg-muted/50 rounded-md" />
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Target Quantities (3-column grid) */}
        <div className="p-4 border-b bg-muted/5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-3 w-32 bg-muted/60 rounded" />
                <div className="h-8 bg-muted/50 rounded-md" />
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Master Serial Pool */}
        <div className="p-4 border-b bg-muted/10 space-y-3">
          <div className="flex justify-between items-center">
            <div className="h-3.5 w-36 bg-muted/70 rounded" />
            <div className="h-3 w-28 bg-muted/50 rounded" />
          </div>

          {/* Input & Action Buttons Row */}
          <div className="flex flex-wrap gap-2">
            <div className="h-8 w-48 bg-muted/60 rounded-md" />
            <div className="h-8 w-24 bg-muted/60 rounded-md" />
            <div className="h-8 w-20 bg-muted/60 rounded-md" />
            <div className="h-8 w-36 bg-muted/60 rounded-md" />
          </div>

          {/* Serial Chips Mock */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-6 w-20 bg-muted/60 rounded-md" />
            ))}
          </div>
        </div>

        {/* Section 4: Bulk/Unassigned Bar */}
        <div className="flex items-center justify-between py-2 px-4 bg-muted/30 border-b">
          <div className="h-3 w-40 bg-muted/60 rounded" />
          <div className="h-3.5 w-12 bg-muted/80 rounded" />
        </div>

        {/* Section 5: Bins Allocation Section */}
        <div className="p-3 space-y-3">
          <div className="p-3 border rounded-lg bg-card space-y-3">
            {/* Sublocation & Volume Selectors */}
            <div className="grid grid-cols-12 gap-3 items-start">
              <div className="col-span-12 sm:col-span-5 space-y-1.5">
                <div className="h-3 w-24 bg-muted/60 rounded" />
                <div className="h-8 bg-muted/50 rounded-md" />
              </div>
              <div className="col-span-10 sm:col-span-6 space-y-1.5">
                <div className="h-3 w-20 bg-muted/60 rounded" />
                <div className="h-8 bg-muted/50 rounded-md" />
              </div>
              <div className="col-span-2 sm:col-span-1 flex justify-center pt-5">
                <div className="w-7 h-7 bg-muted/60 rounded-md" />
              </div>
            </div>

            {/* Serial Tags Assignment Area */}
            <div className="pt-2 border-t border-dashed space-y-2">
              <div className="flex justify-between items-center">
                <div className="h-3 w-36 bg-muted/60 rounded" />
                <div className="h-3 w-28 bg-muted/50 rounded" />
              </div>
              <div className="flex gap-1.5 p-2 bg-muted/20 rounded-md border h-10 items-center">
                <div className="h-6 w-16 bg-muted/60 rounded" />
                <div className="h-6 w-16 bg-muted/60 rounded" />
                <div className="h-6 w-16 bg-muted/60 rounded" />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// Async Data Fetcher Component to enable Suspense Streaming
async function EditAdjustmentContent({ adjustmentId }: { adjustmentId: string }) {
  const [currentUser, initialData, rawReasons] = await Promise.all([
    getCurrentUser(),
    AdjustmentService.getAdjustmentForEditLiveInv(adjustmentId),
    prisma.adjustmentReason.findMany({
      where: {
        deletedAt: null,
        isActive: true,
      },
      select: {
        inflowId: true,
        name: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!initialData) {
    notFound();
  }

  const adjustmentReasons = rawReasons.map((rsn) => ({
    id: rsn.inflowId,
    name: rsn.name,
  }));

  return (
    <StockAdjustmentFormOutdated
      initialData={initialData}
      currentUser={currentUser}
      adjustmentReasons={adjustmentReasons}
    />
  );
}

// Main Page Component
export default async function InventoryAdjustmentPage({ params }: PageProps) {
  const { adjustmentId } = await params;

  return (
    <div className="w-full max-w-5xl mx-auto p-6 space-y-6">
      {/* Navigation Link */}
      <Link
        href="/dashboard/inventory/adjustments"
        className="mb-2 inline-flex items-center gap-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Adjustments
      </Link>

      {/* Header */}
      <PageHeader
        title="Edit Inventory Adjustment"
        description="Update stock adjustment record details and quantities."
        icon={Edit3}
        className="border-b pb-5"
      />

      {/* Async Streaming Form */}
      <Suspense fallback={<AdjustmentFormSkeleton />}>
        <EditAdjustmentContent adjustmentId={adjustmentId} />
      </Suspense>
    </div>
  );
}