import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("locationId");

    if (!locationId) {
      return NextResponse.json({ error: "Location ID is required" }, { status: 400 });
    }

    // Fetch only the productIds for the given location to keep the payload tiny
    const existingInventory = await prisma.inventory.findMany({
      where: { locationId },
      select: { productId: true },
    });

    const productIds = existingInventory.map((inv) => inv.productId);

    return NextResponse.json({ productIds });
  } catch (error: any) {
    console.error("Error fetching existing inventory:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}