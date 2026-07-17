import { ArrowLeft, Edit3 } from "lucide-react";
import Link from "next/link";
import PageHeader from "@/components/layout/dashboard/PageHeader";
import UnifiedCustomerForm from "@/components/customer/unified-customer-form";
import { prisma } from "@/lib/prisma"; 
import { notFound } from "next/navigation";
import { getBusinessPartnerMetadata } from "@/services/customer.metadata";

interface EditCustomerPageProps {
  params: Promise<{
    id: string;
  }>;
}

export const metadata = {
  title: "Modify Commercial Account Parameters | Corporate CRM Management",
  description: "Alter target legal partner entity operational configurations vectors rules or modify structural primary headquarters addresses vectors data fields lines nodes records."
};

export default async function ModifyExistingCustomerProfileLedgerPage({ params }: EditCustomerPageProps) {
  const { id: targetId } = await params;

  // Resolve catalogs service and specific customer entity concurrently without HTTP overhead
  const [catalogs, customerData] = await Promise.all([
    getBusinessPartnerMetadata(),
    prisma.customer.findUnique({
      where: { id: targetId },
      include: {
        businessPartner: {
          include: {
            addresses: true,
          },
        },
      },
    }),
  ]);

  if (!customerData || customerData.deletedAt) return notFound();

  const { businessPartner, ...customerFields } = customerData;

  // Transform addresses to flag defaults matching your Zod/Form layout
  const formattedAddresses = businessPartner.addresses.map((addr: any) => ({
    id: addr.id,
    name: addr.name ?? "",
    address1: addr.address1 ?? "",
    address2: addr.address2 ?? "",
    city: addr.city ?? "",
    state: addr.state ?? "",
    country: addr.country ?? "Philippines",
    postalCode: addr.postalCode ?? "",
    addressType: addr.addressType ?? null,
    remarks: addr.remarks ?? "",
    isDefaultBilling: addr.inflowId ? addr.inflowId === customerFields.defaultBillingAddressId : false,
    isDefaultShipping: addr.inflowId ? addr.inflowId === customerFields.defaultShippingAddressId : false,
  }));

  // Normalize final payload to strictly align with CustomerMasterInput type structures
  const initialFormData = {
    id: customerFields.id,
    name: businessPartner.name,
    contactName: businessPartner.contactName ?? "",
    email: businessPartner.email ?? "",
    phone: businessPartner.phone ?? "",
    website: businessPartner.website ?? "",
    isActive: businessPartner.isActive,
    remarks: businessPartner.remarks ?? "",
    fax: businessPartner.fax ?? "",
    
    discount: customerFields.discount ? Number(customerFields.discount) : 0, // Clean Decimal conversion
    taxExemptNumber: customerFields.taxExemptNumber ?? "",
    defaultCarrier: customerFields.defaultCarrier ?? "",
    defaultPaymentMethod: customerFields.defaultPaymentMethod ?? "",
    
    defaultLocationId: customerFields.defaultLocationId ?? "",
    defaultPaymentTermsId: customerFields.defaultPaymentTermsId ?? "",
    pricingSchemeId: customerFields.pricingSchemeId ?? "",
    taxingSchemeId: customerFields.taxingSchemeId ?? "",
    defaultSalesRepTeamMemberId: customerFields.defaultSalesRepTeamMemberId ?? "",

    addresses: formattedAddresses,
  };

  return (
    <div className="w-full mx-auto px-6 py-12 space-y-4">
      {/* NAVIGATION CONTROLS */}
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
        initialData={initialFormData} 
        catalogs={catalogs} 
      />
    </div>
  );
}