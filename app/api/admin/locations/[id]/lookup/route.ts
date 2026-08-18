import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

interface Props {
  params: Promise<{
    id: string;
  }>;
}

// =====================================================
// GET ALL LOCATION
// =====================================================

export async function GET(
  request: NextRequest,
  { params }: Props
) {
  try {
    const { id: locationId } =
      await params;

     if (!locationId) {
          return NextResponse.json(
            { error: "Missing required logistics location identifier token." },
            { status: 400 }
          );
        }

    // 1. Resolve Location Inflow ID
    const location = await prisma.location.findUnique({
        where: { id: locationId },
        select: { id: true, inflowId: true, name: true, isActive: true, sublocations: { select: { id: true, name: true }} },
    });

    if (!location) {
        return NextResponse.json(
        { error: "Requested location not found in ledgers." },
        { status: 404 }
        );
    }

    return NextResponse.json(
      location
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch location" }, { status: 500 });
  }
}

