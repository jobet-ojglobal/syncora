import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true, deletedAt: null },
      select: {
        id: true,
        inflowId: true,
        slug: true,
        sku: true,
        name: true,
        images: {
          orderBy: { position: "asc" },
          take: 1,
          select: { thumbUrl: true, originalUrl: true }
        }
      },
      
      orderBy: { name: "asc" },
    });

    const parsedProducts = products.map(prod => ({
      id: prod.id,
      inflowId: prod.inflowId,
      name: prod.name,
      sku: prod.sku,
      slug: prod.slug,
      thumbnail: prod.images[0]?.thumbUrl || prod.images[0]?.originalUrl || null,
    }));

    return NextResponse.json(parsedProducts, { status: 200 });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Internal Server Error occurred while fetching global products" },
      { status: 500 }
    );
  }
}