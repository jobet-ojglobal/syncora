// app/admin/customers/new/page.tsx
import { ArrowLeft, Building2 } from "lucide-react";
import Link from "next/link";
import PageHeader from "@/components/layout/dashboard/PageHeader";
import UnifiedCustomerForm from "@/components/customer/unified-customer-form";

export const metadata = {
  title: "Onboard Business Client Partner | Management Directory",
  description: "Instantiate legal corporate entity profiles and map relational billing profiles settings configuration indexes lines nodes."
};

export default async function OnboardNewCustomerAccountPage() {
  const [pricing, taxing, terms, locations, reps] = await Promise.all([
    fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/admin/pricing-scheme/basic`).then(r => r.json()),
    fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/admin/taxing-scheme/basic`).then(r => r.json()),
    fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/admin/payment-terms/basic`).then(r => r.json()),
    fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/admin/locations/basic`).then(r => r.json()),
    fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/admin/team-members/sales`).then(r => r.json()),
  ]);
  return (
    <div className="w-full max-w-5xl mx-auto px-6 py-12 space-y-4 ">
      {/* HEADER */}
      <Link
        href="/dashboard/customers"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Customer Directory
      </Link>
      <PageHeader 
        title="Onboard Customer Profile Account" 
        description="Initialize transactional record streams files configurations vectors, map operational point of contacts coordinators parameters metrics records, and bind standard ledger localized tax parameters."
        icon={Building2}
        />

      {/* Primary Execution Engine Sub-form layout entry point handle link element */}
      <UnifiedCustomerForm 
        catalogs={{ pricing, taxing, terms, locations, reps }}
       />
    </div>
  );
}