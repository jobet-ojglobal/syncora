// app/api/admin/products/filter/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse extraction variables with default values
    const search = searchParams.get("search")?.trim() || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "25", 10));
    const sortBy = searchParams.get("sortBy") || "updatedAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

    const skip = (page - 1) * limit;

    // 1. Construct dynamic filtering clauses matching your search needs
    const whereClause: Prisma.ProductWhereInput = {
      deletedAt: null,
    };

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
        { brand: { name: { contains: search, mode: "insensitive" } } },
        { category: { name: { contains: search, mode: "insensitive" } } },
        { variant: { group: { name: { contains: search, mode: "insensitive" } } } },
        { barcodes: { some: { barcode: { contains: search, mode: "insensitive" } } } },
      ];
    }

    // 2. Construct sorting strategies safely 
    let orderByClause: Prisma.ProductOrderByWithRelationInput = { [sortBy]: sortOrder };

    // Handle relational sorting rules elegantly if needed
    if (sortBy === "brandName") {
      orderByClause = { brand: { name: sortOrder } };
    } else if (sortBy === "categoryName") {
      orderByClause = { category: { name: sortOrder } };
    }

    // 3. Run parallel database execution transactions to save performance cycle costs
    const [catalogItems, totalRecords] = await prisma.$transaction([
      prisma.product.findMany({
        where: whereClause,
        include: {
          brand: { select: { name: true } },
          category: { select: { name: true } },
          variant: {
            include: {
              group: { select: { name: true } }
            }
          },
          purchasingUom: {
            include: {
              uom: { select: { name: true, code: true } }
            }
          },
          salesUom: {
            include: {
              uom: { select: { name: true, code: true } }
            }
          },
          barcodes: { select: { barcode: true } },
          images: {
            orderBy: { position: "asc" },
            take: 1,
            select: { thumbUrl: true, originalUrl: true }
          }
        },
        orderBy: orderByClause,
        skip,
        take: limit,
      }),
      prisma.product.count({ where: whereClause }),
    ]);

    // 4. Map records into the clean interface types
    const parsedProducts = catalogItems.map((prod) => {
      const purchasingCode = prod.purchasingUom?.uom?.code || prod.purchasingUom?.uom?.name;
      const salesCode = prod.salesUom?.uom?.code || prod.salesUom?.uom?.name;

      return {
        id: prod.id,
        inflowId: prod.inflowId,
        sku: prod.sku || "N/A",
        name: prod.name,
        groupName: prod.variant?.group?.name || null,
        slug: prod.slug,
        itemType: prod.itemType || "Stock",
        isActive: prod.isActive,
        trackExpiry: prod.trackExpiry,
        trackLots: prod.trackLots,
        trackSerials: prod.trackSerials,
        brandName: prod.brand?.name || "Generic / White-label",
        categoryName: prod.category?.name || "Unassigned Dept",
        thumbnail: prod.images[0]?.thumbUrl || prod.images[0]?.originalUrl || null,
        barcodesCount: prod.barcodes.length,
        primaryBarcode: prod.barcodes[0]?.barcode || null,
        purchasingUomText: prod.purchasingUom && purchasingCode
          ? `${purchasingCode} (${Number(prod.purchasingUom.standardQuantity)}:${Number(prod.purchasingUom.uomQuantity)})`
          : "Not Set",
        salesUomText: prod.salesUom && salesCode
          ? `${salesCode} (${Number(prod.salesUom.standardQuantity)}:${Number(prod.salesUom.uomQuantity)})`
          : "Not Set",
        createdAt: prod.createdAt
      };
    });

    return NextResponse.json({
      products: parsedProducts,
      meta: {
        total: totalRecords,
        page,
        limit,
        totalPages: Math.ceil(totalRecords / limit),
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error("Master product catalog pipeline failure:", error);
    return NextResponse.json(
      { error: "Internal product database query execution failure.", details: error.message }, 
      { status: 500 }
    );
  }
}