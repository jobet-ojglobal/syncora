// app/api/admin/transfers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // 1. Extract 0-indexed pagination & query parameters
    const page = Math.max(0, parseInt(searchParams.get("page") || "0", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "10", 10)));
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status") || "ALL";
    const sourceLocationId = searchParams.get("sourceLocationId") || "ALL";
    const targetLocationId = searchParams.get("targetLocationId") || "ALL";

    // 2. Build dynamic Prisma WHERE conditions
    const where: Prisma.TransferOrderWhereInput = {};

    // Filter by Transfer Status
    if (status !== "ALL") {
    //   where.status = status;
    }

    // Filter by Source Location
    if (sourceLocationId !== "ALL") {
      where.sourceLocationId = sourceLocationId;
    }

    // Filter by Target Location
    if (targetLocationId !== "ALL") {
      where.targetLocationId = targetLocationId;
    }

    // Filter by Search Query (Transfer #, Remarks, Location Names, or Line Items)
    if (search) {
      where.OR = [
        { transferNumber: { contains: search, mode: "insensitive" } },
        { remarks: { contains: search, mode: "insensitive" } },
        { sourceLocation: { name: { contains: search, mode: "insensitive" } } },
        { targetLocation: { name: { contains: search, mode: "insensitive" } } },
        {
          lines: {
            some: {
              product: {
                OR: [
                  { name: { contains: search, mode: "insensitive" } },
                  { sku: { contains: search, mode: "insensitive" } },
                ],
              },
            },
          },
        },
      ];
    }

    // 3. Execute count and query concurrently
    const [totalRecords, orders] = await Promise.all([
      prisma.transferOrder.count({ where }),
      prisma.transferOrder.findMany({
        where,
        skip: page * limit,
        take: limit,
        include: {
          sourceLocation: { select: { name: true } },
          targetLocation: { select: { name: true } },
          // Uncomment if user relations exist in schema:
          // requestedBy: { select: { name: true } },
          // approvedBy: { select: { name: true } },
          // receivedBy: { select: { name: true } },
          lines: {
            include: {
              product: { select: { name: true, sku: true } },
              sourceSublocation: { select: { name: true } },
              targetSublocation: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // 4. Transform data into typed payload shape
    const parsedOrders = orders.map((order) => ({
      id: order.id,
      transferNumber: order.transferNumber,
      sourceLocationId: order.sourceLocationId,
      sourceLocationName: order.sourceLocation?.name ?? "N/A",
      targetLocationId: order.targetLocationId,
      targetLocationName: order.targetLocation?.name ?? "N/A",
      status: order.status,
      remarks: order.remarks ?? null,
      createdAt: order.createdAt.toISOString(),
      transferredAt: order.transferredAt ? order.transferredAt.toISOString() : null,
      receivedAt: order.receivedAt ? order.receivedAt.toISOString() : null,
      createdByName: (order as Record<string, any>).requestedBy?.name ?? null,
      approvedByName: (order as Record<string, any>).approvedBy?.name ?? null,
      receivedByName: (order as Record<string, any>).receivedBy?.name ?? null,
      lines: order.lines.map((l) => ({
        id: l.id,
        productId: l.productId,
        productName: l.product?.name ?? "Unknown Product",
        productSku: l.product?.sku ?? "N/A",
        quantity: Number(l.quantity),
        quantityReceived:
          l.quantityReceived !== null && l.quantityReceived !== undefined
            ? Number(l.quantityReceived)
            : null,
        discrepancyQuantity:
          l.discrepancyQuantity !== null && l.discrepancyQuantity !== undefined
            ? Number(l.discrepancyQuantity)
            : null,
        discrepancyReason: l.discrepancyReason ?? null,
        sourceSublocationId: l.sourceSublocationId ?? null,
        sourceSublocationName: l.sourceSublocation?.name ?? null,
        targetSublocationId: l.targetSublocationId ?? null,
        targetSublocationName: l.targetSublocation?.name ?? null,
      })),
    }));

    // 5. Return paginated response structure
    return NextResponse.json(
      {
        data: parsedOrders,
        totalRecords,
        pageCount: Math.ceil(totalRecords / limit) || 1,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Master transfer orders query failure:", error);
    return NextResponse.json(
      { error: "Internal Database query transaction processing error." },
      { status: 500 }
    );
  }
}