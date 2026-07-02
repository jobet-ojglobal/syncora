import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const currencies = await prisma.currency.findMany({
      where: { deletedAt: null },
      select: {
        inflowId: true,
        name: true,
      },
      orderBy: { name: "asc" }
    });

    const transformCurrencies = currencies.map(p => ({
      id: p.inflowId,
      name: p.name,
    }));

    return NextResponse.json(transformCurrencies, { status: 200 });
  } catch (error) {
    console.error("Error fetching currencies:", error);
    return NextResponse.json(
      { error: "Internal Server Error occurred while fetching currency schemes" },
      { status: 500 }
    );
  }
}