import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Adjust import to your prisma instance path

export async function GET() {
  try {
    // Fetch categories with at least one connected product or product group
    const categories = await prisma.category.findMany({
      where: {
        deletedAt: null,
      },
      select: {
        name: true,
        products: {
          take: 1, // Get at least one connected product
          select: {
            name: true,
          },
        },
        productGroups: {
          take: 1,
          select: {
            name: true,
          },
        },
      },
    });

    // Format into flat row items
    const exportData = categories.map((cat) => {
      // Pick the direct product name or fallback to product group name if available
      const productName =
        cat.products[0]?.name || cat.productGroups[0]?.name || "N/A";

      return {
        productName,
        categoryName: cat.name,
      };
    });

    return NextResponse.json({ success: true, data: exportData });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}