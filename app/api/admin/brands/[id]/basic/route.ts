import {
  NextRequest,
  NextResponse,
} from "next/server";

import { BrandService } from "@/services/brand.service";

interface Props {
  params: Promise<{
    id: string;
  }>;
}

// =====================================================
// GET Brand
// =====================================================

export async function GET(
  request: NextRequest,
  { params }: Props
) {
  try {
    const { id } =
      await params;

    const brand =
      await BrandService.getBasicBrand(
        id
      );

    if (!brand) {
      return NextResponse.json({ error: "Brand not found." }, { status: 400 });
    }

    return NextResponse.json(
      brand
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch brand" }, { status: 500 });
  }
}