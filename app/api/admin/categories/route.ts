// app/api/categories/basic/route.ts
import { NextRequest, NextResponse } from "next/server";
import { CategoryService } from "@/services/category.service";
import { prisma } from "@/lib/prisma";

// =====================================================
// GET ALL CATEGORIES
// =====================================================

export async function GET() {
  try {
    const catalogData =
      await CategoryService.getCategories();

    const formattedData = catalogData.map(cat => ({
      id: cat.id,
      inflowId: cat.inflowId,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      imageUrl: cat.imageUrl,
      parentId: cat.parentId,
      productsCount: cat._count.productGroups,
      subcategoriesCount: cat._count.children,
    }));

    return NextResponse.json(formattedData, { status: 200 });
  } catch (error) {
    console.error(error);

    return NextResponse.json({ error: "Failed to fetch categoriesr" }, { status: 500 });
  }
}

// =====================================================
// CREATE CATEGORY
// =====================================================

export async function POST(
  request: NextRequest
) {
  try {
    const body = await request.json();
    const { name, description, imageUrl, parentId } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is a required payload token" }, { status: 400 });
    }

    // 1. Fetch current database record to check if name changed
    const findCategory = await prisma.category.findFirst({
      where: { name: name as string },
    });

    if (findCategory) {
      return NextResponse.json({  
        success: false,
        message: `${name} already exists`, 
      }, { status: 409 });
    }

    const newCategory =
      await CategoryService.createCategory({
          name, description, imageUrl, parentId: parentId || null,
      });

    return NextResponse.json(newCategory, { status: 201 });
  } catch (error: any) {
    console.error("Critical failure during Category transaction writes:", error);
    return NextResponse.json({ error: "Internal Database Execution Error" }, { status: 500 });
  }
}

