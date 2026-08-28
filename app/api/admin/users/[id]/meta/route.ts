import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/generated/prisma/enums";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const userId = resolvedParams.id;
    const body = await request.json();

    const { role, teamMemberId, inflowCustomerId } = body;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        role: role as UserRole,
        teamMemberId: teamMemberId || null,
        inflowCustomerId: inflowCustomerId || null,
      },
    });

    return NextResponse.json(updatedUser, { status: 200 });
  } catch (error: any) {
    console.error("Failed setting user meta properties:", error);
    return NextResponse.json(
      { error: error.message || "Failed updating user metadata profile." },
      { status: 500 }
    );
  }
}