// app/admin/pricing-schemes/edit/[id]/page.tsx
import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ArrowLeft, Sliders } from "lucide-react";
import { PricingSchemeForm } from "@/components/pricing-scheme/pricing-scheme-form";
import PageHeader from "@/components/layout/dashboard/PageHeader";

interface EditPricingSchemeProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: EditPricingSchemeProps): Promise<Metadata> {
  const { id } = await params;
  const targetMatrixRow = await prisma.pricingScheme.findUnique({
    where: { id },
    select: { name: true }
  });
  
  return {
    title: `Adjust Matrix Configuration [${targetMatrixRow?.name || "Tier Setup"}] | Admin Settings`,
    description: "Modify catalog pricing matrices, adjust wholesale tiers, and configure tax absorption behaviors for commercial strategy templates.",
  };
}

export default async function EditPricingSchemePage({ params }: EditPricingSchemeProps) {
  const { id } = await params;

  // Hydrate structural reference lookup options data profiles blocks matching target row criteria handles
  const [targetScheme, activeCurrencies] = await Promise.all([
    prisma.pricingScheme.findUnique({
      where: { id, deletedAt: null },
    }),
    prisma.currency.findMany({
      where: { deletedAt: null },
      select: {
        inflowId: true,
        name: true,
        isoCode: true,
      },
      orderBy: { isoCode: "asc" },
    })
  ]);

  // Gracefully drop into application 404 handler page workspace view if database matches no items indices rows vectors
  if (!targetScheme) {
    notFound();
  }

  // Parse server configuration parameters objects fields onto matching type keys for client setup components maps
  const flattenedStrategyData = {
    id: targetScheme.id,
    inflowId: targetScheme.inflowId,
    name: targetScheme.name,
    currencyId: targetScheme.currencyId,
    isActive: targetScheme.isActive,
    isDefault: targetScheme.isDefault,
    isTaxInclusive: targetScheme.isTaxInclusive,
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6 text-xs">
      {/* <Link
        href="/dashboard/settings/financial/pricing"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Cancel Strategy Modifications
      </Link> */}
      <PageHeader
        title={
          <>
            Modify Pricing Strategy Model: 
            <span className="font-mono bg-muted border px-2 py-0.5 rounded text-xs font-bold text-foreground inline-block">
              {targetScheme.name}
            </span>
          </>
        }
        description="Tweak administrative routing tags toggles rules parameters or execute operational activation switch states shifts adjustments variables."
        icon={Sliders}
        className="border-b border-border pb-4"
      />


      {/* Render form element and hydrate template states loops fields vectors mapping targets parameters */}
      <PricingSchemeForm initialData={flattenedStrategyData} currencyLookup={activeCurrencies} />
    </div>
  );
}