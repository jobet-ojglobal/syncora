import { getCategories } from "@/lib/inflow/data/categories";
import { getLocations } from "@/lib/inflow/data/locations";
import { getProducts } from "@/lib/inflow/data/products";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { source, count = 10, after, includes = [] } = body;

    const EXCLUDED_INCLUDES = new Set(["coreData", "brand"]);
    const cleanIncludes = (includes ?? []).filter((item: string) => !EXCLUDED_INCLUDES.has(item));

    if (source === "categories") {
      const items = await getCategories(count, after);
      const rawList = Array.isArray(items) ? items : [];

      const normalizedItems = rawList.map((loc: any) => ({
        ...loc,
        itemId: loc.categoryId || loc.inflowId || loc.id,
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
    } else if (source === "products") {
      const items = await getProducts(count, after, cleanIncludes);
      const rawList = Array.isArray(items) ? items : [];

      const normalizedItems = rawList.map((product: any) => ({
        ...product,
        itemId: product.productId || product.id,
        name: product.name || product.description || "Unnamed Product",
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
    } else if (source === "locations") {
      const items = await getLocations(count, after, cleanIncludes);
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