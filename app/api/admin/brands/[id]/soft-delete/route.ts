import { BrandService } from "@/services/brand.service";
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

    await BrandService.softDelete(id);

    return NextResponse.json({
      success: true,
      message:  `Brand successfully soft deleted.`
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete brand." }, { status: 500 });
  }
}