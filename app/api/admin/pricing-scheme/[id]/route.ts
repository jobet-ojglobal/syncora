import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

interface Props {
  params: Promise<{
    id: string;
  }>;
}

export async function DELETE(
  request: NextRequest,
  { params }: Props
) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const body = await request.json();
    const { isSoftDelete } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Pricing scheme ID is required." },
        { status: 400 }
      );
    }

    const pricingScheme = await prisma.pricingScheme.findUnique({
      where: { id },
    });

    if (!pricingScheme) {
      return NextResponse.json(
        { error: "Pricing scheme not found." },
        { status: 404 }
      );
    }

    // Verify no customer records are actively using this pricing scheme
    const liveBoundCustomersCount = await prisma.customer.count({
      where: { pricingSchemeId: pricingScheme.inflowId },
    });

    if (liveBoundCustomersCount > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete pricing scheme because active customers are currently using it.",
        },
        { status: 422 }
      );
    }

    // Execute deletion inside an atomic transaction
    await prisma.$transaction(async (tx) => {
      // 1. Delete associated product prices for both soft and hard delete
      await tx.productPrice.deleteMany({
        where: { pricingSchemeId: pricingScheme.inflowId },
      });

      if (isSoftDelete === "true") {
        // 2a. Soft Delete: Mark record as inactive and update deletedAt timestamp
        await tx.pricingScheme.update({
          where: { inflowId: pricingScheme.inflowId },
          data: {
            deletedAt: new Date(),
            isActive: false,
            isDefault: false,
          },
        });
      } else {
        // 2b. Hard Delete: Completely purge the record from the database
        await tx.pricingScheme.delete({
          where: { inflowId: pricingScheme.inflowId },
        });
      }
    });

    return NextResponse.json(
      {
        success: true,
        isSoftDelete,
        deletedPricingSchemeInflowId: pricingScheme.inflowId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Pricing scheme delete operation failed:", error);
    return NextResponse.json(
      { error: "Internal server error during pricing scheme deletion." },
      { status: 500 }
    );
  }
}