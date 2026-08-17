import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface Props {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(
  request: Request,
  { params }: Props
) {
  try {
    const { id: locationId } = await params;

    if (!locationId) {
      return NextResponse.json({ error: "Location ID is required" }, { status: 400 });
    }

    // 1. Resolve location to get inflowId
    const location = await prisma.location.findFirst({
      where: {
        OR: [{ id: locationId }, { inflowId: locationId }],
      },
      select: { inflowId: true },
    });

    if (!location) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    // 2. Fetch sublocations filtered strictly by products that match InventoryLocationSyncService rules
    const sublocations = await prisma.sublocation.findMany({
      where: {
        locationId: location.inflowId,
        linkedLocationId: { not: null },
      },
      select: {
        id: true,
        name: true,
        linkedLocationId: true,
        linkedLocation: {
          select: { name: true, inflowId: true },
        },
        inventoryBins: {
          where: {
            inventory: {
              product: {
                deletedAt: null,
                isActive: true,
                isCloudSynced: true,
                trackSerials: false, // Sync skips serial tracked items
              },
            },
          },
          select: {
            quantity: true,
            inventory: {
              select: {
                productId: true,
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    // 3. Extract unique target linkedLocationIds
    const targetLocationIds = Array.from(
      new Set(
        sublocations
          .map((sub) => sub.linkedLocationId)
          .filter((id): id is string => Boolean(id))
      )
    );

    // 4. Fetch pre-sync target location stock levels for these products
    const targetInventories = await prisma.inventory.findMany({
      where: {
        locationId: { in: targetLocationIds },
        product: {
          deletedAt: null,
          isActive: true,
          isCloudSynced: true,
          // trackSerials: false,
        },
      },
      select: {
        locationId: true,
        productId: true,
        quantityOnHand: true,
      },
    });

    // Map: "targetLocationId_productId" -> current quantityOnHand
    const targetInventoryMap = new Map<string, number>();
    for (const inv of targetInventories) {
      const key = `${inv.locationId}_${inv.productId}`;
      targetInventoryMap.set(key, Number(inv.quantityOnHand) || 0);
    }

    // 5. Format payload with Source, Target, and Pending Adjustment Quantities
    const formattedSublocations = sublocations.map((sub) => {
      const targetLocId = sub.linkedLocationId;

      let sourceStockQty = 0;
      let targetStockQty = 0;

      const productIdsInSublocation = new Set<string>();

      for (const bin of sub.inventoryBins) {
        const binQty = Number(bin.quantity) || 0;
        sourceStockQty += binQty;

        const productId = bin.inventory?.productId;
        if (productId && targetLocId) {
          productIdsInSublocation.add(productId);
        }
      }

      // Sum target location stock for all products residing in this sublocation
      if (targetLocId) {
        for (const productId of productIdsInSublocation) {
          const key = `${targetLocId}_${productId}`;
          targetStockQty += targetInventoryMap.get(key) ?? 0;
        }
      }

      const { inventoryBins, ...rest } = sub;

      return {
        ...rest,
        sourceStockQty,
        targetStockQty,
        pendingAdjustmentQty: sourceStockQty - targetStockQty,
        // Backward compatibility for existing UI components
        stockQty: sourceStockQty,
      };
    });

    return NextResponse.json(formattedSublocations);
  } catch (error: any) {
    console.error("[GET_SUBLOCATIONS_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch sublocations" },
      { status: 500 }
    );
  }
}