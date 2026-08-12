// app/api/admin/locations/filtered/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LocationStatus, Prisma } from "@/generated/prisma/client";

export type LocationType = "WAREHOUSE" | "STORE" | "FULFILLMENT_CENTER" | "TRANSIT";

export interface SublocationSummary {
  id: string;
  name: string;
  binCount: number;
}

export interface LocationRow {
  id: string;
  inflowId: string;
  name: string;
  type: LocationType;
  status: LocationStatus;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state?: string | null;
  postalCode?: string | null;
  country: string;
  phone?: string | null;
  email?: string | null;
  managerName?: string | null;
  totalStockUnits: number;
  sublocationCount: number;
  teams: number;
  activeOrdersCount: number;
  sublocations: SublocationSummary[];
  createdAt: string;
  updatedAt: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // 1. Extract and sanitize parameters
    const page = Math.max(0, parseInt(searchParams.get("page") || "0", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "10", 10)));
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status") || "ALL";
    const type = searchParams.get("type") || "ALL";

    // 2. Construct modular AND filter conditions
    const conditions: Prisma.LocationWhereInput[] = [
      { deletedAt: null }, // Exclude soft-deleted records
    ];

    // Filter by Active/Inactive status or enum
    if (status !== "ALL") {
      if (status === "ACTIVE") {
        conditions.push({ isActive: true });
      } else if (status === "INACTIVE") {
        conditions.push({ isActive: false });
      } else if (Object.values(LocationStatus).includes(status as LocationStatus)) {
        conditions.push({ status: status as LocationStatus });
      }
    }

    // Filter nested address parameters
    const addressWhere: Prisma.LocationAddressWhereInput = {};
    if (type !== "ALL") addressWhere.addressType = { equals: type, mode: "insensitive" };

    if (Object.keys(addressWhere).length > 0) {
      conditions.push({ address: addressWhere });
    }

    // Full-text search across location fields, address, and sublocations
    if (search) {
      conditions.push({
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { inflowId: { contains: search, mode: "insensitive" } },
          {
            address: {
              OR: [
                { address1: { contains: search, mode: "insensitive" } },
                { address2: { contains: search, mode: "insensitive" } },
                { city: { contains: search, mode: "insensitive" } },
                { state: { contains: search, mode: "insensitive" } },
                { country: { contains: search, mode: "insensitive" } },
                { postalCode: { contains: search, mode: "insensitive" } },
              ],
            },
          },
          {
            sublocations: {
              some: {
                name: { contains: search, mode: "insensitive" },
              },
            },
          },
        ],
      });
    }

    const where: Prisma.LocationWhereInput = { AND: conditions };

    // 3. Concurrent count and query execution
    const [totalRecords, locations] = await Promise.all([
      prisma.location.count({ where }),
      prisma.location.findMany({
        where,
        skip: page * limit,
        take: limit,
        include: {
          address: true,
          inventories: {
            select: {
              quantityOnHand: true,
            },
          },
          sublocations: {
            select: {
              id: true,
              name: true,
              _count: {
                select: {
                  inventoryBins: true,
                },
              },
            },
          },
          _count: {
            select: {
              salesOrders: true,
              purchaseOrders: true,
              sublocations: true,
              teamLocations: true,
            },
          },
        },
        orderBy: { name: "asc" },
      }),
    ]);

    // 4. Map query results strictly to LocationRow interface
    const parsedLocations: LocationRow[] = locations.map((loc) => {
      const totalStockUnits = loc.inventories.reduce(
        (sum, inv) => sum + (Number(inv.quantityOnHand) || 0),
        0
      );

      const derivedType: LocationType =
        (loc.address?.addressType?.toUpperCase() as LocationType) || "WAREHOUSE";

      return {
        id: loc.id,
        inflowId: loc.inflowId,
        name: loc.name,
        type: derivedType,
        status: loc.status,
        addressLine1: loc.address?.address1 ?? "N/A",
        addressLine2: loc.address?.address2 ?? null,
        city: loc.address?.city ?? "N/A",
        state: loc.address?.state ?? null,
        postalCode: loc.address?.postalCode ?? null,
        country: loc.address?.country ?? "N/A",
        phone: null,
        email: null,
        managerName: null,
        totalStockUnits,
        sublocationCount: loc._count.sublocations,
        teams: loc._count.teamLocations,
        activeOrdersCount: (loc._count?.salesOrders ?? 0) + (loc._count?.purchaseOrders ?? 0),
        sublocations: loc.sublocations.map((sub) => ({
          id: sub.id,
          name: sub.name,
          binCount: sub._count.inventoryBins,
        })),
        createdAt: loc.createdAt.toISOString(),
        updatedAt: loc.updatedAt.toISOString(),
      };
    });

    return NextResponse.json(
      {
        data: parsedLocations,
        totalRecords,
        pageCount: Math.ceil(totalRecords / limit) || 1,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Master location query error:", error);
    return NextResponse.json(
      { error: "Failed to fetch locations from database." },
      { status: 500 }
    );
  }
}