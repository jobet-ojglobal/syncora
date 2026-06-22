import {
  NextRequest,
  NextResponse,
} from "next/server";
import { CategoryService } from "@/services/category.service";

interface Props {
  params: Promise<{
    id: string;
  }>;
}

// =====================================================
// GET CATEGORY
// =====================================================

export async function GET(
  request: NextRequest,
  { params }: Props
) {
  try {
    const { id } =
      await params;

    const category =
      await CategoryService.getCategoryById(
        id
      );

    if (!category) {
      return NextResponse.json({ error: "Brand not found." }, { status: 400 });
    }

    return NextResponse.json(
      category
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch category" }, { status: 500 });
  }
}

// =====================================================
// DELETE CATEGORY
// =====================================================

export async function DELETE(
  request: NextRequest,
  { params }: Props
) {
  try {
    const { id } = await params;

    await CategoryService.deleteCategory(
      id
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || "Failed to delete category" }, { status: 500 });
  }
}