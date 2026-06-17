// app/api/admin/tags/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Collect taxonomy options combined with direct dynamic sub-query product counters
    const tagsWithRelations = await prisma.tag.findMany({
      orderBy: {
        name: "asc"
      },
      include: {
        _count: {
          select: {
            products: true // Pull count directly from ProductTag dynamic map relations
          }
        }
      }
    });

    return NextResponse.json(tagsWithRelations, { status: 200 });
  } catch (error) {
    console.error("Critical error building administrative taxonomy index mappings:", error);
    return NextResponse.json(
      { error: "Database internal collection matrix parsing sequence failed." }, 
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Missing required tag designation string value." }, { status: 400 });
    }

    const standardName = name.trim();

    // Check for unique index constraint collisions before running writes
    const preExisting = await prisma.tag.findUnique({ where: { name: standardName } });
    if (preExisting) {
      return NextResponse.json({ error: `The tag mapping criteria label "${standardName}" is already active.` }, { status: 409 });
    }

    const createdTag = await prisma.tag.create({
      data: { name: standardName }
    });

    return NextResponse.json(createdTag, { status: 201 });
  } catch (error) {
    console.error("Critical failure during taxonomy index construction:", error);
    return NextResponse.json({ error: "Internal Database execution pipeline write aborted." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name } = body;

    if (!id || !name?.trim()) {
      return NextResponse.json({ error: "Missing required identity or modification value references." }, { status: 400 });
    }

    const standardName = name.trim();

    // Ensure the updated value doesn't conflict with another existing tag
    const preExisting = await prisma.tag.findFirst({
      where: {
        name: standardName,
        NOT: { id: id }
      }
    });
    if (preExisting) {
      return NextResponse.json({ error: `Another taxonomy entity matches the label "${standardName}".` }, { status: 409 });
    }

    const alteredTag = await prisma.tag.update({
      where: { id },
      data: { name: standardName }
    });

    return NextResponse.json(alteredTag, { status: 200 });
  } catch (error) {
    console.error("Critical error modifying taxonomy tracking references:", error);
    return NextResponse.json({ error: "Internal Database modification transaction process crashed." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Missing required identifier keys target point." }, { status: 400 });
    }

    // Run an atomic transaction block to safely clean up relational lines before deleting the parent tag
    await prisma.$transaction(async (tx) => {
      // 1. Wipe out intermediate dynamic junction product mapping markers
      await tx.productTag.deleteMany({
        where: { tagId: id }
      });

      // 2. Drop the primary tag classification card
      await tx.tag.delete({
        where: { id }
      });
    });

    return NextResponse.json({ success: true, prunedTagId: id }, { status: 200 });
  } catch (error) {
    console.error("Taxonomy removal routing process crash exception:", error);
    return NextResponse.json({ error: "Internal Database execution transaction engine error." }, { status: 500 });
  }
}