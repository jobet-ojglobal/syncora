// app/admin/payment-terms/new/page.tsx
import { Metadata } from "next";
import { PaymentTermsForm } from "@/components/payment-term/payment-term-form";
import { Scale } from "lucide-react";

export const metadata: Metadata = {
  title: "Initialize Settlement Terms Rule | Admin Core Dashboard",
  description: "Establish custom commercial credit maturity limits and system integration identifiers.",
};

export default function NewPaymentTermsPage() {
  return (
    <div className="w-full max-w-2xl mx-auto p-6 space-y-4 text-xs">
      
      {/* Informational Header Context Banner */}
      <div className="border-b pb-4">
        <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Scale className="w-5 h-5 text-primary" /> Instantiate Payment Term Boundary Rule
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Map localized dynamic grace matrices, establish collection limits flags, and bind structural system synchronization keys.
        </p>
      </div>

      {/* Mount pristine initialization form */}
      <PaymentTermsForm initialData={null} />
    </div>
  );
}