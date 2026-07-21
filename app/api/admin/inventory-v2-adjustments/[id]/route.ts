import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const adjustment = await prisma.inventoryAdjustment.findUnique({
      where: { id },
      include: {
        performedBy: true,
        lines: {
          include: {
            product: true,
            location: true,
            sublocation: true,
          },
        },
      },
    });

    if (!adjustment) {
      return NextResponse.json(
        { error: "Inventory adjustment document not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(adjustment, { status: 200 });
  } catch (error: any) {
    console.error("[GET_SINGLE_ADJUSTMENT_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch adjustment document." },
      { status: 500 }
    );
  }
}