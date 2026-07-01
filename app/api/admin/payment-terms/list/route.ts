// app/api/admin/payment-terms/list/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const terms = await prisma.paymentTerm.findMany({
      where: { deletedAt: null },
      include: {
        _count: {
          select: {
            customers: true,
            vendors: true,
            salesOrders: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const parsedTerms = terms.map((t) => ({
      id: t.id,
      inflowId: t.inflowId,
      name: t.name,
      daysDue: t.daysDue,
      isActive: t.isActive,
      // Accumulate multi-table dependencies counts for archival verification loops
      customerUsageCount: t._count.customers,
      vendorUsageCount: t._count.vendors,
      salesOrderUsageCount: t._count.salesOrders,
      cumulativeDependencies: t._count.customers + t._count.vendors + t._count.salesOrders,
    }));

    return NextResponse.json(parsedTerms, { status: 200 });
  } catch (error) {
    console.error("Critical server breakdown building payment terms matrices roster:", error);
    return NextResponse.json(
      { error: "Database internal server engine crash processing billing timing tokens." },
      { status: 500 }
    );
  }
}