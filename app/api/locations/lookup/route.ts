// api/locations/lookup/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const locations = await prisma.location.findMany({
      select: {
        id: true,
        inflowId: true,
        name: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(locations, { status: 200 });
  } catch (error) {
    console.error("Error fetching locations:", error);
    return NextResponse.json(
      { error: "Internal Server Error occurred while fetching global locations" },
      { status: 500 }
    );
  }
}