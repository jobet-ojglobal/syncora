import Link from "next/link";
import { ArrowLeft, SlidersHorizontal } from "lucide-react";
import PageHeader from "@/components/layout/dashboard/PageHeader";
import InventoryAdjustmentForm from "@/components/inventory/adjustment-form";

export default function NewInventoryAdjustmentPage() {
  return (
    <div className="w-full max-w-5xl mx-auto p-6 space-y-6">
      {/* Navigation Back Link */}
      <Link
        href="/craft/inventory/adjustments"
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

      {/* Form */}
      <InventoryAdjustmentForm />
    </div>
  );
}