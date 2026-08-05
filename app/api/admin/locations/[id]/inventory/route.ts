import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { FormattedInventoryItem } from "@/types/inventory.dto";

interface Props {
  params: Promise<{
    id: string;
  }>;
}

/**
 * 🏢 ISOLATED LOCATION STOCK MATRIX ENGINE (PAGINATED INVENTORY ONLY)
 */
export async function GET(request: NextRequest, { params }: Props) {
  try {
    const { id: locationId } = await params;

    if (!locationId) {
      return NextResponse.json(
        { error: "Missing required logistics location identifier token." },
        { status: 400 }
      );
    }

    // 1. Resolve Location Inflow ID
    const locationExists = await prisma.location.findUnique({
      where: { id: locationId },
      select: { inflowId: true },
    });

    if (!locationExists) {
      return NextResponse.json(
        { error: "Requested logistics warehouse deployment node not found in ledgers." },
        { status: 404 }
      );
    }

    // 2. Parse Query Parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const page = Math.max(0, parseInt(searchParams.get("page") || "0", 10));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "10", 10));

    // 3. Construct Table Filter Clause
    const tableWhereClause: any = { locationId: locationExists.inflowId };
    if (search) {
      tableWhereClause.product = {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { slug: { contains: search, mode: "insensitive" } },
        ],
      };
    }

    // 4. Query Total Filtered Records & Paginated Items
    const [totalRecords, stockItems] = await Promise.all([
      prisma.inventory.count({ where: tableWhereClause }),
      prisma.inventory.findMany({
        where: tableWhereClause,
        include: {
          product: {
            select: {
              inflowId: true,
              name: true,
              slug: true,
              sku: true,
              trackSerials: true,
              images: {
                orderBy: { position: "asc" },
                take: 1,
                select: { thumbUrl: true, originalUrl: true },
              },
            },
          },
          bins: {
            include: { sublocation: { select: { name: true } } },
          },
        },
        orderBy: { updatedAt: "desc" },
        skip: page * limit,
        take: limit,
      }),
    ]);

    // 5. Batched In-Transit Line Calculations
    const pageProductIds = stockItems.map((item) => item.productId);
    const inTransitMap: Record<string, number> = {};

    if (pageProductIds.length > 0) {
      const activeInTransitLines = await prisma.transferOrderLine.findMany({
        where: {
          productId: { in: pageProductIds },
          transferOrder: {
            sourceLocationId: locationId,
            status: "IN_TRANSIT",
          },
        },
        select: { productId: true, quantity: true },
      });

      activeInTransitLines.forEach((line) => {
        const qty = Number(line.quantity || 0);
        inTransitMap[line.productId] = (inTransitMap[line.productId] || 0) + qty;
      });
    }

    // 6. Format Final Response
    const formattedInventory: FormattedInventoryItem[] = stockItems.map((item) => {
      const formattedProduct = {
        inflowId: item.product.inflowId,
        name: item.product.name,
        sku: item.product.sku,
        slug: item.product.slug,
        thumbnail:
          item.product.images[0]?.thumbUrl ||
          item.product.images[0]?.originalUrl ||
          null,
        trackSerials: item.product.trackSerials,
      };

      return {
        id: item.id,
        product: formattedProduct,
        locationId: item.locationId,
        quantityOnHand: Number(item.quantityOnHand || 0),
        quantityReserved: Number(item.quantityReserved || 0),
        quantityAvailable: Number(item.quantityAvailable || 0),
        quantityInTransit: inTransitMap[item.productId] || 0,
        isAutoReorderEnabled: Boolean(item.isAutoReorderEnabled),
        reorderThreshold: Number(item.reorderThreshold || 0),
        reorderQuantity: Number(item.reorderQuantity || 0),
        preferredSourceLocationId: item.preferredSourceLocationId,
        bins: item.bins.map((b) => ({
          id: b.id,
          sublocationName: b.sublocation.name,
          quantity: Number(b.quantity || 0),
        })),
      };
    });

    return NextResponse.json(
      {
        inventory: formattedInventory,
        pagination: {
          totalRecords,
          pageCount: Math.ceil(totalRecords / limit),
          page,
          limit,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Isolated location stock ledger processing breakdown:", error);
    return NextResponse.json(
      { error: error.message || "Internal system failure querying isolated location stocks." },
      { status: 500 }
    );
  }
}