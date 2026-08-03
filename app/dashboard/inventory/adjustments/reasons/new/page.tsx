import { AdjustmentReasonForm } from "@/components/inventory/adjustment-reason-form";
import PageHeader from "@/components/layout/dashboard/PageHeader";

export default async function NewAdjustmentReason() {
  return (
    <div className="w-full max-w-xl mx-auto p-4 sm:py-12 space-y-6 text-xs">
      <PageHeader
        title="Create Adjustment Reason"
        description="Add a new inventory adjustment reason code to categorize stock modifications across operations."
      />
      <AdjustmentReasonForm />
    </div>
  );
}