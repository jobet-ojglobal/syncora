import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface Props {
  params: Promise<{
    id: string;
  }>;
}

/**
 * 🏢 ISOLATED LOCATION STOCK MATRIX ENGINE
 */
export async function GET(
  request: NextRequest,
  { params }: Props
) {
  try {
    const { id: locationId } = await params;

    if (!locationId) {
      return NextResponse.json(
        { error: "Missing required logistics location identifier token." },
        { status: 400 }
      );
    }

    // 1. Verify existence of target location base node to ensure clean 404 responses
    const locationExists = await prisma.location.findUnique({
      where: { inflowId: locationId },
      select: { name: true, isActive: true, isDefault: true  }
    });

    if (!locationExists) {
      return NextResponse.json(
        { error: "Requested logistics warehouse deployment node not found in ledgers." },
        { status: 404 }
      );
    }

    // 2. Fetch inventory allocations exclusively mapped to this facility node
    const stockItems = await prisma.inventory.findMany({
      where: { locationId },
      include: {
        product: {
          select: { name: true, slug: true }
        },
        bins: {
          include: {
            sublocation: { select: { name: true } }
          }
        }
      },
      orderBy: { updatedAt: "desc" }
    });

    if (stockItems.length === 0) {
      return NextResponse.json({
        location: {
          id: locationId,
          name: locationExists.name,
          isActive: locationExists.isActive,
          isDefault: locationExists.isDefault,
        },
        inventory: [],
      });
    }

    // 3. Aggregate outbound In-Transit line changes matching this location ID origin
    const activeInTransitLines = await prisma.transferOrderLine.findMany({
      where: {
        transferOrder: {
          sourceLocationId: locationId,
          status: "IN_TRANSIT"
        }
      },
      select: {
        productId: true,
        quantity: true
      }
    });

    // 4. Compress in-transit quantities into a fast key-value lookup map
    const inTransitMap: Record<string, number> = {};
    activeInTransitLines.forEach((line) => {
      const qty = Number(line.quantity);
      inTransitMap[line.productId] = (inTransitMap[line.productId] || 0) + qty;
    });

    // 5. Structure ledger row objects matching your frontend `InventoryStockRow` contract layout
    const formattedInventory = stockItems.map((item) => {
      const quantityInTransit = inTransitMap[item.productId] || 0;

      return {
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        productSlug: item.product.slug,
        locationId: item.locationId,
        quantityOnHand: Number(item.quantityOnHand),
        quantityReserved: Number(item.quantityReserved || 0),
        quantityAvailable: Number(item.quantityAvailable || 0),
        quantityInTransit: quantityInTransit,
        isAutoReorderEnabled: item.isAutoReorderEnabled,
        reorderThreshold: Number(item.reorderThreshold),
        reorderQuantity: Number(item.reorderQuantity),
        preferredSourceLocationId: item.preferredSourceLocationId,
        bins: item.bins.map((b) => ({
          id: b.id,
          sublocationName: b.sublocation.name,
          quantity: Number(b.quantity)
        }))
      };
    });

    return NextResponse.json({
      location: {
        id: locationId,
        name: locationExists.name,
        isActive: locationExists.isActive,
        isDefault: locationExists.isDefault,
      },
      inventory: formattedInventory
    }, { status: 200 });

  } catch (error: any) {
    console.error("Isolated location stock ledger processing breakdown:", error);
    return NextResponse.json(
      { error: error.message || "Internal system failure querying isolated location stocks." },
      { status: 500 }
    );
  }
}