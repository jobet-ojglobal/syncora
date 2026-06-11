// app/api/brands/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const brands = await prisma.brand.findMany({
      where: {
        // Optional: If you have a soft delete setup on brands as well
        // deletedAt: null 
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(brands, { status: 200 });
  } catch (error) {
    console.error("Error fetching brand catalog taxonomy:", error);
    return NextResponse.json(
      { error: "Internal Server Error occurred while fetching global brands" },
      { status: 500 }
    );
  }
}