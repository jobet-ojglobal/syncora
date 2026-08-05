// app/api/admin/inventory/list/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // 1. Extract search and pagination parameters from the URL
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const page = parseInt(searchParams.get("page") || "0", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    const skip = page * limit;

    // 2. Build conditional where filtering block
    const whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { product: { name: { contains: search, mode: "insensitive" } } },
        { product: { sku: { contains: search, mode: "insensitive" } } },
        { location: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    // 3. Execute concurrently: Fetch filtered subset rows, total count, and in-transit lines
    const [stockItems, totalRecords, activeInTransitLines] = await prisma.$transaction([
      prisma.inventory.findMany({
        where: whereClause,
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
          location: {
            select: {
              name: true,
            },
          },
          bins: {
            include: {
              sublocation: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        skip: skip,
        take: limit,
      }),
      prisma.inventory.count({
        where: whereClause,
      }),
      prisma.transferOrderLine.findMany({
        where: {
          transferOrder: {
            status: "IN_TRANSIT",
          },
        },
        select: {
          productId: true,
          quantity: true,
          transferOrder: {
            select: {
              sourceLocationId: true,
            },
          },
        },
      }),
    ]);

    // 4. Map in-transit quantities into a lookup map
    const inTransitMap: Record<string, number> = {};
    activeInTransitLines.forEach((line) => {
      const key = `${line.productId}_${line.transferOrder.sourceLocationId}`;
      inTransitMap[key] = (inTransitMap[key] || 0) + Number(line.quantity);
    });

    // 5. Map records into the matching flat payload structure
    const mappedData = stockItems.map((item) => {
      const lookupKey = `${item.productId}_${item.locationId}`;

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
        locationName: item.location.name,
        quantityOnHand: Number(item.quantityOnHand),
        quantityReserved: Number(item.quantityReserved || 0),
        quantityAvailable: Number(item.quantityAvailable || 0),
        quantityInTransit: inTransitMap[lookupKey] || 0,
        bins: item.bins.map((bin) => ({
          id: bin.id,
          sublocationName: bin.sublocation.name,
          quantity: Number(bin.quantity),
        })),
      };
    });

    // 6. Package output inside the standard DataTablePagination structure
    const pageCount = Math.ceil(totalRecords / limit);

    return NextResponse.json(
      {
        data: mappedData,
        totalRecords,
        pageCount,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching inventory catalog directory list:", error);
    return NextResponse.json(
      { error: "Internal server error fetching inventory records." },
      { status: 500 }
    );
  }
}