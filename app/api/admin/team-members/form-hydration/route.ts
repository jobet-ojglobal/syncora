// app/api/admin/team-members/form-hydration/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("id"); // Fed explicitly when modifying existing profiles

    // 1. Fetch all operational warehouse facilities for space tracking selection blocks
    const facilitiesList = await prisma.location.findMany({
      where: { deletedAt: null },
      select: {
        inflowId: true,
        name: true,
        address: {
          select: {
            postalCode: true
          }
        }
      },
      orderBy: { createdAt: "asc" }
    });

    let initialProfileValues = null;

    // 2. If an ID tracking query parameter is loaded, map structural permissions branches
    if (memberId) {
      const profile = await prisma.teamMember.findUnique({
        where: { id: memberId },
        include: {
          accessRights: { select: { rightName: true } },
          locations: { select: { locationInflowId: true } }
        }
      });

      if (!profile || profile.deletedAt) {
        return NextResponse.json({ error: "Target team member directory card profile could not be located." }, { status: 404 });
      }

      initialProfileValues = {
        id: profile.id,
        inflowId: profile.inflowId,
        name: profile.name,
        email: profile.email,
        isActive: profile.isActive,
        isInternal: profile.isInternal,
        canBeSalesRep: profile.canBeSalesRep,
        accessAllLocations: profile.accessAllLocations,
        // Remap direct rows back into string token arrays matching React Hook Form state
        accessRights: profile.accessRights.map(r => r.rightName),
        locationInflowIds: profile.locations.map(l => l.locationInflowId)
      };
    }

    return NextResponse.json({
      locationLookup: facilitiesList,
      initialData: initialProfileValues
    }, { status: 200 });

  } catch (error) {
    console.error("Directory component hydration transaction processing crashed:", error);
    return NextResponse.json({ error: "Internal transactional pipeline error parsing user metadata structures." }, { status: 500 });
  }
}