// app/api/admin/attributes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";


/**
 * 🟢 FETCH ATTRIBUTES
 */
export async function GET() {
  try {
    const attributes = await prisma.attribute.findMany({
      include: {
        values: {
          orderBy: { value: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(attributes, { status: 200 });
  } catch (error) {
    console.error("Failed to query systems attributes list:", error);
    return NextResponse.json(
      { error: "Internal Database processing error." },
      { status: 500 }
    );
  }
}

/**
 * 🟢 CREATE ATTRIBUTE WITH NESTED VALUES
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, values } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Master attribute name is required." }, { status: 400 });
    }

    const nameKey = name.trim();

    // Prevent duplicate attributes
    const existing = await prisma.attribute.findUnique({ where: { name: nameKey } });
    if (existing) {
      return NextResponse.json({ error: `Attribute "${nameKey}" is already configured.` }, { status: 409 });
    }

    // Create atomicity via a standard database transaction
    const result = await prisma.$transaction(async (tx) => {
      return tx.attribute.create({
        data: {
          name: nameKey,
          values: {
            create: values.map((v: any) => ({
              value: v.value.trim(),
              hexCode: v.hexCode?.trim() || null,
            })),
          },
        },
        include: { values: true },
      });
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Failed creating dynamic attributes:", error);
    return NextResponse.json({ error: "Internal Database insertion engine failure." }, { status: 500 });
  }
}

/**
 * 🟡 PATCH/UPDATE ATTRIBUTE & VALUES CACHE
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, values } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing master ID target pointer token." }, { status: 400 });
    }

    const updatedName = name.trim();

    // Verify name changes against alternative collisions
    const collisionCheck = await prisma.attribute.findFirst({
      where: { name: updatedName, NOT: { id } },
    });
    if (collisionCheck) {
      return NextResponse.json({ error: `The name "${updatedName}" is already claimed.` }, { status: 409 });
    }

    const updatedAttribute = await prisma.$transaction(async (tx) => {
      // Step A: Update the parent attribute name header
      await tx.attribute.update({
        where: { id },
        data: { name: updatedName },
      });

      // Step B: Identify incoming values to preserve vs values to drop entirely
      const incomingValueIds = values.map((v: any) => v.id).filter(Boolean);

      // Wipe out any database sub-values that were deleted from the UI field array
      await tx.attributeValue.deleteMany({
        where: {
          attributeId: id,
          id: { notIn: incomingValueIds },
        },
      });

      // Step C: Upsert remaining values loops
      for (const val of values) {
        if (val.id) {
          // Update existing row configurations
          await tx.attributeValue.update({
            where: { id: val.id },
            data: {
              value: val.value.trim(),
              hexCode: val.hexCode?.trim() || null,
            },
          });
        } else {
          // Construct freshly appended variant options values rows
          await tx.attributeValue.create({
            data: {
              attributeId: id,
              value: val.value.trim(),
              hexCode: val.hexCode?.trim() || null,
            },
          });
        }
      }

      return tx.attribute.findUnique({
        where: { id },
        include: { values: true },
      });
    });

    return NextResponse.json(updatedAttribute, { status: 200 });
  } catch (error) {
    console.error("Failed adjusting system variation arrays:", error);
    return NextResponse.json({ error: "Internal database tracking update update breakdown." }, { status: 500 });
  }
}