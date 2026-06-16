// app/admin/inventory/[id]/edit/page.tsx
import Link from "next/link";
import {
  ArrowLeft,
} from "lucide-react";
import PageHeader from "@/components/layout/dashboard/PageHeader";
import { notFound } from "next/navigation";
import { InventoryForm } from "@/components/inventory/inventory-form.adjustment";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user";


async function getInventory(id: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/admin/inventory/${id}/basic`,
      {
        cache: "no-store",
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

export default async function InventoryAdjustmentPage({ params }: Props) {
  const { id } = await params;
  const inventory = await getInventory(id);
  const currentUser = await getCurrentUser()



  if(!inventory) notFound();
  
  const [products, locations, sublocations] = await Promise.all([
    prisma.product.findMany({
      select: {
        inflowId: true,
        name: true,
      },
      orderBy: { name: "asc" },
    }),

    prisma.location.findMany({
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
        href="/dashboard/inventory"
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Inventory
      </Link>
      <PageHeader 
        title="Inventory Adjustment"
        description="Update inventory" 
      />
      <InventoryForm 
        currentUser={currentUser}
        initialData={inventory} 
        products={products.map((p) => ({
          inflowId: p.inflowId,
          name: p.name,
        }))}
        locations={locations.map((l) => ({
          inflowId: l.inflowId,
          name: l.name,
        }))}
        sublocations={sublocations} />
    </div>
  );
}