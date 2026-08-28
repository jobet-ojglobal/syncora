import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const roleParam = searchParams.get("role")?.trim() || "";
    const page = parseInt(searchParams.get("page") || "0", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    const skip = page * limit;

    // Build soft-delete and search filter clause
    const whereClause: any = {
      deletedAt: null,
    };

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { id: { contains: search, mode: "insensitive" } },
      ];
    }

    if (roleParam && Object.values(UserRole).includes(roleParam as UserRole)) {
      whereClause.role = roleParam as UserRole;
    }

    // Execute query and total count concurrently
    const [users, totalRecords] = await prisma.$transaction([
      prisma.user.findMany({
        where: whereClause,
        include: {
          teamMember: {
            select: {
              id: true,
              name: true,
            },
          },
          inflowCustomer: {
            select: {
              id: true,
              businessPartner: { select: { name: true } }
            },
          },
          _count: {
            select: {
              sessions: true,
              accounts: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.user.count({
        where: whereClause,
      }),
    ]);

    // Map DB entities into flat DTOs for client table consumption
    const mappedData = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      emailVerified: u.emailVerified,
      image: u.image,
      role: u.role,
      teamMemberId: u.teamMemberId,
      teamMemberName: u.teamMember?.name || null,
      inflowCustomerId: u.inflowCustomerId,
      customerName: u.inflowCustomer?.businessPartner.name || null,
      activeSessionsCount: u._count.sessions,
      linkedAccountsCount: u._count.accounts,
      createdAt: u.createdAt,
    }));

    const pageCount = Math.ceil(totalRecords / limit);

    return NextResponse.json(
      {
        data: mappedData,
        totalRecords,
        pageCount,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Critical failure fetching filtered user directory:", error);
    return NextResponse.json(
      { error: "Internal server error fetching user records matrix." },
      { status: 500 }
    );
  }
}