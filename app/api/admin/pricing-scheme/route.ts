// app/api/admin/pricing-schemes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { currencyId, name, isActive, isDefault, isTaxInclusive } = body;

    if (!name?.trim() || !currencyId) {
      return NextResponse.json({ error: "Missing required naming titles or currency relationship tokens." }, { status: 400 });
    }

    const compiledScheme = await prisma.$transaction(async (tx) => {
      // 1. If this matrix is flagged as global baseline, un-flag current entries to avoid schema corruption
      if (isDefault) {
        await tx.pricingScheme.updateMany({
          where: { isDefault: true },
          data: { isDefault: false }
        });
      }

      // 2. Commit transaction record row entry mapping object card onto parent scheme context
      return await tx.pricingScheme.create({
        data: {
          inflowId: crypto.randomUUID().toLowerCase(),
          currencyId,
          name: name.trim(),
          isActive,
          isDefault,
          isTaxInclusive
        }
      });
    });

    return NextResponse.json(compiledScheme, { status: 201 });
  } catch (error) {
    console.error("Pricing scheme deployment transaction aborted:", error);
    return NextResponse.json({ error: "Internal operational database connection transaction error." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, isActive, isDefault, isTaxInclusive } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing required profile primary identity lookup parameters." }, { status: 400 });
    }

    const alteredScheme = await prisma.$transaction(async (tx) => {
      // Balance systems options rules globally
      if (isDefault) {
        await tx.pricingScheme.updateMany({
          where: { NOT: { id }, isDefault: true },
          data: { isDefault: false }
        });
      }

      return await tx.pricingScheme.update({
        where: { id },
        data: {
          name: name.trim(),
          isActive,
          isDefault,
          isTaxInclusive
        }
      });
    });

    return NextResponse.json(alteredScheme, { status: 200 });
  } catch (error) {
    console.error("Pricing scheme properties alteration aborted:", error);
    return NextResponse.json({ error: "Internal Server error processing transactional update sequence modifications." }, { status: 500 });
  }
}