import { LocationService } from "@/services/location.service";
import { NextRequest, NextResponse } from "next/server";

interface Props {
  params: Promise<{
    id: string;
  }>;
}

// ======================================================
// DELETE BRAND
// ======================================================

export async function DELETE(
  request: NextRequest,
  { params }: Props
) {
  try {
    const { id } = await params;

    await LocationService.softDelete(id);

    return NextResponse.json({
      success: true,
      message:  `Location successfully soft deleted.`
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete location." }, { status: 500 });
  }
}