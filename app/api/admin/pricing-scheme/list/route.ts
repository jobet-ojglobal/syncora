// app/api/admin/pricing-schemes/list/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const schemes = await prisma.pricingScheme.findMany({
      where: { deletedAt: null },
      include: {
        currency: {
          select: {
            isoCode: true,
            symbol: true
          }
        },
        _count: {
          select: {
            customers: true,
            productPrices: true
          }
        }
      },
      orderBy: { name: "asc" }
    });

    const outputPayload = schemes.map(s => ({
      id: s.id,
      inflowId: s.inflowId,
      name: s.name,
      isActive: s.isActive,
      isDefault: s.isDefault,
      isTaxInclusive: s.isTaxInclusive,
      currencyIso: s.currency.isoCode,
      currencySymbol: s.currency.symbol || "$",
      skuPricePointsCount: s._count.productPrices,
      customerBindingsCount: s._count.customers
    }));

    return NextResponse.json(outputPayload, { status: 200 });
  } catch (error) {
    console.error("Critical failure pulling master pricing layout catalog directory list:", error);
    return NextResponse.json(
      { error: "Database internal core engine exception processing matrix definitions arrays." },
      { status: 500 }
    );
  }
}