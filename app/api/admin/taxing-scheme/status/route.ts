import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, isActive } = body;

    // 1. Validate required record ID
    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { message: "Missing or invalid taxing scheme identifier." },
        { status: 400 }
      );
    }

    // 2. Validate boolean status input
    if (typeof isActive !== "boolean") {
      return NextResponse.json(
        { message: "Missing or invalid target status boolean value." },
        { status: 400 }
      );
    }

    // 3. Verify record existence & non-deleted state
    const existingTax = await prisma.taxingScheme.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!existingTax) {
      return NextResponse.json(
        { message: "Taxing reason not found or has been archived." },
        { status: 404 }
      );
    }

    // 4. Perform active status mutation
    const updatedRecord = await prisma.taxingScheme.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        name: true,
        isActive: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: updatedRecord,
      },
      { status: 200 }
    );
  } catch (error) {
    // Handle record not found error from Prisma
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { message: "Taxing scheme record not found in system registers." },
        { status: 404 }
      );
    }

    console.error("Failed to update taxing scheme status vector:", error);
    return NextResponse.json(
      { message: "Internal Server database error updating taxing scheme status." },
      { status: 500 }
    );
  }
}