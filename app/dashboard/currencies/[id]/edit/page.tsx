// app/admin/currencies/edit/[id]/page.tsx
import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ArrowLeft, SlidersHorizontal } from "lucide-react";
import { CurrencyForm } from "@/components/currency/currency-form";
import PageHeader from "@/components/layout/dashboard/PageHeader";

interface EditCurrencyProps {
  params: Promise<{ id: string }>;
}

// Dynamically generate structural SEO header signatures matching specific dynamic tracking files records tokens
export async function generateMetadata({ params }: EditCurrencyProps): Promise<Metadata> {
  const { id } = await params;
  const currencyRow = await prisma.currency.findUnique({
    where: { id },
    select: { isoCode: true }
  });
  
  return {
    title: `Modify Monetary Balance Parameters [${currencyRow?.isoCode || "FX"}] | Admin Settings`
  };
}

export default async function EditCurrencyPage({ params }: EditCurrencyProps) {
  const { id } = await params;

  // Execute database hydration pre-check block directly inside server boundary execution context layer
  const currencyRecord = await prisma.currency.findUnique({
    where: { id, deletedAt: null },
    include: {
      conversions: {
        orderBy: { createdAt: "desc" },
        take: 1, // Capture the latest conversion log multiplier entry row
        select: {
          exchangeRate: true,
          isManual: true
        }
      }
    }
  });

  // Gracefully drop into global application 404 handler if transaction validation fails mapping target indexes
  if (!currencyRecord) {
    notFound();
  }

  // Flatten database structural records layout arrays directly into shape parameters matching initial client fields schemas expectation paths
  const flattenedProfileData = {
    id: currencyRecord.id,
    name: currencyRecord.name,
    isoCode: currencyRecord.isoCode,
    symbol: currencyRecord.symbol,
    decimalPlaces: currencyRecord.decimalPlaces,
    decimalSeparator: currencyRecord.decimalSeparator,
    thousandsSeparator: currencyRecord.thousandsSeparator,
    isSymbolFirst: currencyRecord.isSymbolFirst,
    negativeType: currencyRecord.negativeType,
    exchangeRate: currencyRecord.conversions[0] ? Number(currencyRecord.conversions[0].exchangeRate) : 1.00000000,
    isManual: currencyRecord.conversions[0] ? currencyRecord.conversions[0].isManual : true
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-6 space-y-4 ">
      {/* HEADER */}
      <Link
        href="/dashboard/currencies"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Cancel Configuration Changes
      </Link>
      <PageHeader
        title={
          <>
            Adjust Forex Parameters Map:
            <span className="font-mono bg-muted border px-2 py-0.5 rounded text-xs font-bold text-foreground inline-block">
              {currencyRecord.isoCode}
            </span>
          </>
        }
        description="Modify baseline localization accounting layouts rules settings or alter manual adjustment valuation override coefficient factors fields links trackers."
        icon={SlidersHorizontal}
      />

      {/* Mount form container pre-hydrated with structural data payload from database validation process step */}
      <CurrencyForm initialData={flattenedProfileData} />

    </div>
  );
}