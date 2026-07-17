import { ArrowLeft, Contact2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@/components/layout/dashboard/PageHeader";
import { BusinessPartnerForm } from "@/components/partner/business-partner-form"; 
import { getBusinessPartnerMetadata } from "@/services/customer.metadata";
import { prisma } from "@/lib/prisma"; 
import { BusinessPartnerFormData } from "@/schemas/business-partner.scheme"; 

interface EditBusinessPartnerProps {
  params: Promise<{ id: string }>;
}

export default async function EditBusinessPartner({ params }: EditBusinessPartnerProps) {
  // 1. Resolve params and fetch metadata catalog dictionaries
  const { id } = await params;
  const catalogs = await getBusinessPartnerMetadata();

  // 2. Query initial data with all necessary operational relations included
  const businessPartner = await prisma.businessPartner.findUnique({
    where: {
      id: id,
    },
    include: {
      customer: true,
      vendor: true,
      addresses: {
        orderBy: {
          createdAt: "asc", // Keeps address sorting predictable inside form array fields
        },
      },
    },
  });

  // 3. Prevent rendering if target identifier is invalid
  if (!businessPartner) {
    notFound();
  }

  // 4. Adapt and transform the deep Prisma model data to fit the Zod form matrix
  const initialFormData: Partial<BusinessPartnerFormData> = {
    id: businessPartner.id,
    name: businessPartner.name,
    contactName: businessPartner.contactName,
    email: businessPartner.email || "",
    phone: businessPartner.phone,
    fax: businessPartner.fax,
    website: businessPartner.website || "",
    remarks: businessPartner.remarks,
    isActive: businessPartner.isActive,

    // Flags determining whether sub-configuration layers should render/validate
    isCustomer: !!businessPartner.customer,
    isVendor: !!businessPartner.vendor,

    // Hydrate Customer Configurations if present
    customerConfig: businessPartner.customer
      ? {
          taxExemptNumber: businessPartner.customer.taxExemptNumber,
          defaultCarrier: businessPartner.customer.defaultCarrier,
          defaultPaymentMethod: businessPartner.customer.defaultPaymentMethod || "",
          discount: businessPartner.customer.discount ? Number(businessPartner.customer.discount) : 0,
          defaultLocationId: businessPartner.customer.defaultLocationId,
          defaultPaymentTermsId: businessPartner.customer.defaultPaymentTermsId,
          pricingSchemeId: businessPartner.customer.pricingSchemeId || "",
          taxingSchemeId: businessPartner.customer.taxingSchemeId,
          defaultSalesRepTeamMemberId: businessPartner.customer.defaultSalesRepTeamMemberId,
        }
      : undefined,

    // Hydrate Vendor Configurations if present
    vendorConfig: businessPartner.vendor
      ? {
          defaultCarrier: businessPartner.vendor.defaultCarrier,
          defaultPaymentMethod: businessPartner.vendor.defaultPaymentMethod || "",
          discount: businessPartner.vendor.discount ? Number(businessPartner.vendor.discount) : 0,
          isTaxInclusivePricing: businessPartner.vendor.isTaxInclusivePricing,
          leadTimeDays: businessPartner.vendor.leadTimeDays || 0,
          currencyId: businessPartner.vendor.currencyId,
          defaultPaymentTermsId: businessPartner.vendor.defaultPaymentTermsId,
          taxingSchemeId: businessPartner.vendor.taxingSchemeId,
        }
      : undefined,

    // Map address identities, linking flag states back to customer/vendor reference points
    addresses: businessPartner.addresses.map((addr) => ({
      id: addr.id,
      name: addr.name || "",
      address1: addr.address1 || "",
      address2: addr.address2 || undefined,
      city: addr.city || "",
      state: addr.state || "",
      country: addr.country || "",
      postalCode: addr.postalCode || "",
      addressType: addr.addressType || null,
      remarks: addr.remarks || undefined,
      isDefaultBilling: businessPartner.customer?.defaultBillingAddressId === addr.inflowId,
      isDefaultShipping: businessPartner.customer?.defaultShippingAddressId === addr.inflowId,
      isDefaultVendorAddress: businessPartner.vendor?.defaultAddressId === addr.inflowId,
    })),
  };

  return (
    <div className="w-full mx-auto px-6 py-12 space-y-4">
      {/* Dynamic Breadcrumbs Go-Back Navigation Link */}
      <Link
        href="/dashboard/business-partners"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Business Partners
      </Link>

      {/* Header showcasing the current business partner details being modified */}
      <PageHeader
        title={`Edit Partner: ${businessPartner.name}`}
        description="Update contact credentials, default shipping and billing configurations, tax mappings, or role assignments."
        icon={Contact2}
      />

      {/* Form hydrated with corrected initialData for controlled edit actions */}
      <BusinessPartnerForm 
        initialData={initialFormData} 
        catalogs={catalogs} 
      />
    </div>
  );
}