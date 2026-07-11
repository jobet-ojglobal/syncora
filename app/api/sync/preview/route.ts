// app/api/sync/preview/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTaxingSchemes } from "@/lib/locations/data/taxing-scheme";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const source = searchParams.get("source");
    const locationId = searchParams.get("locationId");

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

    // Dynamic routing depending on your source
    if (source === "taxing_schemes_local") {
      const rawSchemes = await getTaxingSchemes(location.url);
      
      // Transform records into a uniform preview structure
      const previewItems = rawSchemes.map((scheme: any) => ({
        id: String(scheme.taxingSchemeId), // incoming original ID
        name: scheme.name,
        description: `${scheme.taxCodes?.length || 0} nested tax codes present`,
        rawData: scheme, // Cache full object to pass back later
      }));

      return NextResponse.json({ items: previewItems });
    }

    return NextResponse.json({ items: [] });
  } catch (error) {
    console.error("Preview payload error:", error);
    return NextResponse.json({ error: "Failed to generate preview dataset" }, { status: 500 });
  }
}