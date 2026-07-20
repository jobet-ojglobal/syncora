// api/inventory/check/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Input Validation Schema
const querySchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  locationId: z.string().min(1, "Location ID is required"),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query params
    const validation = querySchema.safeParse({
      productId: searchParams.get("productId"),
      locationId: searchParams.get("locationId"),
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: validation.error.format() },
        { status: 400 }
      );
    }

    const { productId, locationId } = validation.data;

    // 1. Check if the inventory record exists for this product and facility
    const inventoryRecord = await prisma.inventory.findUnique({
      where: {
        productId_locationId: {
          productId,
          locationId,
        },
      },
      include: {
        bins: {
          where: { productId },
          include: {
            sublocation: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // If no record exists in inventory at all for this location:
    if (!inventoryRecord) {
      return NextResponse.json({
        existsInInventory: false,
        quantityOnHand: 0,
        quantityAvailable: 0,
        quantityReserved: 0,
        bulkAreaQuantity: 0,
        bins: [],
      });
    }

    // Convert Prisma Decimals to Numbers for clean JSON serialization
    const quantityOnHand = Number(inventoryRecord.quantityOnHand || 0);
    const quantityAvailable = Number(inventoryRecord.quantityAvailable || 0);
    const quantityReserved = Number(inventoryRecord.quantityReserved || 0);

    // 2. Map bin breakdown
    const bins = inventoryRecord.bins.map((bin) => ({
      binId: bin.id,
      sublocationId: bin.sublocationId,
      sublocationName: bin.sublocation.name,
      quantity: Number(bin.quantity || 0),
    }));

    // 3. Calculate stock sitting in the Floor / Bulk Area (Unallocated to Bins)
    const totalAllocatedToBins = bins.reduce((sum, bin) => sum + bin.quantity, 0);
    const bulkAreaQuantity = Math.max(0, quantityOnHand - totalAllocatedToBins);

    return NextResponse.json({
      existsInInventory: true,
      inventoryId: inventoryRecord.id,
      quantityOnHand,
      quantityAvailable,
      quantityReserved,
      bulkAreaQuantity, // Quantity not assigned to any specific sublocation/bin
      bins, // Array of specific sublocation balances
    });
  } catch (error: any) {
    console.error("Error checking inventory stock:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}