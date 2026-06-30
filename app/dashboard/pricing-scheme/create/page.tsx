// app/admin/pricing-schemes/new/page.tsx
import { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ArrowLeft, Tags } from "lucide-react";
import PageHeader from "@/components/layout/dashboard/PageHeader";
import { PricingSchemeForm } from "@/components/pricing-scheme/pricing-scheme-form";

export const metadata: Metadata = {
  title: "Provision Pricing Strategy Tier | Admin Core",
  description: "Establish custom commercial pricing matrices and catalog segmentation thresholds rules templates.",
};

export default async function NewPricingSchemePage() {
  // Query currency lookup vectors on the server layer to feed relational validation controls
  const activeCurrencies = await prisma.currency.findMany({
    where: { deletedAt: null },
    select: {
      inflowId: true,
      name: true,
      isoCode: true,
    },
    orderBy: { isoCode: "asc" },
  });

  return (
    <div className="w-full max-w-5xl mx-auto p-6 space-y-4 ">
      {/* HEADER */}
      <Link
        href="/dashboard/pricing-scheme"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Strategy Directory
      </Link>
      <PageHeader
        title="Provision New Catalog Pricing Matrix" 
        description="Map custom wholesale tiers, isolate pricing matrices channels groups, and define gross value tax absorption behaviors."
        icon={Tags}
      />
      <PricingSchemeForm initialData={null} currencyLookup={activeCurrencies} />
    </div>
  );
}