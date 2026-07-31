import { Suspense } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { StockAdjustmentForm } from "@/components/stock/stock-adjustment-form";
import { getCurrentUser } from "@/lib/user";
import PageHeader from "@/components/layout/dashboard/PageHeader";
import Link from "next/link";
import { ArrowLeft, SlidersHorizontal } from "lucide-react";
import { AdjustmentService } from "@/services/adjustment.service";

interface PageProps {
  params: Promise<{
    adjustmentId: string;
  }>;
}

// Skeleton fallback while fetching server data
function AdjustmentFormSkeleton() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4 animate-pulse">
      <div className="h-10 w-64 bg-muted rounded-md" />
      <Card>
        <CardContent className="h-32 bg-muted/50 rounded-md" />
      </Card>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="h-24 bg-muted/50 rounded-md" />
        <div className="h-24 bg-muted/50 rounded-md" />
        <div className="h-24 bg-muted/50 rounded-md" />
      </div>
      <Card>
        <CardContent className="h-64 bg-muted/50 rounded-md" />
      </Card>
    </div>
  );
}

export default async function InventoryAdjustmentPage({ params }: PageProps) {
  const { adjustmentId } = await params;
  const currentUser = await getCurrentUser()
    
  const [ initialData, adjustmentReasons] = await Promise.all([
    AdjustmentService.getAdjustmentForEdit(adjustmentId),
    prisma.adjustmentReason.findMany({
      where: {
        deletedAt: null,
        isActive: true,
      },
      select: {
        inflowId: true,
        name: true
      },
      orderBy: { createdAt: "desc" },
    })
  ]);

  if(!initialData) notFound();

  return (
    <div className="w-full max-w-5xl mx-auto p-6 space-y-6">
      {/* Navigation Back Link */}
      <Link
        href="/dashboard/inventory/adjustment"
        className="mb-2 inline-flex items-center gap-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Adjustments
      </Link>

      {/* Header */}
      <PageHeader
        title="Create Inventory Adjustment"
        description="Reconcile stock discrepancies, record damaged or stolen items, or manually adjust warehouse inventory levels."
        icon={SlidersHorizontal}
        className="border-b pb-5"
      />
      <Suspense fallback={<AdjustmentFormSkeleton />}>
        <StockAdjustmentForm  
          initialData={initialData}
          currentUser={currentUser}
          adjustmentReasons={adjustmentReasons.map(rsn => ({
            id: rsn.inflowId,
            name: rsn.name
          }))}
        />
      </Suspense>
    </div>
  );
}