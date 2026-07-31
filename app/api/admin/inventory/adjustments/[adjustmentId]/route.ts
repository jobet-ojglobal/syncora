import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface Props {
  params: Promise<{
    adjustmentId: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: Props
) {
  try {
    const { adjustmentId: id } = await params;

    const adjustment = await prisma.inventoryAdjustment.findUnique({
      where: { id },
      include: {
        adjustmentReason: true,
        performedBy: {
          select: { id: true, name: true, email: true },
        },
        lastModifiedBy: {
          select: { id: true, name: true, email: true },
        },
        lines: {
          include: {
            product: {
              select: { id: true, inflowId: true, name: true, sku: true },
            },
            location: {
              select: { id: true, inflowId: true, name: true },
            },
            serials: {
              include: {
                inventoryBinItem: true,
              },
            },
          },
        },
      },
    });

    if (!adjustment) {
      return NextResponse.json(
        { error: "Inventory adjustment entry not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: adjustment });
  } catch (error: any) {
    console.error("[INVENTORY_ADJUSTMENT_GET_SINGLE]", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory adjustment details", details: error.message },
      { status: 500 }
    );
  }
}