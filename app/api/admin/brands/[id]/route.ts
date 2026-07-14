import { prisma } from "@/lib/prisma";
import { SoftDeleteRepository } from "@/lib/softDeleteRepository";
import { BrandService } from "@/services/brand.service";
import { NextRequest, NextResponse } from "next/server";

interface Props {
  params: Promise<{
    id: string;
  }>;
}

// ======================================================
// GET BRAND
// ======================================================

export async function GET(
  request: NextRequest,
  { params }: Props
) {
  try {
    const { id } = await params;

    const brand =
      await prisma.brand.findUnique({
        where: {
          id,
        },

        include: {
          groups: {
            include: {
              category: true,
            },
          },

          _count: {
            select: {
              products: true,
            },
          },
        },
      });

    if (!brand) {
      return NextResponse.json({ error: "Brand not found." }, { status: 400 });
    }

    return NextResponse.json(
      brand
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch brand" }, { status: 500 });
  }
}

// ======================================================
// DELETE BRAND
// ======================================================

export async function DELETE(
  request: NextRequest,
  { params }: Props
) {
  try {
    const { id } = await params;

    await SoftDeleteRepository.softDelete('brand', id);

    return NextResponse.json({
      success: true
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete brand" }, { status: 500 });
  }
}