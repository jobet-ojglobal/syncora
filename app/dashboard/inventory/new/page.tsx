import Link from "next/link";
import {
  ArrowLeft,
} from "lucide-react";
import PageHeader from "@/components/layout/dashboard/PageHeader";
import { InventoryForm } from "@/components/inventory/inventory-form";
import { prisma } from "@/lib/prisma";

export default async function NewInventoryPage() {
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
    <div className="w-full max-w-xl mx-auto p-6 space-y-6">
      {/* HEADER */}
      <Link
        href="/dashboard/inventory"
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Inventory
      </Link>
      <PageHeader 
        title="New Inventory"
        description="Add a new inventory" 
      />
      <InventoryForm 
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
