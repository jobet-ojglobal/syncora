import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

interface ContextParams {
  params: Promise<{ id: string }>;
}

// GET /api/admin/locations/[id]/summary
export async function GET(req: Request, { params }: ContextParams) {
  try {
    const { id: locationId } = await params;

    // 1. Retrieve the location's external inflowId mapping
    const locationExists = await prisma.location.findUnique({
      where: { id: locationId },
      select: { id: true, inflowId: true },
    });

    if (!locationExists) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    // Match inventory using the external inflowId
    const baseLocationWhere = { locationId: locationExists.inflowId };

    // 2. Parallel metric aggregations using Promise.all
    const [totalSKUs, aggregateStock, outOfStockCount] = await Promise.all([
      // Total distinct products tracked at this location
      prisma.inventory.count({
        where: baseLocationWhere,
      }),

      // Aggregate on-hand total volume
      prisma.inventory.aggregate({
        where: baseLocationWhere,
        _sum: {
          quantityOnHand: true,
        },
      }),

      // Count products with zero or negative available stock
      prisma.inventory.count({
        where: {
          ...baseLocationWhere,
          quantityAvailable: { lte: 0 },
        },
      }),
    ]);

    return NextResponse.json({
      summary: {
        totalSKUs,
        totalOnHand: Number(aggregateStock._sum.quantityOnHand || 0),
        outOfStockCount,
      },
    });
  } catch (error: any) {
    console.error("[LOCATION_SUMMARY_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to compute summary metrics", details: error.message },
      { status: 500 }
    );
  }
}