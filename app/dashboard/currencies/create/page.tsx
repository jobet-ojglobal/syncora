// app/admin/currencies/new/page.tsx
import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Globe2 } from "lucide-react";
import { CurrencyForm } from "@/components/currency/currency-form";
import PageHeader from "@/components/layout/dashboard/PageHeader";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Initialize New Forex Currency Profile | Admin Core",
  description: "Deploy structural typographic rules and currency validation criteria tokens into the enterprise ledgers.",
};

export default function NewCurrencyPage() {
  return (
    <div className="w-full max-w-5xl mx-auto p-6 space-y-4 ">
      {/* HEADER */}
      <Link
        href="/dashboard/currencies"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Forex Ledger
      </Link>
      <PageHeader 
        title="Initialize International Trading Handle" 
        description="Establish cryptographic standard ISO tracking values, configure typographic print layout separators properties, and attach base conversion rate factor coefficients."
        icon={Globe2}
        >
        <Button size="sm">Add Rule Mapping</Button>
      </PageHeader>

      {/* Initialize unified multi-variant configuration client form block layout */}
      <CurrencyForm initialData={null} />
    </div>
  );
}