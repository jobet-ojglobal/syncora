import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PageHeader from "@/components/layout/dashboard/PageHeader";
import { prisma } from "@/lib/prisma";
import { InventoryFormV2 } from "@/components/inventory/inventory-multi-form";

export default async function NewInventoryPage() {
  const locations = await prisma.location.findMany({
    where: {
      isActive: true,
      deletedAt: null,
    },
    select: {
      inflowId: true,
      name: true,
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
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
        description="Add a new inventory entry" 
      />
      <InventoryFormV2
        locations={locations.map((l) => ({
          inflowId: l.inflowId,
          name: l.name,
        }))}
      />
    </div>
  );
}