"use client";

import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import PageHeader from "@/components/layout/dashboard/PageHeader";
import { ProductForm } from "@/components/products/product-form";
import { useEffect, useState } from "react";

interface HydrationPayload {
  uoms: any[];
  brands: any[];
  categories: any[];
}

export default function CreateProductPage() {
  const [hydrationData, setHydrationData] = useState<HydrationPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadFormRequirements() {
      try {
        // Run all fetch pipelines concurrently to eliminate network waterfall delays
        const [uomRes, brandRes, catRes] = await Promise.all([
          fetch("/api/admin/uoms/form-hydration"),
          fetch("/api/admin/brands/basic"),
          fetch("/api/admin/categories/basic"),
        ]);

        if (!uomRes.ok || !brandRes.ok || !catRes.ok) {
          throw new Error("One or more configuration pipelines failed to download data layers.");
        }

        const [uomData, brandData, catData] = await Promise.all([
          uomRes.json(),
          brandRes.json(),
          catRes.json(),
        ]);

        // Safely map incoming backend payloads into a unified client state structure
        setHydrationData({
          uoms: uomData.uomListLookup || [],
          brands: brandData || [],
          categories: catData || [],
        });
      } catch (err: any) {
        setError(err.message || "Failed hydrating product catalog dependency systems.");
      }
    }

    loadFormRequirements();
  }, []);

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
        Syncing metrics scales, brand alignments, and catalog department records...
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
        title="Create Product"
        description="Register a new master inventory item with multi-tier measurement rules." 
      />

      {/* PRODUCT CONFIGURATION FORM */}
      <ProductForm 
        brands={hydrationData.brands} 
        categories={hydrationData.categories} 
        uoms={hydrationData.uoms} 
      />
    </div>
  );
}