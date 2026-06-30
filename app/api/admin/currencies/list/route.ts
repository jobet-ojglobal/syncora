// app/api/admin/currencies/list/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const currencies = await prisma.currency.findMany({
      where: { deletedAt: null },
      include: {
        conversions: {
          orderBy: { createdAt: "desc" },
          take: 1, // Extract the most recent conversion vector multiplier record
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
    });

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
        
        // Flatten conversion parameters down safely with defaults if log row is missing
        exchangeRate: activeConversion ? Number(activeConversion.exchangeRate) : 1.00000000,
        isManual: activeConversion ? activeConversion.isManual : true,
        rateLastUpdated: activeConversion ? activeConversion.updatedAt.toISOString() : c.updatedAt.toISOString(),
        
        // Sum structural references weights to calculate balance locking safety blocks
        dependencyCount: c._count.vendors + c._count.customerBalances + c._count.vendorBalances + c._count.pricingSchemes
      };
    });

    return NextResponse.json(parsedCurrencies, { status: 200 });
  } catch (error) {
    console.error("Critical error building master currencies management directory index:", error);
    return NextResponse.json(
      { error: "Internal Database processing exception compiling monetary collections arrays." },
      { status: 500 }
    );
  }
}