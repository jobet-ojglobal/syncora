import Link from "next/link";
import { ArrowLeft, Layers } from "lucide-react";
import PageHeader from "@/components/layout/dashboard/PageHeader";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BrandForm } from "@/components/brand/brand-form";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;

  // Resolve metadata lookups and individual item queries in true parallel pipeline
  const brand = prisma.brand.findUnique({
      where: {
        id,
      },
      select: { 
        id: true,
        name: true, 
        description: true, 
        websiteUrl: true,
        logoUrl: true
      },
    });

  if (!brand) return notFound();

  return (
    <div className="w-full max-w-2xl mx-auto p-6 space-y-6">
      <Link
        href="/dashboard/brands"
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Groups
      </Link>
      <PageHeader 
        title="Edit Brand"
        description="Update brand information and settings." 
        icon={Layers}
      />
      <BrandForm initialData={brand} />
    </div>
  );
}

// import Link from "next/link";
// import {
//   ArrowLeft,
// } from "lucide-react";
// import PageHeader from "@/components/layout/dashboard/PageHeader";
// import { BrandForm } from "@/components/brand/brand-form";
// import { notFound } from "next/navigation";


// async function getBrand(id: string) {
//   try {
//     const response = await fetch(
//       `${process.env.NEXT_PUBLIC_SITE_URL}/api/admin/brands/${id}/basic`,
//       {
//         cache: "no-store",
//       }
//     );

//     if (!response.ok) return null;
//     return await response.json();
//   } catch (error) {
//     console.error("Error loading brand data:", error);
//     return null;
//   }
// }

// interface Props {
//   params: Promise<{
//     id: string;
//   }>;
// }

// export default async function EditBrandPage({ params }: Props) {
//   const { id } = await params;
//   const brand = await getBrand(id);

//   if(!brand) notFound();
//   return (
//     <div className="w-full max-w-xl mx-auto p-6 space-y-6">
//       {/* HEADER */}
//       <Link
//         href="/dashboard/brands"
//         className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
//       >
//         <ArrowLeft className="h-4 w-4" />
//         Back to Brands
//       </Link>
//       <PageHeader 
//         title="Edit Brand"
//         description="Update brand information and settings." 
//       />
//       <BrandForm initialData={brand} />
//     </div>
//   );
// }
