// api/customers/lookup/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const rawMembers = await prisma.customer.findMany({
      where: { deletedAt: null, businessPartner: { isActive: true } },
      select: {
        id: true,
        inflowId: true,
        businessPartner: { select: { name: true } },
      },
      orderBy: { businessPartner: { name: "asc" } },
    });

    const members = rawMembers.map(item => ({
        id: item.id,
        inflowId: item.inflowId,
        name: item.businessPartner.name
    }))

    return NextResponse.json(members, { status: 200 });
  } catch (error) {
    console.error("Error fetching team members:", error);
    return NextResponse.json(
      { error: "Internal Server Error occurred while fetching global team members" },
      { status: 500 }
    );
  }
}