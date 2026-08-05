// app/api/admin/pricing-schemes/list/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // 1. Extract search and pagination parameters from the URL
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const page = parseInt(searchParams.get("page") || "0", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    const skip = page * limit;

    // 2. Build conditional where filtering block matching non-deleted indices
    const whereClause: any = {
      deletedAt: null,
    };

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    // 3. Execute concurrently: Fetch both filtered subset rows and grand aggregate total counter metrics
    const [schemes, totalRecords] = await prisma.$transaction([
      prisma.teamMember.findMany({
        where: whereClause,
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
        orderBy: { name: "asc" },
        skip: skip,
        take: limit,
      }),
      prisma.teamMember.count({
        where: whereClause,
      }),
    ]);

    // 4. Map records into the matching flat payload properties structural model
    const mappedData = schemes.map((m) => ({
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

    // 5. Package output properties inside wrapping matrix constraints required by DataTablePagination
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
    console.error("Critical failure pulling master team member layout catalog directory list:", error);
    return NextResponse.json(
      { error: "Database internal core engine exception processing matrix definitions arrays." },
      { status: 500 }
    );
  }
}