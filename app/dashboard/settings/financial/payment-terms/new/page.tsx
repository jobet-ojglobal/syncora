// app/admin/payment-terms/new/page.tsx
import { Metadata } from "next";
import { PaymentTermsForm } from "@/components/payment-term/payment-term-form";
import { ArrowLeft, Scale } from "lucide-react";
import PageHeader from "@/components/layout/dashboard/PageHeader";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Initialize Settlement Terms Rule | Admin Core Dashboard",
  description: "Establish custom commercial credit maturity limits and system integration identifiers.",
};

export default function NewPaymentTermsPage() {
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
        title="Instantiate New Payment Terms Rule"
        description="Map localized dynamic grace matrices, establish collection limits flags, and bind structural system synchronization keys."
        icon={Scale}
      />
      <PaymentTermsForm initialData={null} />
    </div>
  );
}