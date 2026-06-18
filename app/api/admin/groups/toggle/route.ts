// app/api/admin/product-groups/toggle/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest) {
  try {
    const { inflowId, isActive } = await request.json();

    if (!inflowId) {
      return NextResponse.json({ error: "Missing identity reference code pointer." }, { status: 400 });
    }

    const modifiedGroup = await prisma.productGroup.update({
      where: { inflowId },
      data: { isActive: Boolean(isActive) },
      select: { inflowId: true, isActive: true }
    });

    return NextResponse.json(modifiedGroup, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed updating entity storefront runtime visibility parameters." }, { status: 500 });
  }
}