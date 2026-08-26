// app/api/admin/uoms/list/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const units = await prisma.unitOfMeasure.findMany({
      include: {
        fromConversions: {
          select: {
            factor: true,
            toUom: { select: { code: true, name: true } }
          }
        },
        _count: {
          select: {
            purchasingUoms: true,
            salesUoms: true
          }
        }
      },
      orderBy: [
        { category: "asc" },
        { code: "asc" }
      ]
    });

    const formattedUnits = units.map(u => ({
      id: u.id,
      code: u.code,
      name: u.name,
      category: u.category,
      baseFactor: Number(u.baseFactor),
      isActive: u.isActive,
      dependentProductsCount: u._count.purchasingUoms + u._count.salesUoms,
      explicitConversions: u.fromConversions.map(c => ({
        factor: Number(c.factor),
        targetCode: c.toUom.code,
        targetName: c.toUom.name
      }))
    }));

    return NextResponse.json(formattedUnits, { status: 200 });
  } catch (error) {
    console.error("Critical error building metrology dashboard list indices:", error);
    return NextResponse.json(
      { error: "Database engine internal error parsing unit metrics indexes arrays." },
      { status: 500 }
    );
  }
}