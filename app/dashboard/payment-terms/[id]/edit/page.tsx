// app/admin/payment-terms/edit/[id]/page.tsx
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PaymentTermsForm } from "@/components/payment-term/payment-term-form";
import { Sliders } from "lucide-react";

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
    title: `Modify Settlement Rule [${targetTerm?.name || "Terms Layer"}] | System Controls`
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
    daysDue: existingTerm.daysDue !== null ? String(existingTerm.daysDue) : "",
    isActive: existingTerm.isActive,
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 space-y-4 text-xs">
      
      {/* Administration Title Block Row */}
      <div className="border-b pb-4">
        <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Sliders className="w-4 h-4 text-primary" /> Adjust Maturity Framework Parameters: <span className="font-mono bg-muted border px-2 py-0.5 rounded text-xs font-bold text-foreground">{existingTerm.name}</span>
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Tweak transactional collection window offsets or adjust application activation switches.
        </p>
      </div>

      {/* Populate form fields with data using structural initialization variables */}
      <PaymentTermsForm initialData={formattedInitialData} />

    </div>
  );
}