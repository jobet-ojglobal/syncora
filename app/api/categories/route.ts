// app/api/categories/basic/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      select: {
        inflowCategoryId: true,
        name: true,
        parentId: true,
        parent: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    // Format categories to show simple hierarchy text if a parent exists
    const formattedCategories = categories.map((cat) => ({
      id: cat.inflowCategoryId,
      label: cat.parent 
        ? `${cat.parent.name} → ${cat.name}` 
        : cat.name,
    }));

    return NextResponse.json(formattedCategories, { status: 200 });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Internal Server Error profiles could not be retrieved" },
      { status: 500 }
    );
  }
}