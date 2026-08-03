import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AdjustmentReasonForm } from "@/components/inventory/adjustment-reason-form";
import PageHeader from "@/components/layout/dashboard/PageHeader";

interface EditAdjustmentReasonPageProps {
  params: Promise<{ reasonId: string }>;
}

export default async function EditAdjustmentReasonPage({
  params,
}: EditAdjustmentReasonPageProps) {
  // 1. Resolve asynchronous route parameters
  const { reasonId: id } = await params;

  // 2. Fetch target record ensuring it is not soft-deleted
  const reason = await prisma.adjustmentReason.findFirst({
    where: {
      id,
      deletedAt: null,
    },
  });

  // 3. Render 404 page if record doesn't exist
  if (!reason) {
    notFound();
  }

  return (
    <div className="w-full max-w-xl mx-auto p-4 sm:p-6 space-y-6 text-xs">
      <PageHeader
        title="Edit Adjustment Reason"
        description={`Modify settings and visibility rules for "${reason.name}".`}
      />
      <AdjustmentReasonForm
        initialData={{
          id: reason.id,
          inflowId: reason.inflowId ?? "",
          name: reason.name,
          isActive: reason.isActive,
          isInternal: reason.isInternal,
        }}
      />
    </div>
  );
}