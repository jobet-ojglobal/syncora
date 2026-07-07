import { ArrowLeft, Building2 } from "lucide-react";
import Link from "next/link";
import PageHeader from "@/components/layout/dashboard/PageHeader";
import UnifiedCustomerForm from "@/components/customer/unified-customer-form";
import { getCustomerMetadata } from "@/services/customer.metadata";

export const metadata = {
  title: "Onboard Business Client Partner | Management Directory",
  description: "Instantiate legal corporate entity profiles and map relational billing profiles settings configuration indexes lines nodes."
};

export default async function OnboardNewCustomerAccountPage() {
  // Fetch dependencies from the extracted backend provider layer
  const catalogs = await getCustomerMetadata();

  return (
    <div className="w-full mx-auto px-6 py-12 space-y-4">
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

      <UnifiedCustomerForm catalogs={catalogs} />
    </div>
  );
}