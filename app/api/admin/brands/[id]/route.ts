import { prisma } from "@/lib/prisma";
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
          productGroup: {
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
      return NextResponse.json(
        {
          message:
            "Brand not found",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json(
      brand
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        message:
          "Failed to fetch brand",
      },
      {
        status: 500,
      }
    );
  }
}

// ======================================================
// UPDATE BRAND
// ======================================================

export async function PATCH(
  request: NextRequest,
  { params }: Props
) {
  try {
    const { id } = await params;

    const body = await request.json();

    const brand =
      await prisma.brand.update({
        where: {
          id,
        },

        data: {
          name: body.name,
          description:
            body.description,
          logoUrl: body.logoUrl,
          websiteUrl:
            body.websiteUrl,
        },
      });

    return NextResponse.json(
      brand
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        message:
          "Failed to update brand",
      },
      {
        status: 500,
      }
    );
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

    await prisma.brand.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        message:
          "Failed to delete brand",
      },
      {
        status: 500,
      }
    );
  }
}