// app/api/admin/uoms/form-hydration/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const targetUomId = searchParams.get("id"); // Passed when transitioning into Edit mode

    // 1. Gather all system units to build the peer lookup matrix layout maps arrays
    const rawLookupList = await prisma.unitOfMeasure.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        category: true,
      },
      orderBy: { code: "asc" },
    });

    let initialFormValues = null;

    // 2. If an ID is provided, query its complete relational tree map definitions
    if (targetUomId) {
      const uomRecord = await prisma.unitOfMeasure.findUnique({
        where: { id: targetUomId },
        include: {
          fromConversions: {
            select: {
              id: true,
              toUomId: true,
              factor: true,
            },
          },
        },
      });

      if (!uomRecord) {
        return NextResponse.json({ error: "Target Unit of Measure record not found." }, { status: 404 });
      }

      // Reformat decimal instances and structure structures to align cleanly with Zod expectations
      initialFormValues = {
        id: uomRecord.id,
        code: uomRecord.code,
        name: uomRecord.name,
        category: uomRecord.category,
        baseFactor: Number(uomRecord.baseFactor),
        isActive: uomRecord.isActive,
        conversions: uomRecord.fromConversions.map((c) => ({
          id: c.id,
          toUomId: c.toUomId,
          factor: Number(c.factor),
        })),
      };
    }

    // Return both critical datasets in a unified corporate payload wrapper block
    return NextResponse.json({
      uomListLookup: rawLookupList,
      initialData: initialFormValues,
    }, { status: 200 });

  } catch (error) {
    console.error("Critical error executing form metadata hydration queries pipeline:", error);
    return NextResponse.json(
      { error: "Internal Server Error parsing metrics relational form states collections." },
      { status: 500 }
    );
  }
}