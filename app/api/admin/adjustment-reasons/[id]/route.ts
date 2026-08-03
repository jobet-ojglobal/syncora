import { prisma } from "@/lib/prisma";
import { SoftDeleteRepository } from "@/lib/softDeleteRepository";
import { NextRequest, NextResponse } from "next/server";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: recordId } = await context.params;

    if (!recordId) {
      return NextResponse.json(
        { error: "Missing required adjustment reason identifier parameter." },
        { status: 400 }
      );
    }

    // 1. Fetch record with relational reference counts
    const record = await prisma.adjustmentReason.findFirst({
      where: { 
        id: recordId, 
        deletedAt: null 
      },
      include: {
        _count: {
          select: {
            stockAdjustments: true,
            inventoryAdjustments: true,
          },
        },
      },
    });

    if (!record) {
      return NextResponse.json(
        { error: "Adjustment reason not found or has already been archived." },
        { status: 404 }
      );
    }

    // 2. Preflight relationship integrity check loops: guarantee zero alignment anomalies
    const accumulatedSystemReferences =
      record._count.stockAdjustments + record._count.inventoryAdjustments;

    if (accumulatedSystemReferences > 0) {
      return NextResponse.json(
        {
          error:
            "Forbidden system mutation transaction. Cannot archive reason because it is actively referenced in stock or inventory adjustment logs.",
          referencesCount: accumulatedSystemReferences,
        },
        { status: 422 }
      );
    }

    // 3. Execute Soft Delete
    await SoftDeleteRepository.softDelete("adjustmentReason", recordId);

    return NextResponse.json(
      { success: true, message: "Adjustment reason archived successfully." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Adjustment reason archival sweep rolled back and failed:", error);
    return NextResponse.json(
      { error: "Internal Server database operational pipeline exception mutating timing values fields." },
      { status: 500 }
    );
  }
}