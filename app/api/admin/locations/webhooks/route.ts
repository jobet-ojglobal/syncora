import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Adjust this route according to your architecture project root

export async function GET(request: NextRequest) {
  try {
    // 1. Fetch active locations from Prisma
    // Note: If you have soft deletes enabled via a middleware, deletedAt: null is handled automatically
    const locations = await prisma.location.findMany({
      where: {
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        inflowId: true,
        name: true,
        url: true,
        webhooks: {
          select: {
            isDisabled: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    // 2. Format the payload to fit your LocationSwitcher expected contract properties
    const formattedLocations = locations.map((loc) => {
      // Determine online/offline based on whether a webhook exists and is active
      const hasWebhooks = loc.webhooks.length > 0;
      const isOnline = hasWebhooks && loc.webhooks.every((w) => !w.isDisabled);

      return {
        id: loc.id,
        name: loc.name,
        url: loc.url,
        isOnline: isOnline,
      };
    });

    return NextResponse.json(formattedLocations);
  } catch (error: any) {
    console.error("Error retrieving locations matrix setup:", error);
    return NextResponse.json(
      { error: "Failed to fetch locations list data pipeline context" },
      { status: 500 }
    );
  }
}