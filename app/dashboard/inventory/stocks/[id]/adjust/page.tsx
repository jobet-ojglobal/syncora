import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit3, SlidersHorizontal } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user";
import { AdjustmentService } from "@/services/adjustment.service";

import { Card, CardContent } from "@/components/ui/card";
import PageHeader from "@/components/layout/dashboard/PageHeader";
import { StockAdjustmentFormOutdated } from "@/components/stock/stock-adjustment-form-outdated";
import { StockAdjustmentForm } from "@/components/stock/stock-adjustment-form";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

// Loading Skeleton
export function AdjustmentFormSkeleton() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
      {/* Form Top Section / Global Controls */}
      <Card className="border rounded-xl">
        <CardContent className="p-4 space-y-4">
          <div className="h-5 w-48 bg-muted rounded" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="h-10 bg-muted/60 rounded-md" />
            <div className="h-10 bg-muted/60 rounded-md" />
            <div className="h-10 bg-muted/60 rounded-md" />
          </div>
        </CardContent>
      </Card>

      {/* Product Line Card Skeleton */}
      <div className="border rounded-xl bg-background overflow-hidden shadow-xs space-y-0">
        
        {/* Card Header */}
        <div className="bg-muted/40 p-3 border-b flex justify-between items-center">
          <div className="flex gap-2 items-center">
            {/* Thumbnail */}
            <div className="w-10 h-10 bg-muted/70 rounded-lg shrink-0" />
            
            {/* Product Name & SKU */}
            <div className="space-y-1.5">
              <div className="h-3.5 w-36 bg-muted/80 rounded" />
              <div className="h-2.5 w-20 bg-muted/60 rounded" />
            </div>

            {/* Badges */}
            <div className="flex gap-1.5 ml-2">
              <div className="h-4 w-16 bg-muted/60 rounded-full" />
              <div className="h-4 w-24 bg-muted/60 rounded-full" />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <div className="h-7 w-36 bg-muted/60 rounded-md" />
            <div className="h-7 w-28 bg-muted/60 rounded-md" />
            <div className="w-7 h-7 bg-muted/60 rounded-md" />
          </div>
        </div>

        {/* Section 1: Reasoning & Calculations (4-column grid) */}
        <div className="p-4 border-b bg-muted/20">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-3 w-24 bg-muted/60 rounded" />
                <div className="h-8 bg-muted/50 rounded-md" />
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Target Quantities (3-column grid) */}
        <div className="p-4 border-b bg-muted/5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-3 w-32 bg-muted/60 rounded" />
                <div className="h-8 bg-muted/50 rounded-md" />
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Master Serial Pool */}
        <div className="p-4 border-b bg-muted/10 space-y-3">
          <div className="flex justify-between items-center">
            <div className="h-3.5 w-36 bg-muted/70 rounded" />
            <div className="h-3 w-28 bg-muted/50 rounded" />
          </div>

          {/* Input & Action Buttons Row */}
          <div className="flex flex-wrap gap-2">
            <div className="h-8 w-48 bg-muted/60 rounded-md" />
            <div className="h-8 w-24 bg-muted/60 rounded-md" />
            <div className="h-8 w-20 bg-muted/60 rounded-md" />
            <div className="h-8 w-36 bg-muted/60 rounded-md" />
          </div>

          {/* Serial Chips Mock */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-6 w-20 bg-muted/60 rounded-md" />
            ))}
          </div>
        </div>

        {/* Section 4: Bulk/Unassigned Bar */}
        <div className="flex items-center justify-between py-2 px-4 bg-muted/30 border-b">
          <div className="h-3 w-40 bg-muted/60 rounded" />
          <div className="h-3.5 w-12 bg-muted/80 rounded" />
        </div>

        {/* Section 5: Bins Allocation Section */}
        <div className="p-3 space-y-3">
          <div className="p-3 border rounded-lg bg-card space-y-3">
            {/* Sublocation & Volume Selectors */}
            <div className="grid grid-cols-12 gap-3 items-start">
              <div className="col-span-12 sm:col-span-5 space-y-1.5">
                <div className="h-3 w-24 bg-muted/60 rounded" />
                <div className="h-8 bg-muted/50 rounded-md" />
              </div>
              <div className="col-span-10 sm:col-span-6 space-y-1.5">
                <div className="h-3 w-20 bg-muted/60 rounded" />
                <div className="h-8 bg-muted/50 rounded-md" />
              </div>
              <div className="col-span-2 sm:col-span-1 flex justify-center pt-5">
                <div className="w-7 h-7 bg-muted/60 rounded-md" />
              </div>
            </div>

            {/* Serial Tags Assignment Area */}
            <div className="pt-2 border-t border-dashed space-y-2">
              <div className="flex justify-between items-center">
                <div className="h-3 w-36 bg-muted/60 rounded" />
                <div className="h-3 w-28 bg-muted/50 rounded" />
              </div>
              <div className="flex gap-1.5 p-2 bg-muted/20 rounded-md border h-10 items-center">
                <div className="h-6 w-16 bg-muted/60 rounded" />
                <div className="h-6 w-16 bg-muted/60 rounded" />
                <div className="h-6 w-16 bg-muted/60 rounded" />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// Async Data Fetcher Component to enable Suspense Streaming
async function NewAdjustmentContent({ id }: { id: string }) {
  const [currentUser, initialData, rawReasons] = await Promise.all([
    getCurrentUser(),
    AdjustmentService.getInventoryInitialData(id),
    prisma.adjustmentReason.findMany({
      where: {
        deletedAt: null,
        isActive: true,
      },
      select: {
        inflowId: true,
        name: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!initialData) {
    notFound();
  }

  const adjustmentReasons = rawReasons.map((rsn) => ({
    id: rsn.inflowId,
    name: rsn.name,
  }));

  return (
    <StockAdjustmentForm
      initialData={initialData}
      currentUser={currentUser}
      adjustmentReasons={adjustmentReasons}
    />
  );
}

// Main Page Component
export default async function InventoryAdjustmentPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <div className="w-full max-w-5xl mx-auto p-6 space-y-6">
      {/* Navigation Link */}
      <Link
        href="/dashboard/inventory/stocks"
        className="mb-2 inline-flex items-center gap-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Stocks
      </Link>

      {/* Header */}
      <PageHeader
        title="Create Inventory Adjustment"
        description="Reconcile stock discrepancies, record damaged or stolen items, or manually adjust warehouse inventory levels."
        icon={SlidersHorizontal}
        className="border-b pb-5"
      />

      {/* Async Streaming Form */}
      <Suspense fallback={<AdjustmentFormSkeleton />}>
        <NewAdjustmentContent id={id} />
      </Suspense>
    </div>
  );
}

// import { Suspense } from "react";
// import { notFound } from "next/navigation";
// import { prisma } from "@/lib/prisma";
// import { Card, CardContent } from "@/components/ui/card";
// import { StockAdjustmentForm } from "@/components/stock/stock-adjustment-form";
// import { getCurrentUser } from "@/lib/user";
// import PageHeader from "@/components/layout/dashboard/PageHeader";
// import Link from "next/link";
// import { ArrowLeft, SlidersHorizontal } from "lucide-react";
// import { AdjustmentService } from "@/services/adjustment.service";

// interface PageProps {
//   params: Promise<{
//     id: string;
//   }>;
// }

// // Skeleton fallback while fetching server data
// function AdjustmentFormSkeleton() {
//   return (
//     <div className="max-w-5xl mx-auto space-y-6 p-4 animate-pulse">
//       <div className="h-10 w-64 bg-muted rounded-md" />
//       <Card>
//         <CardContent className="h-32 bg-muted/50 rounded-md" />
//       </Card>
//       <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
//         <div className="h-24 bg-muted/50 rounded-md" />
//         <div className="h-24 bg-muted/50 rounded-md" />
//         <div className="h-24 bg-muted/50 rounded-md" />
//       </div>
//       <Card>
//         <CardContent className="h-64 bg-muted/50 rounded-md" />
//       </Card>
//     </div>
//   );
// }

// export default async function InventoryAdjustmentPage({ params }: PageProps) {
//   const { id } = await params;
//   const currentUser = await getCurrentUser()
    
//   const [ initialData, adjustmentReasons] = await Promise.all([
//     AdjustmentService.getInventoryInitialData(id),
//     prisma.adjustmentReason.findMany({
//       where: {
//         deletedAt: null,
//         isActive: true,
//       },
//       select: {
//         inflowId: true,
//         name: true
//       },
//       orderBy: { createdAt: "desc" },
//     })
//   ]);

//   if(!initialData) notFound();

//   return (
//     <div className="w-full max-w-5xl mx-auto p-6 space-y-6">
//       {/* Navigation Back Link */}
//       <Link
//         href="/dashboard/inventory/stocks"
//         className="mb-2 inline-flex items-center gap-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
//       >
//         <ArrowLeft className="h-4 w-4" />
//         Back to Stocks
//       </Link>

//       {/* Header */}
      // <PageHeader
      //   title="Create Inventory Adjustment"
      //   description="Reconcile stock discrepancies, record damaged or stolen items, or manually adjust warehouse inventory levels."
      //   icon={SlidersHorizontal}
      //   className="border-b pb-5"
      // />
//       <Suspense fallback={<AdjustmentFormSkeleton />}>
//         <StockAdjustmentForm  
//           initialData={initialData}
//           currentUser={currentUser}
//           adjustmentReasons={adjustmentReasons.map(rsn => ({
//             id: rsn.inflowId,
//             name: rsn.name
//           }))}
//         />
//       </Suspense>
//     </div>
//   );
// }


// import { Suspense } from "react";
// import { notFound } from "next/navigation";
// import { prisma } from "@/lib/prisma";
// import { Card, CardContent } from "@/components/ui/card";
// import { Loader2 } from "lucide-react";
// import { InventoryAdjustmentForm } from "@/components/inventory/inventory-adjustment-form";
// import { StockAdjustmentForm } from "@/components/stock/stock-adjustment-form";

// interface PageProps {
//   searchParams: Promise<{
//     id?: string;
//     locationId?: string;
//   }>;
// }

// // Skeleton fallback while fetching server data
// function AdjustmentFormSkeleton() {
//   return (
//     <div className="max-w-5xl mx-auto space-y-6 p-4 animate-pulse">
//       <div className="h-10 w-64 bg-muted rounded-md" />
//       <Card>
//         <CardContent className="h-32 bg-muted/50 rounded-md" />
//       </Card>
//       <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
//         <div className="h-24 bg-muted/50 rounded-md" />
//         <div className="h-24 bg-muted/50 rounded-md" />
//         <div className="h-24 bg-muted/50 rounded-md" />
//       </div>
//       <Card>
//         <CardContent className="h-64 bg-muted/50 rounded-md" />
//       </Card>
//     </div>
//   );
// }

// export default async function InventoryAdjustmentPage({ searchParams }: PageProps) {
//   const resolvedParams = await searchParams;
//   const id = resolvedParams.id;
//   const preselectedLocationId = resolvedParams.locationId;

//   // 1. Fetch Warehouses / Main Locations
//   const locationsPromise = prisma.location.findMany({
//     select: {
//       id: true,
//       name: true,
//     },
//     orderBy: {
//       name: "asc",
//     },
//   });

//   // 2. Fetch Products with their overall system stock / quantity on hand
//   const productsPromise = prisma.product.findMany({
//     select: {
//       id: true,
//       name: true,
//       sku: true,
//       inventoryItems: {
//         select: {
//           locationId: true,
//           quantityOnHand: true,
//         },
//       },
//     },
//     orderBy: {
//       name: "asc",
//     },
//   });

//   // 3. Fetch Sublocations / Bins mapped to locations
//   const sublocationsPromise = prisma.sublocation.findMany({
//     select: {
//       id: true,
//       name: true,
//       locationId: true,
//     },
//     orderBy: {
//       name: "asc",
//     },
//   });

//   // 4. Fetch existing Adjustment Record if editing
//   const existingAdjustmentPromise = id
//     ? prisma.inventoryAdjustment.findUnique({
//         where: { id: id },
//         include: {
//           lines: {
//             include: {
//               product: { select: { name: true } },
//               sublocation: { select: { name: true } },
//             },
//           },
//         },
//       })
//     : Promise.resolve(null);

//   // Execute all queries concurrently
//   const [locations, rawProducts, sublocations, existingAdjustment] = await Promise.all([
//     locationsPromise,
//     productsPromise,
//     sublocationsPromise,
//     existingAdjustmentPromise,
//   ]);

//   // If edit mode was requested but record doesn't exist
//   if (id && !existingAdjustment) {
//     notFound();
//   }

//   // Format products for selection dropdowns
//   const formattedProducts = rawProducts.map((p) => {
//     // Total stock across all locations
//     const totalQty = p.inventoryItems.reduce((acc, item) => acc + item.quantityOnHand, 0);
//     return {
//       id: p.id,
//       name: p.sku ? `[${p.sku}] ${p.name}` : p.name,
//       currentQuantity: totalQty,
//     };
//   });

//   // Format initial adjustment data if editing
//   const initialData = existingAdjustment
//     ? {
//         id: existingAdjustment.id,
//         locationId: existingAdjustment.locationId,
//         reason: existingAdjustment.reason as any,
//         remarks: existingAdjustment.remarks || "",
//         lines: existingAdjustment.lines.map((line) => ({
//           id: line.id,
//           productId: line.productId,
//           productName: line.product.name,
//           sublocationId: line.sublocationId || "",
//           sublocationName: line.sublocation?.name || "",
//           currentQuantity: line.previousQuantity,
//           adjustedQuantity: line.newQuantity,
//           delta: line.delta,
//           reasonNote: line.reason || "",
//         })),
//       }
//     : preselectedLocationId
//     ? {
//         locationId: preselectedLocationId,
//         reason: "DISCREPANCY_FOUND" as const,
//         remarks: "",
//         lines: [],
//       }
//     : null;

//   return (
//     <div className="container py-6">
//       <Suspense fallback={<AdjustmentFormSkeleton />}>
//         {/* <InventoryAdjustmentForm
//           locations={locations}
//           products={formattedProducts}
//           sublocations={sublocations}
//           initialData={initialData}
//         /> */}

//         <StockAdjustmentForm  
//           locations={locations}
//           initialData={initialData}
//         />
//       </Suspense>
//     </div>
//   );
// }