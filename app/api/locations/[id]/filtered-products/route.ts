import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface Props {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: Request, { params }: Props) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    if (!id) {
      return NextResponse.json({
        products: [],
        pagination: { total: 0, page: 1, totalPages: 0 },
      });
    }

    const search = searchParams.get("search") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "20", 10));
    const skip = (page - 1) * limit;

    // Build base filter query
    const whereCondition = {
      isActive: true,
      deletedAt: null,
      inventories: {
        none: {
          locationId: id,
        },
      },
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { sku: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [total, productCatalogs] = await Promise.all([
      prisma.product.count({ where: whereCondition }),
      prisma.product.findMany({
        where: whereCondition,
        select: {
          inflowId: true,
          name: true,
          images: true,
          sku: true,
          trackSerials: true,
        },
        orderBy: { name: "asc" },
        skip,
        take: limit,
      }),
    ]);

    const products = productCatalogs.map((p) => ({
      ...p,
      image: p.images[0]?.thumbUrl || p.images[0]?.originalUrl || null,
    }));

    return NextResponse.json({
      products,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching products for location:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}