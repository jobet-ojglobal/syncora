import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      select: {
        inflowId: true,
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
      id: cat.inflowId,
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