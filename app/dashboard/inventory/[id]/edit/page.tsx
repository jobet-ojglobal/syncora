// app/admin/inventory/[id]/edit/page.tsx
import Link from "next/link";
import {
  ArrowLeft,
} from "lucide-react";
import PageHeader from "@/components/layout/dashboard/PageHeader";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { InventoryFormV2 } from "@/components/inventory/inventory-multi-form";



interface Props {
  params: Promise<{
    id: string;
  }>;
}

export default async function InventoryAdjustmentPage({ params }: Props) {
  const { id } = await params;
  
  const [locations, inventory] = await Promise.all([
    prisma.location.findMany({
      select: {
        inflowId: true,
        name: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.inventory.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            id: true,
            inflowId: true,
            slug: true,
            sku: true,
            name: true,
            trackSerials: true,
            images: {
              orderBy: { position: "asc" },
              take: 1,
              select: { thumbUrl: true, originalUrl: true }
            }
          },
        },
        location: {
          select: {
            id: true,
            inflowId: true,
            name: true,
          },
        },
        preferredSourceLocation: {
          select: {
            id: true,
            inflowId: true,
            name: true,
          },
        },
        bins: {
          include: {
            sublocation: {
              select: {
                id: true,
                name: true,
                locationId: true,
              },
            },
            inventoryBinItems: {
              where: {
                status: "IN_STOCK",
              },
              select: {
                id: true,
                serialNumber: true,
                status: true,
              },
            },
          },
        },
      },
    })
    
        
  ]);

  if (!inventory) return notFound();


   // 1. Map Prisma Bins to BinAllocation Schema
    const bins = (inventory.bins || []).map((bin) => {
      // Extract serial numbers for this specific bin if present
      const binSerials = (bin.inventoryBinItems || [])
        .map((item) => item.serialNumber)
        .filter((sn): sn is string => Boolean(sn));

      return {
        id: bin.id,
        sublocationId: bin.sublocationId || bin.sublocation?.id || "",
        quantity: Number(bin.quantity) || bin.inventoryBinItems.length || 0,
        serials: binSerials,
      };
    });

    // 2. Derive Line-Level Aggregates
    const totalOnHand = bins.reduce((acc, bin) => acc + bin.quantity, 0);
    // Pull reserved quantity from inventory record if available, fallback to 0
    const reservedQty = Number((inventory as any).quantityReserved) || 0; 
    const availableQty = Math.max(0, totalOnHand - reservedQty);

    // Collect all unique serials across all bins for the product line
    const allSerials = Array.from(
      new Set(bins.flatMap((bin) => bin.serials))
    );

    // 3. Map to Adjustment Line Schema
    const lineItem = {
      id: inventory.id,
      productId: inventory.productId || inventory.product?.id || "",
      trackSerials: Boolean(inventory.product?.trackSerials),
      quantityOnHand: totalOnHand,
      quantityReserved: reservedQty,
      quantityAvailable: availableQty,
      bins: bins,
      serials: allSerials,
    };
    
  // Convert Prisma Decimals to Numbers for React Hook Form / JSON hydration
  const formattedData = {
    id: inventory.id,
    locationId: inventory.locationId,
    lines: [lineItem]
  };
  
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
      {/* <InventoryForm 
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
        sublocations={sublocations} /> */}
        <InventoryFormV2
          locations={locations.map((l) => ({
            inflowId: l.inflowId,
            name: l.name,
          }))}
          initialData={formattedData}
        />
    </div>
  );
}