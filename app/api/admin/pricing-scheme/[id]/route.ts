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
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Missing mandatory corporate structure mapping primary index identification tracking string token parameter." }, { status: 400 });
    }

    const pricingScheme = await prisma.pricingScheme.findUnique({
      where: { id }
    });

    if(!pricingScheme) {
      return NextResponse.json({ error: "Pricing scheme not found" }, { status: 404 });
    }

    // 🛡️ Preflight database constraints checklist loop check: verify no customer records use this scheme
    const liveBoundCustomersCount = await prisma.customer.count({ where: { pricingSchemeId: pricingScheme.inflowId } });

    if (liveBoundCustomersCount > 0) {
      return NextResponse.json(
        { error: "Relational lockout error rule trigger. Target pricing matrix card is actively driving live accounting billing profiles portfolios lines." },
        { status: 422 }
      );
    }

    // Wrap execution fields mutations parameters variations inside clean atomic sequence database transactional block
    await prisma.$transaction(async (tx) => {
      // 1. Flush any specific matrix individual product price lists points records matching this parent tracker
      await tx.productPrice.deleteMany({
        where: { pricingSchemeId: pricingScheme.inflowId }
      });

      // 2. Clear out the main pricing strategy row item by assigning a soft-delete timestamp
      await tx.pricingScheme.update({
        where: { inflowId: pricingScheme.inflowId },
        data: {
          deletedAt: new Date(),
          isActive: false,
          isDefault: false // Clear default status to prevent baseline systemic collision gaps faults
        }
      });
    });

    return NextResponse.json({ success: true, archivedPricingSchemeInflowId: pricingScheme.inflowId }, { status: 200 });
  } catch (error) {
    console.error("Pricing scheme soft-delete database transformation crashed:", error);
    return NextResponse.json({ error: "Internal Database transaction execution engine aborted task operation pipeline." }, { status: 500 });
  }
}