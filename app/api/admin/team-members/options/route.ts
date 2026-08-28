// api/team-members/lookup/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const members = await prisma.teamMember.findMany({
      where: { deletedAt: null, isActive: true, isInternal: false },
      select: {
        id: true,
        inflowId: true,
        name: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(members, { status: 200 });
  } catch (error) {
    console.error("Error fetching team members:", error);
    return NextResponse.json(
      { error: "Internal Server Error occurred while fetching global team members" },
      { status: 500 }
    );
  }
}