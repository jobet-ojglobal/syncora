import { Metadata } from "next";
import { notFound } from "next/navigation";
import { MapPin } from "lucide-react";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/layout/dashboard/PageHeader";
import { LocationForm } from "@/components/location/location-form";

interface EditLocationProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: EditLocationProps): Promise<Metadata> {
  const { id } = await params;
  const location = await prisma.location.findUnique({
    where: { id },
    select: { name: true },
  });

  if (!location) {
    return {
      title: "Location Not Found",
    };
  }

  return {
    title: `Edit ${location.name} | Admin`,
    description: `Edit location details, address, and sublocations for ${location.name}.`,
  };
}

export default async function EditLocationPage({ params }: EditLocationProps) {
  const { id } = await params;

  const locationRecord = await prisma.location.findUnique({
    where: { id, deletedAt: null },
    include: {
      address: true,
      sublocations: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!locationRecord) {
    notFound();
  }

  const initialData = {
    inflowId: locationRecord.inflowId,
    name: locationRecord.name,
    isActive: locationRecord.isActive,
    isDefault: locationRecord.isDefault,
    url: locationRecord.url ?? "",
    address: locationRecord.address
      ? {
          address1: locationRecord.address.address1,
          address2: locationRecord.address.address2,
          city: locationRecord.address.city,
          state: locationRecord.address.state,
          country: locationRecord.address.country,
          postalCode: locationRecord.address.postalCode,
          remarks: locationRecord.address.remarks,
          addressType: locationRecord.address.addressType,
        }
      : null,
    sublocations: locationRecord.sublocations.map((sublocation) => ({
      id: sublocation.id,
      name: sublocation.name,
    })),
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6 text-xs">
      <PageHeader
        title={`Edit ${locationRecord.name}`}
        description="Manage location parameters, physical address details, and connected sublocation bins."
        icon={MapPin}
      />

      <LocationForm initialData={initialData} />
    </div>
  );
}

// import Link from "next/link";
// import {
//   ArrowLeft,
// } from "lucide-react";
// import { notFound } from "next/navigation";
// import PageHeader from "@/components/layout/dashboard/PageHeader";
// import { LocationForm } from "@/components/location/location-form";

// async function getLocation(id: string) {
//   try {
//     const response = await fetch(
//       `${process.env.NEXT_PUBLIC_SITE_URL}/api/admin/locations/${id}/basic`,
//       {
//         cache: "no-store",
//       }
//     );

//     if (!response.ok) return null;
//     return await response.json();
//   } catch (error) {
//     console.error("Error loading product data:", error);
//     return null;
//   }
// }

// interface Props {
//   params: Promise<{
//     id: string;
//   }>;
// }

// export default async function EditLocationPage({ params }: Props) {
//   const { id } = await params;
//   const location = await getLocation(id);

//   if(!location) notFound();

//   return (
//     <div className="w-full max-w-7xl mx-auto px-6 py-12 space-y-6">
//       {/* HEADER */}
//       {/* <Link
//         href="/dashboard/locations"
//         className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
//       >
//         <ArrowLeft className="h-4 w-4" />
//         Back to Location
//       </Link> */}
//       <PageHeader 
//         title="Edit Location" 
//         description="Update location information." 
//       />

//       <LocationForm initialData={location} />
//     </div>
//   );
// }


