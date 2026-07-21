import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { inventorySchema } from "@/schemas/inventory-v2.schema";

// GET: Fetch list of inventory items with relations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("locationId");
    const productId = searchParams.get("productId");

    const where: any = {};
    if (locationId) where.locationId = locationId;
    if (productId) where.productId = productId;

    const inventoryItems = await prisma.inventory.findMany({
      where,
      include: {
        product: true,
        location: true,
        preferredSourceLocation: true,
        bins: {
          include: {
            sublocation: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(inventoryItems, { status: 200 });
  } catch (error: any) {
    console.error("[GET_INVENTORY_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch inventory records." },
      { status: 500 }
    );
  }
}

// POST: Create a new inventory record with ledger entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = inventorySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Execute atomic creation & initial opening balance ledger
    const inventory = await prisma.$transaction(async (tx) => {
      // Check for existing unique constraint (productId + locationId)
      const existing = await tx.inventory.findUnique({
        where: {
          productId_locationId: {
            productId: data.productId,
            locationId: data.locationId,
          },
        },
      });

      if (existing) {
        throw new Error("Inventory record for this product and location already exists.");
      }

      // 1. Create main Inventory record
      const createdInventory = await tx.inventory.create({
        data: {
          productId: data.productId,
          locationId: data.locationId,
          quantityOnHand: data.quantityOnHand,
          quantityAvailable: data.quantityAvailable ?? data.quantityOnHand,
          quantityReserved: data.quantityReserved ?? 0,
          reorderThreshold: data.reorderThreshold,
          reorderQuantity: data.reorderQuantity,
          isAutoReorderEnabled: data.isAutoReorderEnabled,
          preferredSourceLocationId: data.preferredSourceLocationId || null,
          lastMovementAt: new Date(),
          bins: {
            create: data.bins.map((bin) => ({
              sublocationId: bin.sublocationId,
              quantity: bin.quantity,
            })),
          },
        },
        include: {
          bins: true,
        },
      });

      // 2. Log Opening Balance in InventoryLedger
      if (data.quantityOnHand > 0) {
        await tx.inventoryLedger.create({
          data: {
            productId: data.productId,
            locationId: data.locationId,
            transactionType: "OPENING_BALANCE",
            referenceType: "ADJUSTMENT",
            quantityBefore: 0,
            quantityChange: data.quantityOnHand,
            quantityAfter: data.quantityOnHand,
            remarks: "Initial inventory setup",
          },
        });
      }

      return createdInventory;
    });

    return NextResponse.json(inventory, { status: 201 });
  } catch (error: any) {
    console.error("[POST_INVENTORY_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to create inventory record." },
      { status: 500 }
    );
  }
}

// PATCH: Update inventory stock levels, replenishment settings, and bins
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = inventorySchema.safeParse(body);

    if (!validation.success || !body.id) {
      return NextResponse.json(
        { error: "Validation failed or missing inventory ID." },
        { status: 400 }
      );
    }

    const data = validation.data;
    const inventoryId = body.id;

    const updatedInventory = await prisma.$transaction(async (tx) => {
      const current = await tx.inventory.findUnique({
        where: { id: inventoryId },
      });

      if (!current) {
        throw new Error("Target inventory record not found.");
      }

      const prevQty = Number(current.quantityOnHand);
      const newQty = Number(data.quantityOnHand);
      const qtyDelta = newQty - prevQty;

      // 1. Delete old bins and recreate new allocations
      await tx.inventoryBin.deleteMany({
        where: { inventoryId },
      });

      const updated = await tx.inventory.update({
        where: { id: inventoryId },
        data: {
          quantityOnHand: data.quantityOnHand,
          quantityAvailable: data.quantityAvailable ?? data.quantityAvailable,
          quantityReserved: data.quantityReserved ?? data.quantityReserved,
          reorderThreshold: data.reorderThreshold,
          reorderQuantity: data.reorderQuantity,
          isAutoReorderEnabled: data.isAutoReorderEnabled,
          preferredSourceLocationId: data.preferredSourceLocationId || null,
          lastMovementAt: qtyDelta !== 0 ? new Date() : current.lastMovementAt,
          bins: {
            create: data.bins.map((bin) => ({
              sublocationId: bin.sublocationId,
              quantity: bin.quantity,
            })),
          },
        },
        include: { bins: true },
      });

      // 2. Record ledger entry if quantity was manually updated
      if (qtyDelta !== 0) {
        await tx.inventoryLedger.create({
          data: {
            productId: current.productId,
            locationId: current.locationId,
            transactionType: "ADJUSTMENT",
            referenceType: "ADJUSTMENT",
            quantityBefore: prevQty,
            quantityChange: qtyDelta,
            quantityAfter: newQty,
            remarks: "Manual inventory stock update",
          },
        });
      }

      return updated;
    });

    return NextResponse.json(updatedInventory, { status: 200 });
  } catch (error: any) {
    console.error("[PATCH_INVENTORY_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to update inventory record." },
      { status: 500 }
    );
  }
}