// app/admin/customers/edit/[id]/page.tsx
import { ArrowLeft, Edit3 } from "lucide-react";
import PageHeader from "@/components/layout/dashboard/PageHeader";
import UnifiedCustomerForm from "@/components/customer/unified-customer-form";
import Link from "next/link";

interface EditCustomerPageProps {
  params: Promise<{
    id: string;
  }>;
}

export const metadata = {
  title: "Modify Commercial Account Parameters | Corporate CRM Management",
  description: "Alter target legal partner entity operational configurations vectors rules or modify structural primary headquarters addresses vectors data fields lines nodes records."
};

async function fetchCustomer(id: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/admin/customers/${id}`,
      {
        cache: "no-store",
      }
    );

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error("Error loading customer data:", error);
    return null;
  }
}

export default async function ModifyExistingCustomerProfileLedgerPage({ params }: EditCustomerPageProps) {
  const resolvedParameters = await params;
  const targetId = resolvedParameters.id;

  // Fetch all dependencies in parallel at the server level
  const [pricing, taxing, terms, locations, reps, customerData] = await Promise.all([
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/admin/pricing-scheme/basic`).then(r => r.json()),
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/admin/taxing-scheme/basic`).then(r => r.json()),
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/admin/payment-terms/basic`).then(r => r.json()),
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/admin/locations/basic`).then(r => r.json()),
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/admin/team-members/sales`).then(r => r.json()),
    fetchCustomer(targetId), 
  ]);

  return (
    <div className="w-full max-w-5xl mx-auto p-6 space-y-4 ">
      {/* HEADER */}
      <Link
        href="/dashboard/customers"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
          Return to Customer Directory
      </Link>
      <PageHeader 
        title="Modify Commercial Portfolio File Ledger Row" 
        description="Adjust registered target customer ledger parameters handles, coordinate pricing matrix strategies allocations values adjustments, or override historical headquarters routing fields properties values safely."
        icon={Edit3}
      />
      <UnifiedCustomerForm 
        initialData={customerData} // Pass the data here
        catalogs={{ pricing, taxing, terms, locations, reps }} 
      />
    </div>
  );
}