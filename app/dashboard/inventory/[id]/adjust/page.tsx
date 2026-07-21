import { Suspense } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { InventoryAdjustmentForm } from "@/components/inventory/inventory-adjustment-form";

interface PageProps {
  searchParams: Promise<{
    id?: string;
    locationId?: string;
  }>;
}

// Skeleton fallback while fetching server data
function AdjustmentFormSkeleton() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4 animate-pulse">
      <div className="h-10 w-64 bg-muted rounded-md" />
      <Card>
        <CardContent className="h-32 bg-muted/50 rounded-md" />
      </Card>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="h-24 bg-muted/50 rounded-md" />
        <div className="h-24 bg-muted/50 rounded-md" />
        <div className="h-24 bg-muted/50 rounded-md" />
      </div>
      <Card>
        <CardContent className="h-64 bg-muted/50 rounded-md" />
      </Card>
    </div>
  );
}

export default async function InventoryAdjustmentPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const adjustmentId = resolvedParams.id;
  const preselectedLocationId = resolvedParams.locationId;

  // 1. Fetch Warehouses / Main Locations
  const locationsPromise = prisma.location.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  // 2. Fetch Products with their overall system stock / quantity on hand
  const productsPromise = prisma.product.findMany({
    select: {
      id: true,
      name: true,
      sku: true,
      inventoryItems: {
        select: {
          locationId: true,
          quantityOnHand: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  // 3. Fetch Sublocations / Bins mapped to locations
  const sublocationsPromise = prisma.sublocation.findMany({
    select: {
      id: true,
      name: true,
      locationId: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  // 4. Fetch existing Adjustment Record if editing
  const existingAdjustmentPromise = adjustmentId
    ? prisma.inventoryAdjustment.findUnique({
        where: { id: adjustmentId },
        include: {
          lines: {
            include: {
              product: { select: { name: true } },
              sublocation: { select: { name: true } },
            },
          },
        },
      })
    : Promise.resolve(null);

  // Execute all queries concurrently
  const [locations, rawProducts, sublocations, existingAdjustment] = await Promise.all([
    locationsPromise,
    productsPromise,
    sublocationsPromise,
    existingAdjustmentPromise,
  ]);

  // If edit mode was requested but record doesn't exist
  if (adjustmentId && !existingAdjustment) {
    notFound();
  }

  // Format products for selection dropdowns
  const formattedProducts = rawProducts.map((p) => {
    // Total stock across all locations
    const totalQty = p.inventoryItems.reduce((acc, item) => acc + item.quantityOnHand, 0);
    return {
      id: p.id,
      name: p.sku ? `[${p.sku}] ${p.name}` : p.name,
      currentQuantity: totalQty,
    };
  });

  // Format initial adjustment data if editing
  const initialData = existingAdjustment
    ? {
        id: existingAdjustment.id,
        locationId: existingAdjustment.locationId,
        reason: existingAdjustment.reason as any,
        remarks: existingAdjustment.remarks || "",
        lines: existingAdjustment.lines.map((line) => ({
          id: line.id,
          productId: line.productId,
          productName: line.product.name,
          sublocationId: line.sublocationId || "",
          sublocationName: line.sublocation?.name || "",
          currentQuantity: line.previousQuantity,
          adjustedQuantity: line.newQuantity,
          delta: line.delta,
          reasonNote: line.reason || "",
        })),
      }
    : preselectedLocationId
    ? {
        locationId: preselectedLocationId,
        reason: "DISCREPANCY_FOUND" as const,
        remarks: "",
        lines: [],
      }
    : null;

  return (
    <div className="container py-6">
      <Suspense fallback={<AdjustmentFormSkeleton />}>
        <InventoryAdjustmentForm
          locations={locations}
          products={formattedProducts}
          sublocations={sublocations}
          initialData={initialData}
        />
      </Suspense>
    </div>
  );
}