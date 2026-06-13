// app/api/brands/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ======================================================
// GET ALL BRANDS
// ======================================================

export async function GET() {
  try {
    const brands = await prisma.brand.findMany({
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },

      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(brands);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        message:
          "Failed to fetch brands",
      },
      {
        status: 500,
      }
    );
  }
}

// ======================================================
// CREATE BRAND
// ======================================================

export async function POST(
  request: NextRequest
) {
  try {
    const body = await request.json();

    const brand =
      await prisma.brand.create({
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
      brand,
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        message:
          "Failed to create brand",
      },
      {
        status: 500,
      }
    );
  }
}