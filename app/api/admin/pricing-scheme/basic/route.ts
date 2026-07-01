import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const pricing = await prisma.pricingScheme.findMany({
      where: { deletedAt: null },
      select: {
        inflowId: true,
        name: true,
      },
      orderBy: { name: "asc" }
    });

    const transformedPricing = pricing.map(p => ({
      id: p.inflowId,
      name: p.name,
    }));

    return NextResponse.json(transformedPricing, { status: 200 });
  } catch (error) {
    console.error("Error fetching pricing schemes:", error);
    return NextResponse.json(
      { error: "Internal Server Error occurred while fetching pricing schemes" },
      { status: 500 }
    );
  }
}