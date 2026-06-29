// app/api/admin/taxing-schemes/list/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const schemes = await prisma.taxingScheme.findMany({
      where: { deletedAt: null },
      include: {
        taxCodes: {
          where: { deletedAt: null },
          select: {
            inflowId: true,
            name: true,
            tax1Rate: true,
            tax2Rate: true,
            isActive: true,
          },
          orderBy: { name: "asc" },
        },
        _count: {
          select: {
            customers: true,
            vendors: true,
            productTaxCodes: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const formattedSchemes = schemes.map((s) => ({
      id: s.id,
      inflowId: s.inflowId,
      name: s.name,
      isActive: s.isActive,
      isDefault: s.isDefault,
      calculateTax2OnTax1: s.calculateTax2OnTax1,
      tax1Name: s.tax1Name || "Tax 1",
      tax1OnShipping: s.tax1OnShipping,
      tax2Name: s.tax2Name,
      tax2OnShipping: s.tax2OnShipping,
      defaultTaxCodeId: s.defaultTaxCodeId,
      dependencyCount: s._count.customers + s._count.vendors + s._count.productTaxCodes,
      taxCodes: s.taxCodes.map((tc) => ({
        inflowId: tc.inflowId,
        name: tc.name,
        isActive: tc.isActive,
        tax1Rate: Number(tc.tax1Rate || 0),
        tax2Rate: Number(tc.tax2Rate || 0),
      })),
    }));

    return NextResponse.json(formattedSchemes, { status: 200 });
  } catch (error) {
    console.error("Critical failure compiling taxing schemes list matrix:", error);
    return NextResponse.json(
      { error: "Database internal engine crash pulling fiscal records." },
      { status: 500 }
    );
  }
}