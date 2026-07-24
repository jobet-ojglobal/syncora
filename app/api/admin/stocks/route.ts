// app/api/admin/stocks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    const sourceLocationId = searchParams.get("sourceLocationId");
    const targetLocationId = searchParams.get("targetLocationId");

    if (!productId) {
      return NextResponse.json({ error: "productId parameter is required." }, { status: 400 });
    }

    const locationsToQuery = [sourceLocationId, targetLocationId].filter(Boolean) as string[];

    if (locationsToQuery.length === 0) {
      return NextResponse.json({ error: "At least one location ID is required." }, { status: 400 });
    }

    // 1. Fetch overall location inventory (quantityAvailable)
    // 2. Fetch specific sublocation bin records for those locations
    const [inventories, bins] = await Promise.all([
      prisma.inventory.findMany({
        where: {
          productId,
          locationId: { in: locationsToQuery },
        },
        select: {
          locationId: true,
          quantityAvailable: true,
        },
      }),
      prisma.inventoryBin.findMany({
        where: {
          sublocation: {
            locationId: { in: locationsToQuery },
          },
        },
        select: {
          sublocationId: true,
          quantity: true,
          sublocation: {
            select: { locationId: true }
          }
        },
      }),
    ]);

    // Format fields from Decimal to regular numbers for safe JSON parsing
    const formattedInventories = inventories.map((inv) => ({
      locationId: inv.locationId,
      quantityAvailable: inv.quantityAvailable ? Number(inv.quantityAvailable) : 0,
    }));

    const formattedBins = bins.map((bin) => ({
      sublocationId: bin.sublocationId,
      locationId: bin.sublocation.locationId,
      quantity: Number(bin.quantity),
    }));

    return NextResponse.json({
      locations: formattedInventories,
      bins: formattedBins,
    }, { status: 200 });

  } catch (error) {
    console.error("Critical failure fetching real-time stock balances:", error);
    return NextResponse.json(
      { error: "Internal Database query execution failure." },
      { status: 500 }
    );
  }
}