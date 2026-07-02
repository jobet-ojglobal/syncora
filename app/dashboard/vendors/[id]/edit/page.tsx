// app/admin/vendors/edit/[id]/page.tsx
import { ArrowLeft, Edit3 } from "lucide-react";
import PageHeader from "@/components/layout/dashboard/PageHeader";
import { VendorForm } from "@/components/vendor/vendor-form";
import Link from "next/link";

interface EditVendorPageProps {
  params: Promise<{
    id: string;
  }>;
}

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

  // Fetch all dependencies in parallel at the server level
  const [taxing, terms, currencies, vendor] = await Promise.all([
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/admin/taxing-scheme/basic`).then(r => r.json()),
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/admin/payment-terms/basic`).then(r => r.json()),
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/admin/currencies/basic`).then(r => r.json()),
    fetchVendor(targetId), 
  ]);

  return (
    <div className="w-full max-w-5xl mx-auto p-6 space-y-4 ">
      {/* HEADER */}
      <Link
        href="/dashboard/vendors"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
          Return to Vendor Directory
      </Link>
      <PageHeader 
        title="Edit Vendor" 
        description={`Modifying profile for ${vendor.businessPartner.name}`}
        icon={Edit3}
      />
      <VendorForm 
        initialData={vendor} 
        catalogs={{  taxing, terms, currencies}} 
      />
    </div>
  );
}

// import { notFound } from "next/navigation";
// import prisma from "@/lib/prisma";
// import { VendorForm } from "@/components/vendors/VendorForm";
// import { updateVendorAction } from "@/app/actions/vendorActions";

// interface EditVendorPageProps {
//   params: {
//     id: string;
//   };
// }

// export default async function EditVendorPage({ params }: EditVendorPageProps) {
//   // Fetch catalogs and the specific vendor in parallel
//   const [currencies, paymentTerms, taxingSchemes, vendor] = await Promise.all([
//     prisma.currency.findMany({ select: { inflowId: true, name: true } }),
//     prisma.paymentTerm.findMany({ select: { inflowId: true, name: true } }),
//     prisma.taxingScheme.findMany({ select: { inflowId: true, name: true } }),
//     prisma.vendor.findUnique({
//       where: { id: params.id },
//       include: {
//         businessPartner: {
//           include: {
//             addresses: true,
//           },
//         },
//       },
//     }),
//   ]);

//   if (!vendor || !vendor.businessPartner) {
//     notFound();
//   }

//   const catalogs = {
//     currencies: currencies.map((c) => ({ id: c.inflowId, name: c.name })),
//     paymentTerms: paymentTerms.map((p) => ({ id: p.inflowId, name: p.name })),
//     taxingSchemes: taxingSchemes.map((t) => ({ id: t.inflowId, name: t.name })),
//   };

//   // Flatten the Prisma relational data into the flat shape expected by Zod
//   const initialData = {
//     // Business Partner Data
//     name: vendor.businessPartner.name,
//     contactName: vendor.businessPartner.contactName || undefined,
//     email: vendor.businessPartner.email || undefined,
//     phone: vendor.businessPartner.phone || undefined,
//     website: vendor.businessPartner.website || undefined,
//     remarks: vendor.businessPartner.remarks || undefined,
//     isActive: vendor.businessPartner.isActive,

//     // Vendor Specific Data
//     currencyId: vendor.currencyId || undefined,
//     defaultPaymentTermsId: vendor.defaultPaymentTermsId || undefined,
//     taxingSchemeId: vendor.taxingSchemeId || undefined,
//     discount: vendor.discount ? Number(vendor.discount) : undefined,
//     leadTimeDays: vendor.leadTimeDays || undefined,
//     isTaxInclusivePricing: vendor.isTaxInclusivePricing,

//     // Map nested addresses
//     addresses: vendor.businessPartner.addresses.map((address) => ({
//       id: address.id,
//       name: address.name || undefined,
//       address1: address.address1 || undefined,
//       address2: address.address2 || undefined,
//       city: address.city || undefined,
//       state: address.state || undefined,
//       country: address.country || undefined,
//       postalCode: address.postalCode || undefined,
//       remarks: address.remarks || undefined,
//       addressType: address.addressType || undefined,
//     })),
//   };

//   // Create a bound action so the server action knows which ID to update
//   const updateActionWithId = updateVendorAction.bind(null, vendor.id);

//   return (
//     <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
//       <div className="mb-8">
//         <h1 className="text-2xl font-bold text-gray-900">Edit Vendor</h1>
//         <p className="text-gray-500 text-sm mt-1">
//           Modifying profile for {vendor.businessPartner.name}
//         </p>
//       </div>

//       <VendorForm 
//         initialData={initialData} 
//         catalogs={catalogs} 
//         onSubmit={updateActionWithId} 
//       />
//     </div>
//   );
// }

