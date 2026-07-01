import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const taxing = await prisma.taxingScheme.findMany({
      where: { deletedAt: null },
      select: {
        inflowId: true,
        name: true,
      },
      orderBy: { name: "asc" }
    });

    const transformedTaxing = taxing.map(p => ({
      id: p.inflowId,
      name: p.name,
    }));

    return NextResponse.json(transformedTaxing, { status: 200 });
  } catch (error) {
    console.error("Error fetching taxing schemes:", error);
    return NextResponse.json(
      { error: "Internal Server Error occurred while fetching taxing schemes" },
      { status: 500 }
    );
  }
}