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
      return NextResponse.json({  
        success: false,
        message: `Category not found.`, 
      }, { status: 404 });
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
// UPDATE CATEGORY
// =====================================================


export async function PATCH(
  request: NextRequest,
  { params }: Props
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, imageUrl, parentId } = body;

    if (!id) {
      return NextResponse.json({  
        success: false,
        message: `Missing required id target pointer token`, 
      }, { status: 400 });
    }

    if (!name?.trim()) {
      return NextResponse.json({  
        success: false,
        message: `Category workspace name cannot be left empty`, 
      }, { status: 400 });
    }

    // 1. Fetch current database record to check if name changed
    const currentCategory = await CategoryService.getBasicCategory(id);
    if (!currentCategory) {
      return NextResponse.json({  
        success: false,
        message: `Category not found in local system records`, 
      }, { status: 404 });
    }

    const categoryName = await CategoryService.findCategoryByNameForDuplicate(id, name);
    if (categoryName) {
      return NextResponse.json({  
        success: false,
        message: `${name} already exists`, 
      }, { status: 409 });
    }

    const updatedCategory = await CategoryService.updateCategory({
        id, name, description, imageUrl, parentId: parentId || null,
      });

    return NextResponse.json(updatedCategory, { status: 200 });
  } catch (error: any) {
    console.error("Critical failure during Category model update writes:", error);
    return NextResponse.json({ error: "Internal Database execution update error occurred" }, { status: 500 });
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
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
  }
}