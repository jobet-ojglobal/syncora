import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id) {
      return NextResponse.json(
        { error: "Missing required parameter: Business Partner ID" },
        { status: 400 }
      );
    }

    // Retrieve full entity structure map conforming to structural layout expectations
    const businessPartner = await prisma.businessPartner.findUnique({
      where: {
        id: id,
      },
      include: {
        addresses: {
          orderBy: {
            createdAt: "asc",
          },
        },
        customer: {
          include: {
            pricingScheme: true,
            taxingScheme: true,
            defaultPaymentTerms: true,
            dues: {
              include: {
                currency: true,
              },
            },
            balances: {
              include: {
                currency: true,
              },
            },
            credits: {
              include: {
                currency: true,
              },
            },
          },
        },
        vendor: {
          include: {
            currency: true,
            taxingScheme: true,
            defaultPaymentTerms: true,
            dues: {
              include: {
                currency: true,
              },
            },
            balances: {
              include: {
                currency: true,
              },
            },
            _count: {
              select: {
                products: true,
              },
            },
          },
        },
      },
    });

    if (!businessPartner || businessPartner.deletedAt !== null) {
      return NextResponse.json(
        { error: "Business Partner record not found or has been soft-deleted." },
        { status: 404 }
      );
    }

    return NextResponse.json(businessPartner, { status: 200 });
  } catch (error: any) {
    console.error("CRITICAL API EXECUTION ERROR [Business Partner Details]:", error);
    return NextResponse.json(
      {
        error: "Internal Ledger Server Error",
        details: error.message || "An error occurred while compiling database records.",
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}