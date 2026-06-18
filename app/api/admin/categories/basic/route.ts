import { NextResponse } from "next/server";
import { CategoryService } from "@/services/category.service";

// =====================================================
// GET ALL CATEGORIES
// =====================================================

export async function GET() {
  try {
    const categories =
      await CategoryService.getBasicCategories();
    
    // const formattedCategories = categories.map((cat) => ({
    //   id: cat.inflowId,
    //   label: cat.name,
    // }));

    return NextResponse.json(
      categories
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json({ error: "Failed to fetch categoriesr" }, { status: 500 });
  }
}