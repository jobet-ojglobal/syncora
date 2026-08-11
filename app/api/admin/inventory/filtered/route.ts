import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "all";
    
    // Support locationIds (comma-separated list) or legacy single locationId
    const locationIdsParam = searchParams.get("locationIds") || searchParams.get("locationId");
    const locationIds = locationIdsParam
      ? locationIdsParam
          .split(",")
          .map((id) => id.trim())
          .filter((id) => id && id !== "all")
      : [];

    const minQty = searchParams.get("minQty") ? Number(searchParams.get("minQty")) : null;
    const maxQty = searchParams.get("maxQty") ? Number(searchParams.get("maxQty")) : null;
    const page = parseInt(searchParams.get("page") || "0", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    const skip = page * limit;

    const whereClause: any = {};

    // Status filter
    if (status === "active") {
      whereClause.product = { ...whereClause.product, isActive: true };
    } else if (status === "inactive") {
      whereClause.product = { ...whereClause.product, isActive: false };
    }

    // Multi-location filter using Prisma's `in` operator
    if (locationIds.length > 0) {
      whereClause.locationId = { in: locationIds };
    }

    // Quantity range filter
    if (minQty !== null || maxQty !== null) {
      whereClause.quantityOnHand = {};
      if (minQty !== null && !isNaN(minQty)) {
        whereClause.quantityOnHand.gte = minQty;
      }
      if (maxQty !== null && !isNaN(maxQty)) {
        whereClause.quantityOnHand.lte = maxQty;
      }
    }

    // Search filter across product name, SKU, and location name
    if (search) {
      whereClause.OR = [
        { product: { name: { contains: search, mode: "insensitive" } } },
        { product: { sku: { contains: search, mode: "insensitive" } } },
        { location: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    // Execute queries concurrently
    const [stockItems, totalRecords, locations, activeInTransitLines] = await prisma.$transaction([
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
              isActive: true,
              images: {
                orderBy: { position: "asc" },
                take: 1,
                select: { thumbUrl: true, originalUrl: true },
              },
            },
          },
          location: {
            select: {
              id: true,
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
      prisma.location.findMany({
        select: { inflowId: true, name: true },
        orderBy: { name: "asc" },
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

    const inTransitMap: Record<string, number> = {};
    activeInTransitLines.forEach((line) => {
      const key = `${line.productId}_${line.transferOrder.sourceLocationId}`;
      inTransitMap[key] = (inTransitMap[key] || 0) + Number(line.quantity);
    });

    const mappedData = stockItems.map((item) => {
      const lookupKey = `${item.productId}_${item.locationId}`;

      return {
        id: item.id,
        product: {
          inflowId: item.product.inflowId,
          name: item.product.name,
          sku: item.product.sku,
          slug: item.product.slug,
          thumbnail:
            item.product.images[0]?.thumbUrl ||
            item.product.images[0]?.originalUrl ||
            null,
          trackSerials: item.product.trackSerials,
          isActive: item.product.isActive,
        },
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

    const pageCount = Math.ceil(totalRecords / limit) || 1;

    return NextResponse.json(
      {
        data: mappedData,
        totalRecords,
        pageCount,
        locations,
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