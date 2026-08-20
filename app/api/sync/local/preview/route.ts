import { getLocalInventoryLines } from "@/lib/locations/data/product-local";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { locationId, source, count = 10, after, includes = [] } = body;

    const EXCLUDED_INCLUDES = new Set(["coreData", "brand"]);
    const cleanIncludes = (includes ?? []).filter((item: string) => !EXCLUDED_INCLUDES.has(item));

    if (!source || !locationId) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const location = await prisma.location.findUnique({
      where: { id: locationId },
      select: { url: true }
    });

    if (!location?.url) {
      return NextResponse.json({ error: "Location endpoint URL not configured" }, { status: 400 });
    }

    if (source === "inventory_lines_local") {
        const items = await getLocalInventoryLines(location.url, count, after);
        const rawList = Array.isArray(items) ? items : [];

        const normalizedItems = rawList.map((loc: any) => ({
            ...loc,
            itemId: loc.locationId || loc.inflowId || loc.id,
            name: loc.name || "Unnamed Location",
        }));

        const endCursor = normalizedItems.length > 0 
            ? normalizedItems[normalizedItems.length - 1].itemId 
            : null;

        return NextResponse.json({
            items: normalizedItems,
            pageInfo: {
            hasNextPage: rawList.length === count,
            endCursor,
            },
        });
    }

    return NextResponse.json({ items: [], pageInfo: { hasNextPage: false, endCursor: null } });
  } catch (error) {
    console.error("Preview API Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load preview" },
      { status: 500 }
    );
  }
}