// app\api\admin\locations\status\route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest) {
  try {
    const { inflowId, status } = await request.json();

    if (!inflowId) {
      return NextResponse.json({ error: "Missing identity reference code pointer." }, { status: 400 });
    }

    const modifiedGroup = await prisma.location.update({
      where: { inflowId },
      data: { 
        isActive: Boolean(status === 'ACTIVE'),
        status: status
    },
      select: { inflowId: true, isActive: true, status: true }
    });

    return NextResponse.json(modifiedGroup, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed updating location runtime visibility parameters." }, { status: 500 });
  }
}
