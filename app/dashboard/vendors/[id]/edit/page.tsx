import { ArrowLeft, Edit3 } from "lucide-react";
import PageHeader from "@/components/layout/dashboard/PageHeader";
import Link from "next/link";
import { VendorForm } from "@/components/vendor/vendor-form";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getVendorMetadata } from "@/services/vendor.metadata";

interface EditVendorPageProps {
  params: Promise<{
    id: string;
  }>;
}

export const metadata = {
  title: "Modify Commercial Account Parameters | Corporate CRM Management",
  description: "Alter target legal partner entity operational configurations vectors rules or modify structural primary headquarters addresses vectors data fields lines nodes records."
};

export default async function ModifyExistingVendorProfileLedgerPage({ params }: EditVendorPageProps) {
  const { id: targetId } = await params;

  // 1. Fetch catalogs and target vendor entity concurrently directly from the database layer
  const [catalogs, vendorRaw] = await Promise.all([
    getVendorMetadata(),
    prisma.vendor.findUnique({
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

  // Fail gracefully if entity was deleted or not found
  if (!vendorRaw || vendorRaw.deletedAt) return notFound();

  const { businessPartner, ...vendorFields } = vendorRaw;

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
    isDefaultAddress: addr.inflowId ? addr.inflowId === vendorFields.defaultAddressId : false,
  }));

  // 2. Flatten relational structures cleanly for direct form consumption matching your target mapper
  const initialFormData = {
    id: vendorRaw.id,
    name: vendorRaw.businessPartner.name,
    contactName: vendorRaw.businessPartner.contactName ?? "",
    email: vendorRaw.businessPartner.email || "",
    phone: vendorRaw.businessPartner.phone ?? "",
    fax: vendorRaw.businessPartner.fax || "",
    website: vendorRaw.businessPartner.website || "",
    isActive: vendorRaw.businessPartner.isActive,
    remarks: vendorRaw.businessPartner.remarks || "",

    defaultCarrier: vendorRaw.defaultCarrier || "",
    defaultPaymentMethod: vendorRaw.defaultPaymentMethod || "",
    
    // Handles numeric transformations safely matching Zod rules
    discount: vendorRaw.discount ? Number(vendorRaw.discount) : undefined, 
    leadTimeDays: vendorRaw.leadTimeDays ?? undefined,
    
    defaultPaymentTermsId: vendorRaw.defaultPaymentTermsId || "",
    taxingSchemeId: vendorRaw.taxingSchemeId || "",
    isTaxInclusivePricing: vendorRaw.isTaxInclusivePricing ?? false,
    currencyId: vendorRaw.currencyId || "",

    addresses: formattedAddresses,
  };

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
        initialData={initialFormData} 
        catalogs={catalogs}
      /> 
    </div>
  );
}