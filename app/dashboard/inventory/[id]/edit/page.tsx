import Link from "next/link";
import {
  ArrowLeft,
} from "lucide-react";
import PageHeader from "@/components/layout/dashboard/PageHeader";
import { BrandForm } from "@/components/brand/brand-form";
import { notFound } from "next/navigation";


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

  if(!inventory) notFound();
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
        title="Inventory Adjustment"
        description="Update inventory" 
      />
      <BrandForm initialData={inventory} />
    </div>
  );
}
