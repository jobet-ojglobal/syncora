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
      return NextResponse.json({ error: "Missing required targeted account configuration record identity token reference identifier." }, { status: 400 });
    }

    const teamMember = await prisma.teamMember.findUnique({
      where: { id }
    });

    if(!teamMember) {
      return NextResponse.json({ error: "Team Member not found" }, { status: 404 });
    }

    // 🛡️ Preflight relationship locks safety testing checks before running changes
    const openOrders = await prisma.salesOrder.count({ where: { assignedToTeamMemberId: teamMember.inflowId } });
    const managedSales = await prisma.salesOrder.count({ where: { salesRepTeamMemberId: teamMember.inflowId } });
    const procurementLines = await prisma.purchaseOrder.count({ where: { assignedToTeamMemberId: teamMember.inflowId } });

    if (openOrders > 0 || managedSales > 0 || procurementLines > 0) {
      return NextResponse.json(
        { error: "Relational integrity lock active. Operative is linked to ongoing sales streams or purchase ledger files blocks fields accounts." },
        { status: 422 }
      );
    }

    // Execute atomic profile cascade cutoff logic actions cleanly
    await prisma.$transaction(async (tx) => {
      // 1. Wipe active live security clearances permissions blocks to halt ongoing authorizations
      await tx.teamMemberAccessRight.deleteMany({ where: { teamMemberId: teamMember.inflowId } });
      
      // 2. Wipe active localized warehouse spatial mapping footprints links
      await tx.teamMemberLocation.deleteMany({ where: { teamMemberId: teamMember.inflowId } });

      // 3. Flag parent directory profile object with soft-delete timestamp flags markers
      await tx.teamMember.update({
        where: { id },
        data: { 
          isActive: false,
          deletedAt: new Date()
        }
      });
    });

    return NextResponse.json({ success: true, archivedOperativeId: id }, { status: 200 });
  } catch (error) {
    console.error("Directory personnel file soft-drop workflow execution crashed:", error);
    return NextResponse.json({ error: "Internal enterprise server database write mutation error." }, { status: 500 });
  }
}