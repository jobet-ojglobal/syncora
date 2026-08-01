// app/admin/payment-terms/edit/[id]/page.tsx
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PaymentTermsForm } from "@/components/payment-term/payment-term-form";
import { ArrowLeft, Sliders } from "lucide-react";
import PageHeader from "@/components/layout/dashboard/PageHeader";
import Link from "next/link";

interface EditPaymentTermsProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: EditPaymentTermsProps): Promise<Metadata> {
  const { id } = await params;
  const targetTerm = await prisma.paymentTerm.findUnique({
    where: { id },
    select: { name: true }
  });
  
  return {
    title: `Modify Settlement Rule [${targetTerm?.name || "Terms Layer"}] | System Controls`,
    description: "Adjust transactional collection window offsets or modify application activation switches for payment terms.",
  };
}

export default async function EditPaymentTermsPage({ params }: EditPaymentTermsProps) {
  const { id } = await params;

  // Hydrate target system parameters from the database layer
  const existingTerm = await prisma.paymentTerm.findUnique({
    where: { id, deletedAt: null },
  });

  // Intercept missing pointer paths and break execution safely
  if (!existingTerm) {
    notFound();
  }

  // Sanitize and structure decimal/integer components for client components consumption
  const formattedInitialData = {
    id: existingTerm.id,
    inflowId: existingTerm.inflowId,
    name: existingTerm.name,
    daysDue: existingTerm.daysDue !== null ? Number(existingTerm.daysDue) : null,
    isActive: existingTerm.isActive,
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6 text-xs">
      {/* <Link
        href="/dashboard/settings/financial/payment-terms"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Cancel Strategy Modifications
      </Link> */}
      <PageHeader 
        title="Adjust Payment Terms Configuration"
        description="Modify transactional collection window offsets or adjust application activation switches."
        icon={Sliders}
      />
      <PaymentTermsForm initialData={formattedInitialData} />
    </div>
  );
}