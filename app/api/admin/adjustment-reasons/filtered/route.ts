import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // 1. Extract search, status, and pagination parameters from the URL
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status") || "all"; // "all" | "active" | "inactive"
    const activeOnly = searchParams.get("activeOnly") === "true"; // Backward compatibility
    const page = parseInt(searchParams.get("page") || "0", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    const skip = page * limit;

    // 2. Resolve target boolean status flag
    let isActiveFilter: boolean | undefined;
    if (status === "active" || activeOnly) {
      isActiveFilter = true;
    } else if (status === "inactive") {
      isActiveFilter = false;
    }

    // 3. Construct Prisma filtering matrix
    const whereClause: Prisma.AdjustmentReasonWhereInput = {
      deletedAt: null,
      ...(isActiveFilter !== undefined && { isActive: isActiveFilter }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { inflowId: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    // 4. Concurrently query paginated rows and total matching count
    const [reasons, totalRecords] = await prisma.$transaction([
      prisma.adjustmentReason.findMany({
        where: whereClause,
        orderBy: { name: "asc" },
        skip: skip,
        take: limit,
      }),
      prisma.adjustmentReason.count({
        where: whereClause,
      }),
    ]);

    // 5. Calculate pagination bounds
    const pageCount = Math.ceil(totalRecords / limit);

    return NextResponse.json(
      {
        data: reasons,
        totalRecords,
        pageCount,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to fetch adjustment reasons listing:", error);
    return NextResponse.json(
      { error: "Failed to retrieve adjustment reasons from database registers." },
      { status: 500 }
    );
  }
}