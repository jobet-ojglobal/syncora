import { LocationService } from "@/services/location.service";
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
    const { id } =
      await params;

    const location =
      await LocationService.getBasicLocation(id);

    if (!location) {
      return NextResponse.json({ error: "Location not found." }, { status: 400 });
    }

    return NextResponse.json(
      location
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch location" }, { status: 500 });
  }
}

