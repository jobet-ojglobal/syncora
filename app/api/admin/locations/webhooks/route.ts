import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; 
import { findLocationWebhookByLocation } from "@/lib/locations/services/webhook.service";

export async function GET(request: NextRequest) {
  try {
    // 1. Fetch active workspace nodes from Prisma
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
      },
      orderBy: {
        name: "asc",
      },
    });

    // 2. Fetch statuses for ALL locations concurrently using your service helper
    const formattedLocations = await Promise.all(
      locations.map(async (loc) => {
        let isOnline = false;

        if (loc.inflowId) {
          try {
            // Re-use your workspace matching function logic
            const webhook = await findLocationWebhookByLocation(loc.inflowId);
            
            // Check if a registration stream instance exists and isn't disabled
            // Customize this condition based on how `webhook` returns when active
            isOnline = !!webhook && !webhook.isDisabled; 
          } catch (err) {
            console.error(`Failed live evaluation lookup for node ${loc.name}:`, err);
            isOnline = false; // Graceful fallback if a single network request drops
          }
        }

        return {
          id: loc.id,
          name: loc.name,
          url: loc.url,
          isOnline: isOnline,
        };
      })
    );

    return NextResponse.json(formattedLocations);
  } catch (error: any) {
    console.error("Error retrieving global locations status matrix maps:", error);
    return NextResponse.json(
      { error: "Failed to load real-time workspace pipelines overview list" },
      { status: 500 }
    );
  }
}