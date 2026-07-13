// app/api/admin/pricing-schemes/list/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // 1. Extract search and pagination parameters from the URL
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const page = parseInt(searchParams.get("page") || "0", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    const skip = page * limit;

    // 2. Build conditional where filtering block matching non-deleted indices
    const whereClause: any = {
      deletedAt: null,
    };

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { inflowId: { contains: search, mode: "insensitive" } },
      ];
    }

    // 3. Execute concurrently: Fetch both filtered subset rows and grand aggregate total counter metrics
    const [schemes, totalRecords] = await prisma.$transaction([
      prisma.pricingScheme.findMany({
        where: whereClause,
        include: {
          currency: {
            select: {
              isoCode: true,
              symbol: true,
            },
          },
          _count: {
            select: {
              customers: true,
              productPrices: true,
            },
          },
        },
        orderBy: { name: "asc" },
        skip: skip,
        take: limit,
      }),
      prisma.pricingScheme.count({
        where: whereClause,
      }),
    ]);

    // 4. Map records into the matching flat payload properties structural model
    const mappedData = schemes.map((s) => ({
      id: s.id,
      inflowId: s.inflowId,
      name: s.name,
      isActive: s.isActive,
      isDefault: s.isDefault,
      isTaxInclusive: s.isTaxInclusive,
      currencyIso: s.currency?.isoCode || "USD",
      currencySymbol: s.currency?.symbol || "$",
      skuPricePointsCount: s._count.productPrices,
      customerBindingsCount: s._count.customers,
    }));

    // 5. Package output properties inside wrapping matrix constraints required by DataTablePagination
    const pageCount = Math.ceil(totalRecords / limit);

    return NextResponse.json(
      {
        data: mappedData,
        totalRecords,
        pageCount,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Critical failure pulling master pricing layout catalog directory list:", error);
    return NextResponse.json(
      { error: "Database internal core engine exception processing matrix definitions arrays." },
      { status: 500 }
    );
  }
}