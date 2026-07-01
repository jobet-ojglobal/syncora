// api/members/lookup/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const members = await prisma.teamMember.findMany({
      select: {
        inflowId: true,
        name: true,
      },
      orderBy: { name: "asc" },
    });

    const transformedMembers = members.map(l => ({
      id: l.inflowId,
      name: l.name,
    }));

    return NextResponse.json(transformedMembers, { status: 200 });
  } catch (error) {
    console.error("Error fetching members:", error);
    return NextResponse.json(
      { error: "Internal Server Error occurred while fetching global members" },
      { status: 500 }
    );
  }
}