// api/locations/lookup/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const locations = await prisma.location.findMany({
      select: {
        inflowId: true,
        name: true,
      },
      orderBy: { name: "asc" },
    });

    const transformedLocations = locations.map(l => ({
      id: l.inflowId,
      name: l.name,
    }));

    return NextResponse.json(transformedLocations, { status: 200 });
  } catch (error) {
    console.error("Error fetching locations:", error);
    return NextResponse.json(
      { error: "Internal Server Error occurred while fetching global locations" },
      { status: 500 }
    );
  }
}