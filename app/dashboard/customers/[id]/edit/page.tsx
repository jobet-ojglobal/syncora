import { ArrowLeft, Edit3 } from "lucide-react";
import PageHeader from "@/components/layout/dashboard/PageHeader";
import UnifiedCustomerForm from "@/components/customer/unified-customer-form";
import Link from "next/link";
import { prisma } from "@/lib/prisma"; 
import { notFound } from "next/navigation";

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
  const resolvedParameters = await params;
  const targetId = resolvedParameters.id;

  // 2. Fetch all catalogs and target customer data concurrently via Prisma
  const [pricing, taxing, terms, locations, reps, customerData] = await Promise.all([
    (await prisma.pricingScheme.findMany({ select: { inflowId: true, name: true }, orderBy: { name: "asc" } })).map(p => ({
      id: p.inflowId,
      name: p.name,
    })), 
    (await prisma.taxingScheme.findMany({ select: { inflowId: true, name: true }, orderBy: { name: "asc" } })).map(p => ({
      id: p.inflowId,
      name: p.name,
    })),
    (await prisma.paymentTerm.findMany({ select: { inflowId: true, name: true }, orderBy: { name: "asc" } })).map(p => ({
      id: p.inflowId,
      name: p.name,
    })),
    (await prisma.location.findMany({ select: { inflowId: true, name: true }, orderBy: { name: "asc" } })).map(p => ({
      id: p.inflowId,
      name: p.name,
    })),
    ( await prisma.teamMember.findMany({ where: { canBeSalesRep: true }, select: { inflowId: true, name: true }, orderBy: { name: "asc" } })).map(p => ({
      id: p.inflowId,
      name: p.name,
    })),
    // Fetch the specific customer data using the dynamic ID route param
    prisma.customer.findUnique({
      where: { id: targetId },
      include: {
        businessPartner: {
          include: {
            addresses: true,
          },
        },
      },
    })
  ]);

  if (!customerData || customerData.deletedAt) return notFound();

  const { businessPartner, ...customerFields } = customerData;

  // 2. Transform addresses to flag defaults matching your Zod/Form layout
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
    // Compare against customer settings (via inflowId mapping)
    isDefaultBilling: addr.inflowId ? addr.inflowId === customerFields.defaultBillingAddressId : false,
    isDefaultShipping: addr.inflowId ? addr.inflowId === customerFields.defaultShippingAddressId : false,
  }));

  // 3. Normalize the final payload to strictly align with CustomerMasterInput
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
    
    // Extended customer attributes
    discount: customerFields.discount ? Number(customerFields.discount) : 0, // Convert Decimal to JS Number
    taxExemptNumber: customerFields.taxExemptNumber ?? "",
    defaultCarrier: customerFields.defaultCarrier ?? "",
    defaultPaymentMethod: customerFields.defaultPaymentMethod ?? "",
    
    // Structural Relational Lookups
    defaultLocationId: customerFields.defaultLocationId ?? "",
    defaultPaymentTermsId: customerFields.defaultPaymentTermsId ?? "",
    pricingSchemeId: customerFields.pricingSchemeId ?? "",
    taxingSchemeId: customerFields.taxingSchemeId ?? "",
    defaultSalesRepTeamMemberId: customerFields.defaultSalesRepTeamMemberId ?? "",

    // Injected Sub-collection
    addresses: formattedAddresses,
  };

  return (
    <div className="w-full mx-auto px-6 py-12 space-y-4 ">
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
        initialData={initialFormData} 
        catalogs={{ pricing, taxing, terms, locations, reps }} 
      />
    </div>
  );
}