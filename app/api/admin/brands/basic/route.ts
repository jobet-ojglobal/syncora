import { NextResponse } from "next/server";
import { BrandService } from "@/services/brand.service";

export async function GET() {
  try {
    const brands = await BrandService.getBasicBrands();

    return NextResponse.json(brands, { status: 200 });
  } catch (error) {
    console.error("Error fetching brand catalog taxonomy:", error);
    return NextResponse.json(
      { error: "Internal Server Error occurred while fetching global brands" },
      { status: 500 }
    );
  }
}