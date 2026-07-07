// app/admin/vendors/create/page.tsx
import { ArrowLeft, Building2 } from "lucide-react";
import Link from "next/link";
import PageHeader from "@/components/layout/dashboard/PageHeader";
import { VendorForm } from "@/components/vendor/vendor-form";
import { getVendorMetadata } from "@/services/vendor.metadata";

export default async function OnboardNewVendorAccountPage() {
  // Resolve data matrices on the database layer; zero inner network runtime delays
  const catalogs = await getVendorMetadata();

  return (
    <div className="w-full mx-auto px-6 space-y-4 py-12">
      {/* HEADER */}
      <Link
        href="/dashboard/vendors"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Vendor Directory
      </Link>
      
      <PageHeader 
        title="Create New Vendor" 
        description="Add a new business partner and vendor profile to your system."
        icon={Building2}
      />

      <VendorForm catalogs={catalogs} />
    </div>
  );
}

// import { VendorForm } from "@/components/vendors/vendor-form";
// // Assuming you have a server action defined for handling the submission

// export default async function CreateVendorPage() {
//   // Fetch dependencies for dropdowns in parallel
//   const [currencies, paymentTerms, taxingSchemes] = await Promise.all([
//     prisma.currency.findMany({ select: { inflowId: true, name: true } }),
//     prisma.paymentTerm.findMany({ select: { inflowId: true, name: true } }),
//     prisma.taxingScheme.findMany({ select: { inflowId: true, name: true } }),
//   ]);

//   // Format catalogs to match the VendorFormProps interface
//   const catalogs = {
//     currencies: currencies.map((c) => ({ id: c.inflowId, name: c.name })),
//     paymentTerms: paymentTerms.map((p) => ({ id: p.inflowId, name: p.name })),
//     taxingSchemes: taxingSchemes.map((t) => ({ id: t.inflowId, name: t.name })),
//   };

//   return (
//     <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
//       <div className="mb-8">
//         <h1 className="text-2xl font-bold text-gray-900">Create New Vendor</h1>
//         <p className="text-gray-500 text-sm mt-1">
//           Add a new business partner and vendor profile to your system.
//         </p>
//       </div>

//       <VendorForm 
//         catalogs={catalogs} 
//       />
//     </div>
//   );
// }