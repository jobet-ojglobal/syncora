// app/api/admin/uoms/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, name, category, baseFactor, isActive, conversions } = body;

    if (!code || !name || !category) {
      return NextResponse.json({ error: "Missing required quantitative structural attributes configuration parameters." }, { status: 400 });
    }

    const createdUom = await prisma.$transaction(async (tx) => {
      // 1. Establish the foundational root measurement profile card
      const uom = await tx.unitOfMeasure.create({
        data: { code, name, category, baseFactor, isActive }
      });

      // 2. Hydrate explicitly declared internal translation equations
      if (conversions && conversions.length > 0) {
        await tx.unitConversion.createMany({
          data: conversions.map((c: any) => ({
            fromUomId: uom.id,
            toUomId: c.toUomId,
            factor: c.factor
          }))
        });
      }

      return uom;
    });

    return NextResponse.json(createdUom, { status: 201 });
  } catch (error: any) {
    console.error("Critical failure deploying metrology profile parameters card:", error);
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Collision mapping constraint error. A unit with that code identifier token is already registered." }, { status: 409 });
    }
    return NextResponse.json({ error: "Database transaction runtime validation crash error." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, category, baseFactor, isActive, conversions } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing required targeted identity validation token tracking token reference." }, { status: 400 });
    }

    const revisedUom = await prisma.$transaction(async (tx) => {
      // Wipe historic conversion routes before writing the updated schema mappings parameters
      await tx.unitConversion.deleteMany({ where: { fromUomId: id } });

      // Update structural dimensions metrics attributes markers on parent card index
      const uom = await tx.unitOfMeasure.update({
        where: { id },
        data: { name, category, baseFactor, isActive }
      });

      // Insert fresh, clean calculation factor override mappings entries lines
      if (conversions && conversions.length > 0) {
        await tx.unitConversion.createMany({
          data: conversions.map((c: any) => ({
            fromUomId: id,
            toUomId: c.toUomId,
            factor: c.factor
          }))
        });
      }

      return uom;
    });

    return NextResponse.json(revisedUom, { status: 200 });
  } catch (error) {
    console.error("Failed adjusting system logistics measurement configuration elements:", error);
    return NextResponse.json({ error: "Internal transactional pipeline write operation aborted." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Missing identity reference identification key tracking identifier." }, { status: 400 });
    }

    // 🛡️ Preflight integrity checking rule check inside database fields before running drops
    const boundProductCount = await prisma.productUom.count({ where: { uomId: id } });
    const boundSalesProductCount = await prisma.productSalesUom.count({ where: { uomId: id } });

    if (boundProductCount > 0 || boundSalesProductCount > 0) {
      return NextResponse.json(
        { error: "Relational integrity lock active. This quantitative unit is currently assigned to product stock catalog matrices configuration lines fields." }, 
        { status: 422 }
      );
    }

    // Wrap removals in a single operation block transaction
    await prisma.$transaction(async (tx) => {
      // 1. Wipe conversion references pointing to or from this entity target vector path
      await tx.unitConversion.deleteMany({
        where: {
          OR: [
            { fromUomId: id },
            { toUomId: id }
          ]
        }
      });

      // 2. Clear out the foundational unit record card node
      await tx.unitOfMeasure.delete({
        where: { id }
      });
    });

    return NextResponse.json({ success: true, prunedMetricUnitId: id }, { status: 200 });
  } catch (error) {
    console.error("Metrology database profile drop sequence crashed:", error);
    return NextResponse.json({ error: "Internal Database transaction execution engine aborted instruction command parameter." }, { status: 500 });
  }
}