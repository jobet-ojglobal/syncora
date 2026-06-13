import { CategoryService } from "@/services/category.service";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const categories =
      await CategoryService.getBasicCategories();

    return NextResponse.json(
      categories
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        message:
          "Failed to fetch categories",
      },
      {
        status: 500,
      }
    );
  }
}
