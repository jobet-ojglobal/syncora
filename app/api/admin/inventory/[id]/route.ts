import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// ==========================================
// GET: Fetch Single Inventory by ID for Update Form
// ==========================================

interface Props {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: Props
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Inventory ID is required" },
        { status: 400 }
      );
    }

    // Fetch single inventory record with all related nested structures
    const inventory = await prisma.inventory.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            id: true,
            inflowId: true,
            name: true,
            sku: true, // Assuming product has SKU/code fields
          },
        },
        location: {
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
    });

    if (!inventory) {
      return NextResponse.json(
        { error: "Inventory record not found" },
        { status: 404 }
      );
    }

    // Also fetch all serial items assigned to this product & location
    // that might NOT be in a bin (unassigned/floor stock)
    const unassignedSerials = await prisma.inventoryBinItem.findMany({
      where: {
        productId: inventory.productId,
        locationId: inventory.locationId,
        inventoryBinId: null,
        status: "IN_STOCK",
      },
      select: {
        id: true,
        serialNumber: true,
        status: true,
      },
    });

    // Format payload specifically structured to simplify client-side form state
    const formData = {
      inventoryId: inventory.id,
      productId: inventory.productId,
      productName: inventory.product.name,
      locationId: inventory.locationId,
      locationName: inventory.location.name,
      quantityOnHand: Number(inventory.quantityOnHand),
      quantityReserved: Number(inventory.quantityReserved ?? 0),
      quantityAvailable: Number(inventory.quantityAvailable ?? 0),
      reorderThreshold: Number(inventory.reorderThreshold),
      reorderQuantity: Number(inventory.reorderQuantity),
      isAutoReorderEnabled: inventory.isAutoReorderEnabled,
      preferredSourceLocationId: inventory.preferredSourceLocationId,
      bins: inventory.bins.map((bin) => ({
        binId: bin.id,
        sublocationId: bin.sublocationId,
        sublocationName: bin.sublocation.name,
        quantity: Number(bin.quantity),
        serials: bin.inventoryBinItems.map((item) => item.serialNumber),
      })),
      unassignedSerials: unassignedSerials.map((item) => item.serialNumber),
      allInStockSerials: [
        ...inventory.bins.flatMap((bin) =>
          bin.inventoryBinItems.map((item) => item.serialNumber)
        ),
        ...unassignedSerials.map((item) => item.serialNumber),
      ],
    };

    return NextResponse.json({ data: formData }, { status: 200 });
  } catch (error) {
    console.error("[INVENTORY_GET_SINGLE_ERROR]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { inflowId } = await request.json(); // Map directly into your targeting identification parameters

    if (!inflowId) {
      return NextResponse.json({ error: "Missing required stock ledger record pointer target ID." }, { status: 400 });
    }

    // 🛑 RELATION BLOCKER SAFEGUARD:
    // Prevent deletion if the stock node contains reserved stock values allocated to pending shipments.
    const activeLockCheck = await prisma.inventory.findUnique({
      where: { id: inflowId },
      select: { quantityReserved: true }
    });

    if (activeLockCheck && Number(activeLockCheck.quantityReserved) > 0) {
      return NextResponse.json({
        error: "Cannot drop this stock tracking node. It contains active product allocations reserved for pending sales or transfer orders."
      }, { status: 422 });
    }

    // Perform atomic cleanup execution
    await prisma.$transaction(async (tx) => {
      // 1. Wipe out any cascading internal storage layout picking bins rows
      await tx.inventoryBin.deleteMany({
        where: { inventoryId: inflowId }
      });

      // 2. Drop the primary master parent stock tracking row record
      await tx.inventory.delete({
        where: { id: inflowId }
      });
    });

    return NextResponse.json({ success: true, removedStockLineId: inflowId }, { status: 200 });
  } catch (error) {
    console.error("Critical error clearing system inventory entry records:", error);
    return NextResponse.json({ error: "Internal Database execution cleanup transaction failure." }, { status: 500 });
  }
}