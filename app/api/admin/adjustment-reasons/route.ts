import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Adjust path to your Prisma client instance
import { adjustmentReasonSchema } from "@/schemas/adjustment-reason.schema";
import { Prisma } from "@/generated/prisma/client";

// GET: Fetch list of adjustment reasons (excluding soft-deleted)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const activeOnly = searchParams.get("activeOnly") === "true";

    const adjustmentReasons = await prisma.adjustmentReason.findMany({
      where: {
        deletedAt: null, // Ignore soft-deleted records
        ...(activeOnly ? { isActive: true } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { inflowId: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(adjustmentReasons, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch adjustment reasons." },
      { status: 500 }
    );
  }
}

// POST: Create a new AdjustmentReason
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. Validate payload with Zod schema
    const validatedData = adjustmentReasonSchema.parse(body);

    // 2. Insert into database
    const newReason = await prisma.adjustmentReason.create({
      data: {
        inflowId: crypto.randomUUID().toLowerCase(),
        name: validatedData.name,
        isActive: validatedData.isActive,
        isInternal: validatedData.isInternal,
      },
    });

    return NextResponse.json(newReason, { status: 201 });
  } catch (error: any) {
    // Handle duplicate unique constraint error (P2002 for inflowId)
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "An adjustment reason with this inflowId already exists." },
        { status: 409 }
      );
    }

    // Handle Zod validation error
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation failed.", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to create adjustment reason." },
      { status: 500 }
    );
  }
}

// PATCH: Update an existing AdjustmentReason
export async function PATCH(req: Request) {
  try {
    const body = await req.json();

    // 1. Ensure ID is present for updates
    if (!body.id) {
      return NextResponse.json(
        { error: "Adjustment Reason ID is required for updating." },
        { status: 400 }
      );
    }

    // 2. Validate payload
    const validatedData = adjustmentReasonSchema.parse(body);

    // 3. Update database record
    const updatedReason = await prisma.adjustmentReason.update({
      where: { id: validatedData.id },
      data: {
        name: validatedData.name,
        isActive: validatedData.isActive,
        isInternal: validatedData.isInternal,
      },
    });

    return NextResponse.json(updatedReason, { status: 200 });
  } catch (error: any) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Adjustment Reason record not found." },
        { status: 404 }
      );
    }

    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation failed.", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to update adjustment reason." },
      { status: 500 }
    );
  }
}