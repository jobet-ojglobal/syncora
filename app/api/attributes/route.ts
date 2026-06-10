// app/api/attributes/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Fetch global attributes along with their pre-defined master values
    const attributes = await prisma.attribute.findMany({
      include: {
        values: {
          select: {
            id: true,
            value: true,
            hexCode: true,
          },
          orderBy: {
            value: "asc",
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    // Format the payload cleanly for front-end multi-select/combobox selectors
    const formattedAttributes = attributes.map((attr) => ({
      attributeId: attr.id,
      name: attr.name, // e.g., "Color", "Configuration"
      options: attr.values.map((val) => ({
        valueId: val.id,
        label: val.value, // e.g., "Red", "256GB SSD"
        meta: val.hexCode ? { hexCode: val.hexCode } : null, // Useful for visual color swatches
      })),
    }));

    return NextResponse.json(formattedAttributes, { status: 200 });
  } catch (error) {
    console.error("Error fetching master attribute taxonomy:", error);
    return NextResponse.json(
      { error: "Internal Server Error occurred while fetching global attributes" },
      { status: 500 }
    );
  }
}