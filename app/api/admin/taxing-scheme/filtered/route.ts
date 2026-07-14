// app/api/admin/taxing-schemes/filtered/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // 1. Extract and parse search parameters from the request URL
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const page = Math.max(0, parseInt(searchParams.get("page") || "0", 10));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "10", 10));

    // Calculate skip offset for database windowing
    const skip = page * limit;

    // 2. Build conditional Prisma dynamic where filter clauses
    const whereConditions: Prisma.TaxingSchemeWhereInput = {
      deletedAt: null,
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { inflowId: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    // 3. Concurrently pull total matching record scale alongside data window payload
    const [totalRecords, schemes] = await prisma.$transaction([
      prisma.taxingScheme.count({ where: whereConditions }),
      prisma.taxingScheme.findMany({
        where: whereConditions,
        skip,
        take: limit,
        include: {
          taxCodes: {
            where: { deletedAt: null },
            select: {
              inflowId: true,
              name: true,
              tax1Rate: true,
              tax2Rate: true,
              isActive: true,
            },
            orderBy: { name: "asc" },
          },
          _count: {
            select: {
              customers: true,
              vendors: true,
              productTaxCodes: true,
            },
          },
        },
        orderBy: { name: "asc" },
      }),
    ]);

    // 4. Map records structure to match application client requirements
    const formattedSchemes = schemes.map((s) => ({
      id: s.id,
      inflowId: s.inflowId,
      name: s.name,
      isActive: s.isActive,
      isDefault: s.isDefault,
      calculateTax2OnTax1: s.calculateTax2OnTax1,
      tax1Name: s.tax1Name || "Tax 1",
      tax1OnShipping: s.tax1OnShipping,
      tax2Name: s.tax2Name,
      tax2OnShipping: s.tax2OnShipping,
      defaultTaxCodeId: s.defaultTaxCodeId,
      dependencyCount: s._count.customers + s._count.vendors + s._count.productTaxCodes,
      taxCodes: s.taxCodes.map((tc) => ({
        inflowId: tc.inflowId,
        name: tc.name,
        isActive: tc.isActive,
        tax1Rate: Number(tc.tax1Rate || 0),
        tax2Rate: Number(tc.tax2Rate || 0),
      })),
    }));

    // Calculate structural meta pages boundaries 
    const pageCount = Math.ceil(totalRecords / limit);

    // 5. Structure payload format seamlessly match client page layouts
    return NextResponse.json({
      data: formattedSchemes,
      totalRecords,
      pageCount,
    }, { status: 200 });

  } catch (error) {
    console.error("Critical failure compiling taxing schemes list matrix:", error);
    return NextResponse.json(
      { error: "Database internal engine crash pulling fiscal records." },
      { status: 500 }
    );
  }
}