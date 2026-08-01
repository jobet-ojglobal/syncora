// app/dashboard/taxing-scheme/[id]/edit/page.tsx
import { Metadata } from 'next';
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Percent } from "lucide-react";
import { TaxingSchemeForm } from "@/components/taxing-scheme/taxing-scheme-form";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/layout/dashboard/PageHeader";

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: "Edit Taxing Scheme | Dashboard",
  description: "Modify multi-tier regional tax calculation rules, handle cascading or compounding rates, and structure delivery freight tax criteria.",
};

export default async function EditTaxingSchemePage({ params }: Props) {
  const { id } = await params;
  
  const taxing = await prisma.taxingScheme.findUnique({
    where: { id, deletedAt: null },
    include: { taxCodes: true }
  });
  
  if (!taxing) notFound();

  const { taxCodes, ...taxingScheme } = taxing;

  // Convert schema properties to fit the exact runtime signatures expected by React Hook Form & Zod
  const formattedtaxCodes = taxCodes.map((tax) => ({
    id: tax.inflowId, // Maps database internal cloud reference down to the form code array context
    name: tax.name,
    isActive: tax.isActive,
    tax1Rate: tax.tax1Rate ? Number(tax.tax1Rate) : 0, 
    tax2Rate: tax.tax2Rate ? Number(tax.tax2Rate) : 0,
    // 🌟 Match against parent's default ID string to pass explicit boolean flags to rows
    isDefault: taxingScheme.defaultTaxCodeId === tax.inflowId, 
  }));

  const formattedTaxingScheme = {
    id: taxingScheme.id,
    name: taxingScheme.name,
    isActive: taxingScheme.isActive,
    isDefault: taxingScheme.isDefault,
    calculateTax2OnTax1: taxingScheme.calculateTax2OnTax1,
    tax1Name: taxingScheme.tax1Name || "",
    tax1OnShipping: taxingScheme.tax1OnShipping,
    tax2Name: taxingScheme.tax2Name || "",
    tax2OnShipping: taxingScheme.tax2OnShipping,
    taxCodes: formattedtaxCodes // React Hook Form now accurately determines the correct active radio item
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6 text-xs">
      {/* <Link
        href="/dashboard/settings/financial/taxing"
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Taxing Schemes
      </Link> */}
      <PageHeader 
        title="Edit Taxing Scheme"
        description="Modify multi-tier regional tax calculation rules, handle cascading or compounding rates ($Tax2 \times [Subtotal + Tax1]$), and structure delivery freight tax criteria."
        icon={Percent}
        className="border-b border-border pb-4"
      />
      <TaxingSchemeForm initialData={formattedTaxingScheme} />
    </div>
  );
}
