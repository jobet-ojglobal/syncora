// app/api/admin/inventory/ledger/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // 1. Extract search, filter, and pagination parameters
    const { searchParams } = new URL(request.url);

    const page = Math.max(0, parseInt(searchParams.get("page") || "0", 10));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "10", 10));
    const skip = page * limit;

    const search = searchParams.get("search")?.trim() || "";
    const productId = searchParams.get("productId")?.trim() || "";
    const locationId = searchParams.get("locationId")?.trim() || "";
    const transactionType = searchParams.get("transactionType")?.trim() || "";
    const referenceType = searchParams.get("referenceType")?.trim() || "";

    // 2. Build conditional `where` filtering block
    const whereConditions: Prisma.InventoryLedgerWhereInput[] = [];

    if (productId) {
      whereConditions.push({ productId });
    }

    if (locationId) {
      whereConditions.push({ locationId });
    }

    if (transactionType) {
      whereConditions.push({ transactionType: transactionType as any });
    }

    if (referenceType) {
      whereConditions.push({ referenceType: referenceType as any });
    }

    // Global search matching Product, Remarks, Batch, or Serial Numbers (via relation)
    if (search) {
      whereConditions.push({
        OR: [
          { product: { name: { contains: search, mode: "insensitive" } } },
          { product: { slug: { contains: search, mode: "insensitive" } } },
          { product: { sku: { contains: search, mode: "insensitive" } } },
          { remarks: { contains: search, mode: "insensitive" } },
          { batchNumber: { contains: search, mode: "insensitive" } },
          { inventoryBinItem: { serialNumber: { contains: search, mode: "insensitive" } } },
        ],
      });
    }

    const whereClause: Prisma.InventoryLedgerWhereInput =
      whereConditions.length > 0 ? { AND: whereConditions } : {};

    // 3. Execute concurrently: Fetch ledger entries and total count
    const [items, totalRecords] = await prisma.$transaction([
      prisma.inventoryLedger.findMany({
        where: whereClause,
        include: {
          product: {
            select: { name: true, slug: true, sku: true },
          },
          location: {
            select: { name: true },
          },
          sublocation: {
            select: { name: true },
          },
          performedBy: {
            select: { name: true, email: true },
          },
          inventoryBinItem: {
            select: { serialNumber: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: skip,
        take: limit,
      }),
      prisma.inventoryLedger.count({
        where: whereClause,
      }),
    ]);

    // 4. Map records into the flat response payload
    const mappedData = items.map((entry) => ({
      id: entry.id,
      productId: entry.productId,
      productName: entry.product?.name ?? "Unknown Product",
      productSlug: entry.product?.slug ?? "-",
      productSku: entry.product?.sku ?? "-",
      locationName: entry.location?.name ?? "Unknown Location",
      sublocationName: entry.sublocation?.name ?? null,
      transactionType: entry.transactionType,
      referenceType: entry.referenceType,
      referenceId: entry.referenceId,
      quantityChange: Number(entry.quantityChange || 0),
      quantityBefore: Number(entry.quantityBefore || 0),
      quantityAfter: Number(entry.quantityAfter || 0),
      unitCost: entry.unitCost ? Number(entry.unitCost) : null,
      totalCost: entry.totalCost ? Number(entry.totalCost) : null,
      batchNumber: entry.batchNumber || null,
      serialNumber: entry.inventoryBinItem?.serialNumber || null,
      uomName: entry.uomName || null,
      remarks: entry.remarks || null,
      performedByName: entry.performedBy
        ? entry.performedBy.name?.trim() || entry.performedBy.email
        : "System / Automated",
      createdAt: entry.createdAt.toISOString(),
    }));

    // 5. Package output inside standard DataTablePagination structure
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
    console.error("Error querying inventory ledger:", error);
    return NextResponse.json(
      { error: "Internal Database error processing ledger request." },
      { status: 500 }
    );
  }
}