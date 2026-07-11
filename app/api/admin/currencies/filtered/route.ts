import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse Query parameters with safe structural fallbacks
    const search = searchParams.get("search")?.trim() || "";
    const page = parseInt(searchParams.get("page") || "0", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    // Build reusable filtering conditions block
    const whereClause: any = {
      deletedAt: null,
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { isoCode: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    // Multi-threaded lookups: query aggregate dataset ceiling along with targeted segment
    const [totalRecords, currencies] = await Promise.all([
      prisma.currency.count({ where: whereClause }),
      prisma.currency.findMany({
        where: whereClause,
        skip: page * limit,
        take: limit,
        include: {
          conversions: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              exchangeRate: true,
              isManual: true,
              updatedAt: true
            }
          },
          _count: {
            select: {
              vendors: true,
              customerBalances: true,
              vendorBalances: true,
              pricingSchemes: true
            }
          }
        },
        orderBy: { isoCode: "asc" }
      })
    ]);

    const parsedCurrencies = currencies.map(c => {
      const activeConversion = c.conversions[0];
      return {
        id: c.id,
        inflowId: c.inflowId,
        name: c.name,
        isoCode: c.isoCode,
        symbol: c.symbol || "",
        decimalPlaces: c.decimalPlaces,
        decimalSeparator: c.decimalSeparator || ".",
        thousandsSeparator: c.thousandsSeparator || ",",
        isSymbolFirst: c.isSymbolFirst,
        negativeType: c.negativeType || "Leading",
        
        exchangeRate: activeConversion ? Number(activeConversion.exchangeRate) : 1.00000000,
        isManual: activeConversion ? activeConversion.isManual : true,
        rateLastUpdated: activeConversion ? activeConversion.updatedAt.toISOString() : c.updatedAt.toISOString(),
        
        dependencyCount: c._count.vendors + c._count.customerBalances + c._count.vendorBalances + c._count.pricingSchemes
      };
    });

    const pageCount = Math.ceil(totalRecords / limit);

    return NextResponse.json({
      data: parsedCurrencies,
      totalRecords,
      pageCount
    }, { status: 200 });

  } catch (error) {
    console.error("Critical error building master currencies management directory index:", error);
    return NextResponse.json(
      { error: "Internal Database processing exception compiling monetary collections arrays." },
      { status: 500 }
    );
  }
}