"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import PageHeader from "@/components/layout/dashboard/PageHeader";
import { ProductForm } from "@/components/products/product-form";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface HydrationPayload {
  uoms: any[];
  brands: any[];
  groups: any[];
  initialProductData: any | null;
}

export default function EditProductPage() {
  const params = useParams();
  const id = params.id as string;

  const [hydrationData, setHydrationData] = useState<HydrationPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    async function loadFormRequirements() {
      try {
        // Run all fetch pipelines concurrently to eliminate network waterfall delays
        const [uomRes, brandRes, groupRes, productRes] = await Promise.all([
          fetch("/api/admin/uoms/form-hydration"),
          fetch("/api/admin/brands/basic"),
          fetch("/api/admin/groups/matrix"),
          fetch(`/api/admin/products/${id}/basic`), // Fetches the single product route we updated earlier
        ]);

        if (!uomRes.ok || !brandRes.ok || !groupRes.ok ) {
          throw new Error("One or more core configuration pipelines failed to download data layers.");
        }

        if (productRes.status === 404) {
          throw new Error("The targeted product SKU record could not be located.");
        }

        if (!productRes.ok) {
          throw new Error("Failed compiling specific inventory variant profile parameter states.");
        }

        const [uomData, brandData, groupData, productData] = await Promise.all([
          uomRes.json(),
          brandRes.json(),
          groupRes.json(),
          productRes.json(),
        ]);

        // Safely map incoming backend payloads into a unified client state structure
        setHydrationData({
          uoms: uomData.uomListLookup || [],
          brands: brandData || [],
          groups: groupData || [],
          initialProductData: productData,
        });
      } catch (err: any) {
        setError(err.message || "Failed hydrating product catalog dependency systems.");
        toast.error("Data Synch Fault", { description: err.message });
      }
    }

    loadFormRequirements();
  }, [id]);

  if (error) {
    return (
      <div className="p-6 max-w-5xl mx-auto mt-6 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-xl">
        {error}
      </div>
    );
  }

  if (!hydrationData) {
    return (
      <div className="p-24 flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground italic">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        Syncing metrics scales, current variant parameters, and catalog department records...
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto p-6 space-y-6">
      {/* NAVIGATION CONTROLS */}
      <Link
        href="/dashboard/products"
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Products
      </Link>

      <PageHeader 
        title={`Edit Product: ${hydrationData.initialProductData?.name || "Modify SKU"}`}
        description="Update operational configurations, barcodes registry arrays, and unit conversion variables." 
      />

      {/* PRODUCT CONFIGURATION FORM */}
      <ProductForm 
        brands={hydrationData.brands} 
        uoms={hydrationData.uoms} 
        groups={hydrationData.groups}
        initialData={hydrationData.initialProductData} // Pass initial database fields right here
      />
    </div>
  );
}