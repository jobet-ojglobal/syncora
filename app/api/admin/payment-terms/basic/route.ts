import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const term = await prisma.paymentTerm.findMany({
      where: { deletedAt: null },
      select: {
        inflowId: true,
        name: true,
      },
      orderBy: { name: "asc" }
    });

    const transformedTerm = term.map(p => ({
      id: p.inflowId,
      name: p.name,
    }));

    return NextResponse.json(transformedTerm, { status: 200 });
  } catch (error) {
    console.error("Error fetching payment terms:", error);
    return NextResponse.json(
      { error: "Internal Server Error occurred while fetching payment term schemes" },
      { status: 500 }
    );
  }
}