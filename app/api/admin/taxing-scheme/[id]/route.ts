import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Missing required taxing scheme id identifier key token." }, { status: 400 });
    }

    const scheme = await prisma.taxingScheme.findUnique({
      where: { id, deletedAt: null },
      include: {
        _count: {
        select: {
          customers: true,
          vendors: true,
          productTaxCodes: true,
        },
        },
      },
    });

    if (!scheme) {
      return NextResponse.json({ error: "Taxing Scheme not found." }, { status: 404 });
    }

    const dependencyCount = scheme._count.customers + scheme._count.vendors + scheme._count.productTaxCodes;

    if(dependencyCount > 0) {
        return NextResponse.json({
        error: `Cannot delete "${scheme.name}". It is actively bound to ${dependencyCount} business accounts, profiles, or product rules.`
      }, { status: 422 });
    }

    await prisma.taxingScheme.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Fiscal scheme dropped safely" }, { status: 200 });
  } catch (error) {
    console.error("Critical failure during taxing scheme record deletion:", error);
    return NextResponse.json({ error: "Internal Database transaction pipeline modification failure." }, { status: 500 });
  }
}