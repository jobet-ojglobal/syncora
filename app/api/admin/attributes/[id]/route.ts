import { prisma } from "@/lib/prisma";
import { SoftDeleteRepository } from "@/lib/softDeleteRepository";
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
      return NextResponse.json({ error: "Missing required master attribute tracking ID pointer." }, { status: 400 });
    }

    // 🛑 OPTIONAL RELATION CHECKER:
    // If you have active product inventory combinations linked using these options blocks,
    // intercept the transaction here to warn the user before breaking existing catalog configurations.
    const activeUsageCheck = await prisma.productGroupOption.findFirst({
      where: { attributeId: id }
    });

    if (activeUsageCheck) {
      return NextResponse.json({
        error: "Cannot remove this attribute. It is actively linked to variants inside your live store products catalog groupings."
      }, { status: 422 });
    }

    // Perform atomic transaction drop
    // await prisma.$transaction(async (tx) => {
    //   // 1. Wipe out any cascading child option values records
    //   await tx.attributeValue.deleteMany({
    //     where: { attributeId: inflowId }
    //   });

    //   // 2. Drop the master global attribute classification row
    //   await tx.attribute.delete({
    //     where: { id: inflowId }
    //   });
    // });

    await SoftDeleteRepository.softDelete('attribute', id);

    return NextResponse.json({ success: true, removedAttributeId: id }, { status: 200 });
  } catch (error) {
    console.error("Critical failure dropping catalog configuration elements:", error);
    return NextResponse.json({ error: "Internal Database execution delete error occurred." }, { status: 500 });
  }
}