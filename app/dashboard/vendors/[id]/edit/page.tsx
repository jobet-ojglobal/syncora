// app/admin/customers/edit/[id]/page.tsx
import { ArrowLeft, Edit3 } from "lucide-react";
import PageHeader from "@/components/layout/dashboard/PageHeader";
import Link from "next/link";
import { VendorForm } from "@/components/vendor/vendor-form";

interface EditVendorPageProps {
  params: Promise<{
    id: string;
  }>;
}

export const metadata = {
  title: "Modify Commercial Account Parameters | Corporate CRM Management",
  description: "Alter target legal partner entity operational configurations vectors rules or modify structural primary headquarters addresses vectors data fields lines nodes records."
};

async function fetchVendor(id: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/admin/vendors/${id}`,
      {
        cache: "no-store",
      }
    );

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error("Error loading vendor data:", error);
    return null;
  }
}

export default async function ModifyExistingVendorProfileLedgerPage({ params }: EditVendorPageProps) {
  const resolvedParameters = await params;
  const targetId = resolvedParameters.id;

  const [terms, taxing, currencies, vendorData] = await Promise.all([
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/admin/payment-terms/basic`).then(r => r.json()),
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/admin/taxing-scheme/basic`).then(r => r.json()),
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/admin/currencies/basic`).then(r => r.json()),
    fetchVendor(targetId), 
  ]);

  return (
    <div className="w-full mx-auto px-6 space-y-4 py-12">
      {/* HEADER */}
      <Link
        href="/dashboard/vendors"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
          Return to Vendor Directory
      </Link>
      <PageHeader 
        title="Modify Vendor Portfolio File Ledger Row" 
        description="Adjust registered target vendor ledger parameters handles."
        icon={Edit3}
      />
      <VendorForm
        initialData={vendorData} 
        catalogs={{ terms, taxing, currencies }}
       /> 
    </div>
  );
}