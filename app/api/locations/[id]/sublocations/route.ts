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
      return NextResponse.json({ sublocations: [] });
    }

    const sublocations = await prisma.sublocation.findMany({
      where: {
        locationId: id,
        location: {
          isActive: true,
          deletedAt: null
        }
      },
      select: {
        id: true,
        name: true,
        locationId: true,
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