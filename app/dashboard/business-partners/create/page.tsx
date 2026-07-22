import { ArrowLeft, Contact2 } from "lucide-react";
import Link from "next/link";
import PageHeader from "@/components/layout/dashboard/PageHeader";
import { getBusinessPartnerMetadata } from "@/services/customer.metadata";
import { BusinessPartnerForm } from "@/components/partner/business-partner-form";

export default async function OnboardNewPartnerAccountPage() {
  const catalogs = await getBusinessPartnerMetadata();

  return (
    <div className="w-full mx-auto px-6 py-12 max-w-7xl space-y-4">
      <Link
        href="/dashboard/business-partners"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Business Partners
      </Link>
      
      <PageHeader 
        title="Onboard New Partner Account" 
        description="Register a brand new entity in the system directory as a Customer, Vendor, or cross-functional Partner."
        icon={Contact2}
      />

      <BusinessPartnerForm catalogs={catalogs} />
    </div>
  );
}