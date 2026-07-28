import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";


interface Props {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(
  request: Request,
  { params }: Props
) {
  try {
    const { id } =
      await params;

    if (!id) {
      return NextResponse.json({ products: [] });
    }

    // Fetch active products that do NOT already have an inventory record at this location
    const productCatalogs = await prisma.product.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        inventories: {
          none: {
            locationId: id,
          },
        },
      },
      select: {
        inflowId: true,
        name: true,
        images: true,
        sku: true,
        trackSerials: true
      },
      orderBy: { name: "asc" },
    });

    const products = productCatalogs.map((p) => ({
      ...p,
      image: p.images[0]?.thumbUrl || p.images[0]?.originalUrl || null,
    }))



    return NextResponse.json({ products });
  } catch (error) {
    console.error("Error fetching products for location:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}