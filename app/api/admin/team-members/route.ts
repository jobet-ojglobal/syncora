// app/api/admin/team-members/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, isActive, isInternal, canBeSalesRep, accessAllLocations, accessRights, locationInflowIds } = body;

    if (!name || !email) {
      return NextResponse.json({ error: "Missing core directory criteria properties parameters fields." }, { status: 400 });
    }

    const memberInflowId = crypto.randomUUID().toLowerCase();

    const memberRecord = await prisma.$transaction(async (tx) => {
      // 1. Establish core team identity baseline profile card
      const member = await tx.teamMember.create({
        data: { inflowId: memberInflowId, name, email, isActive, isInternal, canBeSalesRep, accessAllLocations }
      });

      // 2. Hydrate explicit access control junction keys rows
      if (accessRights && accessRights.length > 0) {
        await tx.teamMemberAccessRight.createMany({
          data: accessRights.map((right: any) => ({
            teamMemberId: member.id,
            rightName: right
          }))
        });
      }

      // 3. Hydrate localized inventory facility visibility parameters rows
      if (!accessAllLocations && locationInflowIds && locationInflowIds.length > 0) {
        await tx.teamMemberLocation.createMany({
          data: locationInflowIds.map((locId: string) => ({
            teamMemberId: member.id,
            locationInflowId: locId
          }))
        });
      }

      return member;
    });

    return NextResponse.json(memberRecord, { status: 201 });
  } catch (error: any) {
    console.error("Critical server error executing member provisioning pipeline:", error);
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Identity conflict error. Code token handle or email address is already active." }, { status: 409 });
    }
    return NextResponse.json({ error: "Transactional database storage sequence failure." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, email, isActive, isInternal, canBeSalesRep, accessAllLocations, accessRights, locationInflowIds } = body;

    if (!id) {
      return NextResponse.json({ error: "Target structural context validation missing identity token." }, { status: 400 });
    }

    const modifiedMember = await prisma.$transaction(async (tx) => {
      // Clean historic multi-relational junction mapping links tables entries cleanly
      await tx.teamMemberAccessRight.deleteMany({ where: { teamMemberId: id } });
      await tx.teamMemberLocation.deleteMany({ where: { teamMemberId: id } });

      // Update structural status and identification variables fields parameters
      const member = await tx.teamMember.update({
        where: { id },
        data: { name, email, isActive, isInternal, canBeSalesRep, accessAllLocations }
      });

      // Insert updated security access credentials flags loops blocks arrays
      if (accessRights && accessRights.length > 0) {
        await tx.teamMemberAccessRight.createMany({
          data: accessRights.map((right: any) => ({
            teamMemberId: id,
            rightName: right
          }))
        });
      }

      // Re-establish local facilities boundaries map rules parameters
      if (!accessAllLocations && locationInflowIds && locationInflowIds.length > 0) {
        await tx.teamMemberLocation.createMany({
          data: locationInflowIds.map((locId: string) => ({
            teamMemberId: id,
            locationInflowId: locId
          }))
        });
      }

      return member;
    });

    return NextResponse.json(modifiedMember, { status: 200 });
  } catch (error) {
    console.error("Directory account modification sequence aborted:", error);
    return NextResponse.json({ error: "Internal service transactional write execution breakdown." }, { status: 500 });
  }
}