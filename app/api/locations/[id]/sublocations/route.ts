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
    const { id: locationId } = await params;

    if (!locationId) {
      return NextResponse.json({ error: "Location ID is required" }, { status: 400 });
    }

    // 1. Resolve location to get inflowId
    const location = await prisma.location.findFirst({
      where: {
        OR: [{ id: locationId }, { inflowId: locationId }],
      },
      select: { inflowId: true },
    });

    if (!location) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }


    const sublocations = await prisma.sublocation.findMany({
      where: {
        locationId: location.inflowId,
        location: {
          isActive: true,
          deletedAt: null
        }
      },
      select: {
        id: true,
        name: true,
        locationId: true,
        linkedLocationId: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ sublocations });
  } catch (error) {
    console.error("Error fetching sublocations:", error);
    return NextResponse.json(
      { error: "Failed to fetch sublocations" },
      { status: 500 }
    );
  }
}