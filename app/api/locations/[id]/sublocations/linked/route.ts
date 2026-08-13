import { NextRequest, NextResponse } from "next/server";
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

    // Resolve location to get inflowId or standard ID
    const location = await prisma.location.findFirst({
      where: {
        OR: [{ id: locationId }, { inflowId: locationId }],
      },
      select: { inflowId: true },
    });

    if (!location) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    // Fetch sublocations with linkedLocationId and include inventory bin quantities
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
          select: { name: true },
        },
        inventoryBins: {
          select: {
            quantity: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    // Format sublocations payload with aggregated stock quantity
    const formattedSublocations = sublocations.map((sub) => {
      const stockQty = sub.inventoryBins.reduce(
        (sum, bin) => sum + (Number(bin.quantity) || 0),
        0
      );

      const { inventoryBins, ...rest } = sub;

      return {
        ...rest,
        stockQty,
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