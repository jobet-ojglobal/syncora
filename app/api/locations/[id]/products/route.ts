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
    const products = await prisma.product.findMany({
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
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ products });
  } catch (error) {
    console.error("Error fetching products for location:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}