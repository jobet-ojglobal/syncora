// app/api/admin/team-members/list/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const members = await prisma.teamMember.findMany({
      where: { deletedAt: null },
      include: {
        accessRights: { select: { rightName: true } },
        locations: { 
          select: { 
            location: { select: { 
                address: {
                    select: { postalCode: true }
                }, 
                name: true } } 
          } 
        },
        _count: {
          select: {
            assignedOrders: true,
            salesRepOrders: true,
            poAssignedOrders: true,
          }
        }
      },
      orderBy: { name: "asc" }
    });

    const formattedDirectory = members.map(m => ({
      id: m.id,
      inflowId: m.inflowId,
      name: m.name,
      email: m.email,
      isActive: m.isActive,
      canBeSalesRep: m.canBeSalesRep,
      accessAllLocations: m.accessAllLocations,
      totalAssignedTasks: m._count.assignedOrders + m._count.salesRepOrders + m._count.poAssignedOrders,
      rightsList: m.accessRights.map(r => r.rightName),
      assignedLocations: m.locations.map(l => ({
        code: l.location.address?.postalCode,
        name: l.location.name
      }))
    }));

    return NextResponse.json(formattedDirectory, { status: 200 });
  } catch (error) {
    console.error("Critical error parsing enterprise user profiles indices:", error);
    return NextResponse.json(
      { error: "Internal Database execution crash building personnel rosters lists." },
      { status: 500 }
    );
  }
}