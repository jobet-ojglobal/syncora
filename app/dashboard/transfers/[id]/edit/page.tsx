import Link from "next/link";
import {
  ArrowLeft,
} from "lucide-react";
import PageHeader from "@/components/layout/dashboard/PageHeader";
import { TransferOrderForm } from "@/components/transfer/transfer-form";
import { prisma } from "@/lib/prisma";

async function getTransfer(id: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/admin/transfers/${id}/basic`,
      {
        cache: "no-store",
        next: { revalidate: 0 }
      }
    );

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error("Error loading inventory data:", error);
    return null;
  }
}

interface Props {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditTransferPage({ params }: Props) {
  const { id } = await params;
  const transfer = await getTransfer(id);

   const [products, locations, sublocations] = await Promise.all([
    prisma.product.findMany({
      select: {
        inflowId: true,
        name: true,
      },
      orderBy: { name: "asc" },
    }),

    prisma.location.findMany({
      where: {
        isActive: true,
        deletedAt: null
      },
      select: {
        inflowId: true,
        name: true,
      },
      orderBy: { name: "asc" },
    }),

    prisma.sublocation.findMany({
      select: {
        id: true,
        name: true,
        locationId: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);
  return (
    <div className="w-full max-w-2xl mx-auto p-6 space-y-6">
      {/* HEADER */}
      <Link
        href="/dashboard/transfers"
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Transfers
      </Link>
      <PageHeader 
        title="Edit Transfer"
        description="Edit transfer." 
      />
      <TransferOrderForm
        initialData={transfer}
        products={products.map((p) => ({
          inflowId: p.inflowId,
          name: p.name,
        }))}
        locations={locations.map((l) => ({
          inflowId: l.inflowId,
          name: l.name,
        }))}
        sublocations={sublocations}
       />
    </div>
  );
}
