// app/api/admin/vendors/list/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const vendors = await prisma.vendor.findMany({
      where: { deletedAt: null },
      include: {
        currency: {
            select: { isoCode: true }
        },
        businessPartner: true,
        dues: {
          take: 1, // Capture base currency aging ledger anchor row
        },
        _count: {
          select: {
            products: true,
            purchaseOrders: true,
          }
        }
      },
      orderBy: { businessPartner: { name: "asc" } },
    });

    const parsedRows = vendors.map((v) => {
      const liveDuesRow = v.dues[0];
      
      // Accumulate multi-tier liability buckets to compute gross dynamic leverage
      const totalOutstandingDebt = liveDuesRow 
        ? Number(liveDuesRow.amountCurrent) + 
          Number(liveDuesRow.amount1To30) + 
          Number(liveDuesRow.amount31To60) + 
          Number(liveDuesRow.amount61Plus)
        : 0;

      return {
        id: v.id,
        inflowId: v.inflowId,
        legalName: v.businessPartner.name,
        email: v.businessPartner.email || "N/A",
        phone: v.businessPartner.phone || "N/A",
        isActive: v.businessPartner.isActive,
        catalogItemsCount: v._count.products,
        purchaseOrdersCount: v._count.purchaseOrders,
        currencyCode: v.currency?.isoCode || "USD",
        outstandingBalance: totalOutstandingDebt,
        hasCriticalPastDue: liveDuesRow ? Number(liveDuesRow.amount61Plus) > 0 : false,
      };
    });

    return NextResponse.json(parsedRows, { status: 200 });
  } catch (error) {
    console.error("Critical error building vendors matrix index:", error);
    return NextResponse.json(
      { error: "Database infrastructure fault parsing vendor index pipelines parameters." },
      { status: 500 }
    );
  }
}