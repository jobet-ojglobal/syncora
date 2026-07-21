import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const inventory = await prisma.inventory.findUnique({
      where: { id },
      include: {
        product: true,
        location: true,
        bins: true,
      },
    });

    if (!inventory) {
      return NextResponse.json(
        { error: "Inventory record not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(inventory, { status: 200 });
  } catch (error: any) {
    console.error("[GET_SINGLE_INVENTORY_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch inventory item." },
      { status: 500 }
    );
  }
}